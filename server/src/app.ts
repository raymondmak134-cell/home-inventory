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
  createSession,
  destroySession,
  readSessionUser,
  SESSION_COOKIE,
  sessionCookieOptions,
} from './session.ts'

export type AppEnv = {
  Variables: {
    db: DatabaseSync
    secureCookies: boolean
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

export function createApp(db: DatabaseSync, options?: { secureCookies?: boolean }) {
  const app = new Hono<AppEnv>()
  const secureCookies = options?.secureCookies ?? false

  app.use('*', async (c, next) => {
    c.set('db', db)
    c.set('secureCookies', secureCookies)
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
