import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from './app.ts'
import { createDatabase } from './db.ts'

process.env.SESSION_SECRET = 'test-session-secret-at-least-16'
process.env.ADMIN_USERNAME = '13424330500'

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
      body: JSON.stringify({ username: '小明', password: 'secret12' }),
    })
    expect(register.status).toBe(201)
    const registerBody = (await register.json()) as {
      user: { username: string; role: string }
    }
    expect(registerBody.user.username).toBe('小明')
    expect(registerBody.user.role).toBe('user')

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
      body: JSON.stringify({ username: 'demo', password: 'secret12' }),
    })

    const duplicate = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'Demo', password: 'secret99' }),
    })
    expect(duplicate.status).toBe(409)

    const weakPassword = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'weak', password: 'abc' }),
    })
    expect(weakPassword.status).toBe(400)
    expect(await weakPassword.json()).toMatchObject({
      error: {
        field: 'password',
        message: '密码需为8-20位字母和数字组合',
      },
    })

    const badLogin = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'demo', password: 'wrong-password' }),
    })
    expect(badLogin.status).toBe(401)

    const goodLogin = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'demo', password: 'secret12' }),
    })
    expect(goodLogin.status).toBe(200)
    expect(cookieFrom(goodLogin)).toBeTruthy()
  })

  it('promotes configured admin and allows account management', async () => {
    const adminRegister = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: '13424330500', password: 'secret12' }),
    })
    expect(adminRegister.status).toBe(201)
    const adminBody = (await adminRegister.json()) as {
      user: { role: string; id: number }
    }
    expect(adminBody.user.role).toBe('admin')
    const adminCookie = cookieFrom(adminRegister)!

    const userRegister = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'member01', password: 'secret12' }),
    })
    const member = (await userRegister.json()) as { user: { id: number } }

    const forbidden = await app.request('/api/admin/users', {
      headers: { cookie: cookieFrom(userRegister)! },
    })
    expect(forbidden.status).toBe(403)

    const list = await app.request('/api/admin/users', {
      headers: { cookie: adminCookie },
    })
    expect(list.status).toBe(200)
    const listed = (await list.json()) as { users: Array<{ username: string }> }
    expect(listed.users.map((user) => user.username)).toEqual(
      expect.arrayContaining(['13424330500', 'member01']),
    )

    const patched = await app.request(`/api/admin/users/${member.user.id}`, {
      method: 'PATCH',
      headers: {
        cookie: adminCookie,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ username: 'member02', password: 'secret99' }),
    })
    expect(patched.status).toBe(200)
    expect(((await patched.json()) as { user: { username: string } }).user.username).toBe(
      'member02',
    )

    const deleted = await app.request(`/api/admin/users/${member.user.id}`, {
      method: 'DELETE',
      headers: { cookie: adminCookie },
    })
    expect(deleted.status).toBe(200)

    const selfDelete = await app.request(`/api/admin/users/${adminBody.user.id}`, {
      method: 'DELETE',
      headers: { cookie: adminCookie },
    })
    expect(selfDelete.status).toBe(400)
  })
})
