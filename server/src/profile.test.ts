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

describe('profile api', () => {
  let dbPath = ''
  let app: ReturnType<typeof createApp>

  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), 'jiawucang-profile-'))
    dbPath = join(dir, 'test.sqlite')
    app = createApp(createDatabase(dbPath))
  })

  afterEach(() => {
    if (dbPath) {
      rmSync(join(dbPath, '..'), { recursive: true, force: true })
    }
  })

  it('loads, updates profile, and manages families', async () => {
    const register = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'profileuser', password: 'secret12' }),
    })
    expect(register.status).toBe(201)
    const cookie = cookieFrom(register)!

    const empty = await app.request('/api/profile', { headers: { cookie } })
    expect(empty.status).toBe(200)
    expect(await empty.json()).toEqual({
      profile: { nickname: '', avatarUrl: null },
      families: [],
    })

    const patched = await app.request('/api/profile', {
      method: 'PATCH',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ nickname: '小明', avatarUrl: 'data:image/png;base64,abc' }),
    })
    expect(patched.status).toBe(200)

    const family = await app.request('/api/profile/families', {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ name: '我的家' }),
    })
    expect(family.status).toBe(201)
    const familyBody = (await family.json()) as {
      family: { id: number; name: string; members: [] }
    }

    const member = await app.request(`/api/profile/families/${familyBody.family.id}/members`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ name: '爸爸' }),
    })
    expect(member.status).toBe(201)

    const loaded = await app.request('/api/profile', { headers: { cookie } })
    const loadedBody = (await loaded.json()) as {
      profile: { nickname: string; avatarUrl: string | null }
      families: Array<{ name: string; members: Array<{ name: string }> }>
    }
    expect(loadedBody.profile.nickname).toBe('小明')
    expect(loadedBody.families[0]?.name).toBe('我的家')
    expect(loadedBody.families[0]?.members[0]?.name).toBe('爸爸')
  })

  it('changes password for the current user', async () => {
    const register = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'pwduser', password: 'secret12' }),
    })
    const cookie = cookieFrom(register)!

    const bad = await app.request('/api/profile/password', {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ currentPassword: 'wrong-pass', newPassword: 'secret99' }),
    })
    expect(bad.status).toBe(400)

    const ok = await app.request('/api/profile/password', {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ currentPassword: 'secret12', newPassword: 'secret99' }),
    })
    expect(ok.status).toBe(200)

    const login = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'pwduser', password: 'secret99' }),
    })
    expect(login.status).toBe(200)
  })
})
