import { readFileSync } from 'node:fs'
import { Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { DatabaseSync } from 'node:sqlite'
import {
  countAdmins,
  createUser,
  deleteUser,
  destroyUserSessions,
  findUserById,
  findUserByUsername,
  listUsers,
  promoteConfiguredAdmin,
  toPublicUser,
  updateUser,
  type PublicUser,
  type UserRole,
} from './db.ts'
import {
  hashPassword,
  normalizeUsername,
  validatePassword,
  validateUsername,
  verifyPassword,
} from './password.ts'
import {
  createInventoryItem,
  listInventoryItems,
} from './inventory.ts'
import {
  addFamilyMember,
  createFamily,
  deleteFamily,
  getUserProfile,
  listFamilies,
  MAX_NICKNAME_LENGTH,
  removeFamilyMember,
  upsertUserProfile,
} from './profile.ts'
import {
  createSession,
  destroySession,
  readSessionUser,
  SESSION_COOKIE,
  sessionCookieOptions,
} from './session.ts'
import {
  contentTypeForImagePath,
  resolveProductByBarcode,
  resolveProductImagePath,
  resolveUploadsDir,
} from './products.ts'

export type AppEnv = {
  Variables: {
    db: DatabaseSync
    secureCookies: boolean
    uploadsDir: string
    user: PublicUser | null
  }
}

type ErrorBody = {
  error: {
    code: string
    message: string
    field?: 'username' | 'password' | 'confirmPassword' | 'role'
  }
}

function errorBody(
  code: string,
  message: string,
  field?: ErrorBody['error']['field'],
): ErrorBody {
  return { error: { code, message, field } }
}

function parseRole(value: unknown): UserRole | null {
  if (value === 'admin' || value === 'user') return value
  return null
}

export function createApp(
  db: DatabaseSync,
  options?: { secureCookies?: boolean; uploadsDir?: string },
) {
  const app = new Hono<AppEnv>()
  const secureCookies = options?.secureCookies ?? false
  const uploadsDir = options?.uploadsDir ?? resolveUploadsDir()

  app.use('*', async (c, next) => {
    c.set('db', db)
    c.set('secureCookies', secureCookies)
    c.set('uploadsDir', uploadsDir)
    c.set('user', readSessionUser(db, getCookie(c, SESSION_COOKIE)))
    await next()
  })

  app.get('/api/health', (c) => c.json({ ok: true }))

  app.get('/api/auth/me', (c) => {
    const user = c.get('user')
    if (!user) {
      return c.json(errorBody('UNAUTHENTICATED', '未登录'), 401)
    }
    return c.json({ user })
  })

  app.post('/api/auth/register', async (c) => {
    let body: { username?: unknown; password?: unknown }
    try {
      body = await c.req.json()
    } catch {
      return c.json(errorBody('INVALID_JSON', '请求格式无效'), 400)
    }

    const username =
      typeof body.username === 'string' ? normalizeUsername(body.username) : ''
    const password = typeof body.password === 'string' ? body.password : ''

    const usernameError = validateUsername(username)
    if (usernameError) {
      return c.json(errorBody('INVALID_USERNAME', usernameError, 'username'), 400)
    }
    const passwordError = validatePassword(password)
    if (passwordError) {
      return c.json(errorBody('INVALID_PASSWORD', passwordError, 'password'), 400)
    }

    if (findUserByUsername(c.get('db'), username)) {
      return c.json(
        errorBody('USERNAME_TAKEN', '该账号已被注册', 'username'),
        409,
      )
    }

    const passwordHash = await hashPassword(password)
    let user: PublicUser
    try {
      user = toPublicUser(createUser(c.get('db'), username, passwordHash))
    } catch {
      return c.json(
        errorBody('USERNAME_TAKEN', '该账号已被注册', 'username'),
        409,
      )
    }

    promoteConfiguredAdmin(c.get('db'))
    const refreshed = findUserById(c.get('db'), user.id)
    if (refreshed) user = toPublicUser(refreshed)

    const token = createSession(c.get('db'), user.id)
    setCookie(c, SESSION_COOKIE, token, sessionCookieOptions(c.get('secureCookies')))
    return c.json({ user }, 201)
  })

  app.post('/api/auth/login', async (c) => {
    let body: { username?: unknown; password?: unknown }
    try {
      body = await c.req.json()
    } catch {
      return c.json(errorBody('INVALID_JSON', '请求格式无效'), 400)
    }

    const username =
      typeof body.username === 'string' ? normalizeUsername(body.username) : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!username) {
      return c.json(errorBody('INVALID_USERNAME', '请输入账号', 'username'), 400)
    }
    if (!password) {
      return c.json(errorBody('INVALID_PASSWORD', '请输入密码', 'password'), 400)
    }

    const row = findUserByUsername(c.get('db'), username)
    if (!row || !(await verifyPassword(password, row.password_hash))) {
      return c.json(
        errorBody('INVALID_CREDENTIALS', '账号或密码错误', 'password'),
        401,
      )
    }

    const user = toPublicUser(row)
    const token = createSession(c.get('db'), user.id)
    setCookie(c, SESSION_COOKIE, token, sessionCookieOptions(c.get('secureCookies')))
    return c.json({ user })
  })

  app.post('/api/auth/logout', (c) => {
    destroySession(c.get('db'), getCookie(c, SESSION_COOKIE))
    deleteCookie(c, SESSION_COOKIE, {
      path: '/',
      secure: c.get('secureCookies'),
    })
    return c.json({ ok: true })
  })

  const profile = new Hono<AppEnv>()

  profile.use('*', async (c, next) => {
    const user = c.get('user')
    if (!user) {
      return c.json(errorBody('UNAUTHENTICATED', '未登录'), 401)
    }
    await next()
  })

  profile.get('/', (c) => {
    const user = c.get('user')!
    const db = c.get('db')
    return c.json({
      profile: getUserProfile(db, user.id),
      families: listFamilies(db, user.id).map((family) => ({
        id: family.id,
        name: family.name,
        createdAt: family.createdAt,
        members: family.members.map((member) => ({
          id: member.id,
          name: member.name,
          createdAt: member.createdAt,
        })),
      })),
    })
  })

  profile.patch('/', async (c) => {
    const user = c.get('user')!
    let body: { nickname?: unknown; avatarUrl?: unknown }
    try {
      body = await c.req.json()
    } catch {
      return c.json(errorBody('INVALID_JSON', '请求格式无效'), 400)
    }

    const patch: { nickname?: string; avatarUrl?: string | null } = {}
    if (body.nickname !== undefined) {
      if (typeof body.nickname !== 'string') {
        return c.json(errorBody('INVALID_NICKNAME', '昵称格式无效'), 400)
      }
      patch.nickname = body.nickname.trim()
      if (patch.nickname.length > MAX_NICKNAME_LENGTH) {
        return c.json(errorBody('INVALID_NICKNAME', '昵称不能超过20字'), 400)
      }
    }
    if (body.avatarUrl !== undefined) {
      if (body.avatarUrl !== null && typeof body.avatarUrl !== 'string') {
        return c.json(errorBody('INVALID_AVATAR', '头像格式无效'), 400)
      }
      patch.avatarUrl = body.avatarUrl
    }

    if (patch.nickname === undefined && patch.avatarUrl === undefined) {
      return c.json(errorBody('EMPTY_PATCH', '没有需要更新的内容'), 400)
    }

    try {
      const nextProfile = upsertUserProfile(c.get('db'), user.id, patch)
      return c.json({ profile: nextProfile })
    } catch (error) {
      if (error instanceof Error && error.message === 'AVATAR_TOO_LARGE') {
        return c.json(errorBody('AVATAR_TOO_LARGE', '头像文件过大'), 400)
      }
      return c.json(errorBody('UNKNOWN', '更新失败，请稍后重试'), 500)
    }
  })

  profile.post('/password', async (c) => {
    const user = c.get('user')!
    let body: { currentPassword?: unknown; newPassword?: unknown }
    try {
      body = await c.req.json()
    } catch {
      return c.json(errorBody('INVALID_JSON', '请求格式无效'), 400)
    }

    const currentPassword =
      typeof body.currentPassword === 'string' ? body.currentPassword : ''
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''

    if (!currentPassword) {
      return c.json(errorBody('INVALID_PASSWORD', '请输入当前密码', 'password'), 400)
    }
    const passwordError = validatePassword(newPassword)
    if (passwordError) {
      return c.json(errorBody('INVALID_PASSWORD', passwordError, 'password'), 400)
    }

    const row = findUserById(c.get('db'), user.id)
    if (!row || !(await verifyPassword(currentPassword, row.password_hash))) {
      return c.json(errorBody('INVALID_PASSWORD', '当前密码错误', 'password'), 400)
    }

    updateUser(c.get('db'), user.id, {
      passwordHash: await hashPassword(newPassword),
    })
    destroyUserSessions(c.get('db'), user.id)

    const token = createSession(c.get('db'), user.id)
    setCookie(c, SESSION_COOKIE, token, sessionCookieOptions(c.get('secureCookies')))
    return c.json({ ok: true })
  })

  profile.post('/families', async (c) => {
    const user = c.get('user')!
    let body: { name?: unknown }
    try {
      body = await c.req.json()
    } catch {
      return c.json(errorBody('INVALID_JSON', '请求格式无效'), 400)
    }
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return c.json(errorBody('INVALID_NAME', '请输入家庭名称'), 400)
    }

    try {
      const family = createFamily(c.get('db'), user.id, body.name)
      return c.json(
        {
          family: {
            id: family.id,
            name: family.name,
            createdAt: family.createdAt,
            members: [],
          },
        },
        201,
      )
    } catch (error) {
      if (error instanceof Error && error.message === 'FAMILY_NAME_TOO_LONG') {
        return c.json(errorBody('INVALID_NAME', '家庭名称过长'), 400)
      }
      return c.json(errorBody('UNKNOWN', '添加失败，请稍后重试'), 500)
    }
  })

  profile.delete('/families/:id', (c) => {
    const user = c.get('user')!
    const familyId = Number(c.req.param('id'))
    if (!Number.isInteger(familyId) || familyId <= 0) {
      return c.json(errorBody('NOT_FOUND', '家庭不存在'), 404)
    }
    if (!deleteFamily(c.get('db'), user.id, familyId)) {
      return c.json(errorBody('NOT_FOUND', '家庭不存在'), 404)
    }
    return c.json({ ok: true })
  })

  profile.post('/families/:id/members', async (c) => {
    const user = c.get('user')!
    const familyId = Number(c.req.param('id'))
    if (!Number.isInteger(familyId) || familyId <= 0) {
      return c.json(errorBody('NOT_FOUND', '家庭不存在'), 404)
    }

    let body: { name?: unknown }
    try {
      body = await c.req.json()
    } catch {
      return c.json(errorBody('INVALID_JSON', '请求格式无效'), 400)
    }
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return c.json(errorBody('INVALID_NAME', '请输入成员昵称'), 400)
    }

    try {
      const member = addFamilyMember(c.get('db'), user.id, familyId, body.name)
      return c.json(
        {
          member: {
            id: member.id,
            name: member.name,
            createdAt: member.createdAt,
          },
        },
        201,
      )
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'FAMILY_NOT_FOUND') {
          return c.json(errorBody('NOT_FOUND', '家庭不存在'), 404)
        }
        if (error.message === 'MEMBER_NAME_TOO_LONG') {
          return c.json(errorBody('INVALID_NAME', '成员昵称过长'), 400)
        }
      }
      return c.json(errorBody('UNKNOWN', '添加失败，请稍后重试'), 500)
    }
  })

  profile.delete('/families/:familyId/members/:memberId', (c) => {
    const user = c.get('user')!
    const familyId = Number(c.req.param('familyId'))
    const memberId = Number(c.req.param('memberId'))
    if (
      !Number.isInteger(familyId) ||
      familyId <= 0 ||
      !Number.isInteger(memberId) ||
      memberId <= 0
    ) {
      return c.json(errorBody('NOT_FOUND', '成员不存在'), 404)
    }
    if (!removeFamilyMember(c.get('db'), user.id, familyId, memberId)) {
      return c.json(errorBody('NOT_FOUND', '成员不存在'), 404)
    }
    return c.json({ ok: true })
  })

  app.route('/api/profile', profile)

  const inventory = new Hono<AppEnv>()

  inventory.use('*', async (c, next) => {
    const user = c.get('user')
    if (!user) {
      return c.json(errorBody('UNAUTHENTICATED', '未登录'), 401)
    }
    await next()
  })

  inventory.get('/items', (c) => {
    const user = c.get('user')!
    const items = listInventoryItems(c.get('db'), user.id)
    return c.json({ items })
  })

  inventory.post('/items', async (c) => {
    const user = c.get('user')!
    let body: {
      productId?: unknown
      barcode?: unknown
      goodsName?: unknown
      brand?: unknown
      spec?: unknown
      categoryName?: unknown
      company?: unknown
      image?: unknown
      shelfLife?: unknown
      originCountry?: unknown
      quantity?: unknown
      expiryDate?: unknown
      storageLocation?: unknown
      notes?: unknown
    }
    try {
      body = await c.req.json()
    } catch {
      return c.json(errorBody('INVALID_JSON', '请求格式无效'), 400)
    }

    const productId =
      typeof body.productId === 'number' && Number.isInteger(body.productId)
        ? body.productId
        : undefined

    if (!productId) {
      if (typeof body.goodsName !== 'string' || !body.goodsName.trim()) {
        return c.json(errorBody('INVALID_NAME', '请输入商品名称'), 400)
      }
    }

    try {
      const item = createInventoryItem(c.get('db'), user.id, {
        productId,
        barcode: typeof body.barcode === 'string' ? body.barcode : null,
        goodsName: typeof body.goodsName === 'string' ? body.goodsName : undefined,
        brand: typeof body.brand === 'string' ? body.brand : '',
        spec: typeof body.spec === 'string' ? body.spec : '',
        categoryName: typeof body.categoryName === 'string' ? body.categoryName : '',
        company: typeof body.company === 'string' ? body.company : '',
        image: typeof body.image === 'string' ? body.image : '',
        shelfLife: typeof body.shelfLife === 'string' ? body.shelfLife : '',
        originCountry: typeof body.originCountry === 'string' ? body.originCountry : '',
        quantity:
          typeof body.quantity === 'number' && Number.isFinite(body.quantity)
            ? body.quantity
            : undefined,
        expiryDate:
          typeof body.expiryDate === 'string' ? body.expiryDate : undefined,
        storageLocation:
          typeof body.storageLocation === 'string'
            ? body.storageLocation
            : undefined,
        notes: typeof body.notes === 'string' ? body.notes : undefined,
      })
      return c.json({ item }, 201)
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'GOODS_NAME_REQUIRED') {
          return c.json(errorBody('INVALID_NAME', '请输入商品名称'), 400)
        }
        if (error.message === 'PRODUCT_NOT_FOUND') {
          return c.json(errorBody('PRODUCT_NOT_FOUND', '商品不存在'), 404)
        }
        if (error.message === 'QUANTITY_REQUIRED') {
          return c.json(errorBody('INVALID_QUANTITY', '请输入有效数量'), 400)
        }
        if (error.message === 'STORAGE_LOCATION_REQUIRED') {
          return c.json(errorBody('INVALID_LOCATION', '请选择存放位置'), 400)
        }
      }
      return c.json(errorBody('UNKNOWN', '入库失败，请稍后重试'), 500)
    }
  })

  app.route('/api/inventory', inventory)

  const products = new Hono<AppEnv>()

  products.use('*', async (c, next) => {
    const user = c.get('user')
    if (!user) {
      return c.json(errorBody('UNAUTHENTICATED', '未登录'), 401)
    }
    await next()
  })

  products.get('/barcode/:code', async (c) => {
    const user = c.get('user')!
    const code = c.req.param('code')
    const result = await resolveProductByBarcode(c.get('db'), code, {
      apiKey: process.env.TANSHU_API_KEY?.trim() ?? '',
      uploadsDir: c.get('uploadsDir'),
      userId: user.id,
    })

    if (!result.ok) {
      const status =
        result.code === 'UPSTREAM_ERROR'
          ? 502
          : result.code === 'INVALID_BARCODE'
            ? 400
            : 404
      return c.json(errorBody(result.code, result.message), status)
    }

    return c.json({
      product: result.product,
      fromCache: result.fromCache,
    })
  })

  app.route('/api/products', products)

  app.get('/api/uploads/products/:filename', (c) => {
    const filepath = resolveProductImagePath(
      c.get('uploadsDir'),
      `products/${c.req.param('filename')}`,
    )
    if (!filepath) {
      return c.json(errorBody('NOT_FOUND', '图片不存在'), 404)
    }

    const data = readFileSync(filepath)
    return c.body(data, 200, {
      'Content-Type': contentTypeForImagePath(filepath),
      'Cache-Control': 'public, max-age=86400',
    })
  })

  const admin = new Hono<AppEnv>()

  admin.use('*', async (c, next) => {
    const user = c.get('user')
    if (!user) {
      return c.json(errorBody('UNAUTHENTICATED', '未登录'), 401)
    }
    if (user.role !== 'admin') {
      return c.json(errorBody('FORBIDDEN', '需要管理员权限'), 403)
    }
    await next()
  })

  admin.get('/users', (c) => {
    const users = listUsers(c.get('db')).map(toPublicUser)
    return c.json({ users })
  })

  admin.patch('/users/:id', async (c) => {
    const id = Number(c.req.param('id'))
    if (!Number.isInteger(id) || id <= 0) {
      return c.json(errorBody('INVALID_ID', '账号不存在'), 404)
    }

    const target = findUserById(c.get('db'), id)
    if (!target) {
      return c.json(errorBody('NOT_FOUND', '账号不存在'), 404)
    }

    let body: {
      username?: unknown
      password?: unknown
      role?: unknown
    }
    try {
      body = await c.req.json()
    } catch {
      return c.json(errorBody('INVALID_JSON', '请求格式无效'), 400)
    }

    const patch: {
      username?: string
      passwordHash?: string
      role?: UserRole
    } = {}

    if (body.username !== undefined) {
      if (typeof body.username !== 'string') {
        return c.json(errorBody('INVALID_USERNAME', '请输入账号', 'username'), 400)
      }
      const username = normalizeUsername(body.username)
      const usernameError = validateUsername(username)
      if (usernameError) {
        return c.json(
          errorBody('INVALID_USERNAME', usernameError, 'username'),
          400,
        )
      }
      const existing = findUserByUsername(c.get('db'), username)
      if (existing && existing.id !== id) {
        return c.json(
          errorBody('USERNAME_TAKEN', '该账号已被注册', 'username'),
          409,
        )
      }
      patch.username = username
    }

    if (body.password !== undefined) {
      if (typeof body.password !== 'string' || !body.password) {
        return c.json(errorBody('INVALID_PASSWORD', '请输入密码', 'password'), 400)
      }
      const passwordError = validatePassword(body.password)
      if (passwordError) {
        return c.json(
          errorBody('INVALID_PASSWORD', passwordError, 'password'),
          400,
        )
      }
      patch.passwordHash = await hashPassword(body.password)
    }

    if (body.role !== undefined) {
      const role = parseRole(body.role)
      if (!role) {
        return c.json(errorBody('INVALID_ROLE', '角色无效', 'role'), 400)
      }
      const actor = c.get('user')!
      if (actor.id === id && role !== 'admin') {
        return c.json(
          errorBody('LAST_ADMIN', '不能取消自己的管理员权限'),
          400,
        )
      }
      if (target.role === 'admin' && role !== 'admin' && countAdmins(c.get('db')) <= 1) {
        return c.json(
          errorBody('LAST_ADMIN', '不能取消最后一个管理员'),
          400,
        )
      }
      patch.role = role
    }

    if (
      patch.username === undefined &&
      patch.passwordHash === undefined &&
      patch.role === undefined
    ) {
      return c.json(errorBody('EMPTY_PATCH', '没有需要更新的内容'), 400)
    }

    let updated
    try {
      updated = updateUser(c.get('db'), id, patch)
    } catch {
      return c.json(
        errorBody('USERNAME_TAKEN', '该账号已被注册', 'username'),
        409,
      )
    }
    if (!updated) {
      return c.json(errorBody('NOT_FOUND', '账号不存在'), 404)
    }

    if (patch.passwordHash) {
      destroyUserSessions(c.get('db'), id)
    }

    return c.json({ user: toPublicUser(updated) })
  })

  admin.delete('/users/:id', (c) => {
    const id = Number(c.req.param('id'))
    if (!Number.isInteger(id) || id <= 0) {
      return c.json(errorBody('INVALID_ID', '账号不存在'), 404)
    }

    const actor = c.get('user')!
    if (actor.id === id) {
      return c.json(errorBody('SELF_DELETE', '不能删除当前登录账号'), 400)
    }

    const target = findUserById(c.get('db'), id)
    if (!target) {
      return c.json(errorBody('NOT_FOUND', '账号不存在'), 404)
    }
    if (target.role === 'admin' && countAdmins(c.get('db')) <= 1) {
      return c.json(errorBody('LAST_ADMIN', '不能删除最后一个管理员'), 400)
    }

    destroyUserSessions(c.get('db'), id)
    deleteUser(c.get('db'), id)
    return c.json({ ok: true })
  })

  app.route('/api/admin', admin)

  return app
}
