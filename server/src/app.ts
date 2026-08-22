import { Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { DatabaseSync } from 'node:sqlite'
import {
  createUser,
  findUserByUsername,
  toPublicUser,
  type PublicUser,
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
  }
}

type ErrorBody = {
  error: {
    code: string
    message: string
    field?: 'username' | 'password' | 'confirmPassword'
  }
}

function errorBody(
  code: string,
  message: string,
  field?: ErrorBody['error']['field'],
): ErrorBody {
  return { error: { code, message, field } }
}

export function createApp(db: DatabaseSync, options?: { secureCookies?: boolean }) {
  const app = new Hono<AppEnv>()
  const secureCookies = options?.secureCookies ?? false

  app.use('*', async (c, next) => {
    c.set('db', db)
    c.set('secureCookies', secureCookies)
    await next()
  })

  app.get('/api/health', (c) => c.json({ ok: true }))

  app.get('/api/auth/me', (c) => {
    const user = readSessionUser(c.get('db'), getCookie(c, SESSION_COOKIE))
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

  return app
}
