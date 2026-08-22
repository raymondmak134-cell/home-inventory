import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from './app.ts'
import { createDatabase } from './db.ts'

process.env.SESSION_SECRET = 'test-session-secret-at-least-16'

function cookieFrom(response: Response): string | undefined {
  const headers = response.headers.getSetCookie?.() ?? []
  const session = headers.find((value) => value.startsWith('jiawucang_session='))
  return session?.split(';')[0]
}

describe('auth api', () => {
  let dbPath = ''
  let app: ReturnType<typeof createApp>

  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), 'jiawucang-'))
    dbPath = join(dir, 'test.sqlite')
    app = createApp(createDatabase(dbPath))
  })

  afterEach(() => {
    if (dbPath) {
      rmSync(join(dbPath, '..'), { recursive: true, force: true })
    }
  })

  it('registers, reads me, and logs out', async () => {
    const register = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: '小明', password: 'secret1' }),
    })
    expect(register.status).toBe(201)
    const registerBody = (await register.json()) as {
      user: { username: string }
    }
    expect(registerBody.user.username).toBe('小明')

    const cookie = cookieFrom(register)
    expect(cookie).toBeTruthy()

    const me = await app.request('/api/auth/me', {
      headers: { cookie: cookie! },
    })
    expect(me.status).toBe(200)
    expect(((await me.json()) as { user: { username: string } }).user.username).toBe(
      '小明',
    )

    const logout = await app.request('/api/auth/logout', {
      method: 'POST',
      headers: { cookie: cookie! },
    })
    expect(logout.status).toBe(200)

    const meAfter = await app.request('/api/auth/me', {
      headers: { cookie: cookie! },
    })
    expect(meAfter.status).toBe(401)
  })

  it('rejects duplicate usernames and wrong passwords', async () => {
    await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'demo', password: 'secret1' }),
    })

    const duplicate = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'Demo', password: 'secret2' }),
    })
    expect(duplicate.status).toBe(409)

    const badLogin = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'demo', password: 'wrong-password' }),
    })
    expect(badLogin.status).toBe(401)

    const goodLogin = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'demo', password: 'secret1' }),
    })
    expect(goodLogin.status).toBe(200)
    expect(cookieFrom(goodLogin)).toBeTruthy()
  })
})
