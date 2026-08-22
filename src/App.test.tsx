import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function renderApp(initialEntries: string[] = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <App />
    </MemoryRouter>,
  )
}

function mockAuthApis(options?: {
  me?: { id: number; username: string; role?: 'admin' | 'user'; createdAt: string } | null
  login?:
    | { user: { id: number; username: string; role?: 'admin' | 'user'; createdAt: string } }
    | { error: { code: string; message: string; field?: string } }
  register?:
    | { user: { id: number; username: string; role?: 'admin' | 'user'; createdAt: string } }
    | { error: { code: string; message: string; field?: string } }
  users?: Array<{ id: number; username: string; role: 'admin' | 'user'; createdAt: string }>
  profile?: { nickname: string; avatarUrl: string | null }
  families?: Array<{
    id: number
    name: string
    createdAt: string
    members: Array<{ id: number; name: string; createdAt: string }>
  }>
}) {
  const me = options?.me === undefined ? null : options.me
  let profile = options?.profile ?? { nickname: '', avatarUrl: null }
  let families = options?.families ?? []

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = (init?.method ?? 'GET').toUpperCase()

      if (url.endsWith('/api/auth/me')) {
        if (!me) {
          return new Response(JSON.stringify({ error: { code: 'UNAUTHENTICATED', message: '未登录' } }), {
            status: 401,
            headers: { 'content-type': 'application/json' },
          })
        }
        return new Response(
          JSON.stringify({ user: { role: 'user', ...me } }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        )
      }
      if (url.endsWith('/api/auth/login')) {
        const body = options?.login ?? {
          user: {
            id: 1,
            username: 'admin',
            role: 'user',
            createdAt: '2026-01-01 00:00:00',
          },
        }
        const ok = 'user' in body
        return new Response(JSON.stringify(body), {
          status: ok ? 200 : 401,
          headers: { 'content-type': 'application/json' },
        })
      }
      if (url.endsWith('/api/auth/register')) {
        const body = options?.register ?? {
          user: {
            id: 2,
            username: 'demo',
            role: 'user',
            createdAt: '2026-01-01 00:00:00',
          },
        }
        const ok = 'user' in body
        return new Response(JSON.stringify(body), {
          status: ok ? 201 : 409,
          headers: { 'content-type': 'application/json' },
        })
      }
      if (url.endsWith('/api/auth/logout')) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }
      if (url.endsWith('/api/profile') && method === 'GET') {
        return new Response(JSON.stringify({ profile, families }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }
      if (url.endsWith('/api/profile') && method === 'PATCH') {
        const body = init?.body ? JSON.parse(String(init.body)) : {}
        profile = {
          nickname: body.nickname ?? profile.nickname,
          avatarUrl: body.avatarUrl ?? profile.avatarUrl,
        }
        return new Response(JSON.stringify({ profile }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }
      if (url.endsWith('/api/profile/password') && method === 'POST') {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }
      if (url.endsWith('/api/profile/families') && method === 'POST') {
        const body = init?.body ? JSON.parse(String(init.body)) : {}
        const family = {
          id: families.length + 1,
          name: body.name,
          createdAt: '2026-01-01 00:00:00',
          members: [],
        }
        families = [...families, family]
        return new Response(JSON.stringify({ family }), {
          status: 201,
          headers: { 'content-type': 'application/json' },
        })
      }
      if (url.match(/\/api\/profile\/families\/\d+$/) && method === 'DELETE') {
        const id = Number(url.split('/').pop())
        families = families.filter((family) => family.id !== id)
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }
      if (url.match(/\/api\/profile\/families\/\d+\/members$/) && method === 'POST') {
        const familyId = Number(url.split('/').slice(-2)[0])
        const body = init?.body ? JSON.parse(String(init.body)) : {}
        families = families.map((family) =>
          family.id === familyId
            ? {
                ...family,
                members: [
                  ...family.members,
                  {
                    id: family.members.length + 1,
                    name: body.name,
                    createdAt: '2026-01-01 00:00:00',
                  },
                ],
              }
            : family,
        )
        const member = families.find((family) => family.id === familyId)?.members.at(-1)
        return new Response(JSON.stringify({ member }), {
          status: 201,
          headers: { 'content-type': 'application/json' },
        })
      }
      if (url.match(/\/api\/profile\/families\/\d+\/members\/\d+$/) && method === 'DELETE') {
        const parts = url.split('/')
        const memberId = Number(parts.pop())
        const familyId = Number(parts.pop())
        families = families.map((family) =>
          family.id === familyId
            ? {
                ...family,
                members: family.members.filter((member) => member.id !== memberId),
              }
            : family,
        )
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }
      if (url.endsWith('/api/admin/users')) {
        return new Response(
          JSON.stringify({
            users: options?.users ?? [
              {
                id: 1,
                username: '13424330500',
                role: 'admin',
                createdAt: '2026-01-01 00:00:00',
              },
            ],
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        )
      }
      return new Response('not found', { status: 404 })
    }),
  )
}

describe('登录页', () => {
  beforeEach(() => {
    mockAuthApis()
  })

  it('renders the designed login shell', async () => {
    renderApp()
    expect(await screen.findByRole('heading', { name: '家仓' })).toBeInTheDocument()
    expect(screen.getByText('不必盲目加仓，好物存进家仓')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '登录' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByLabelText('账号')).toHaveAttribute('type', 'text')
    expect(screen.getByLabelText('密码')).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument()
  })

  it('toggles password visibility for mobile keyboard input', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByRole('button', { name: '登录' })

    const password = screen.getByLabelText('密码')
    await user.type(password, 'secret123')
    expect(password).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: '显示密码' }))
    expect(password).toHaveAttribute('type', 'text')
    expect(password).toHaveValue('secret123')
  })

  it('switches to register mode from the footer link', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByRole('button', { name: '登录' })

    await user.click(screen.getByRole('button', { name: '没有账号？去注册一个' }))
    expect(screen.getByRole('tab', { name: '注册账号' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('button', { name: '注册' })).toBeInTheDocument()
  })

  it('shows reserved-height field errors on empty register submit', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByRole('button', { name: '登录' })

    await user.click(screen.getByRole('tab', { name: '注册账号' }))
    expect(screen.getByPlaceholderText('请再次确认密码')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '注册' }))

    expect(screen.getByText('请输入账号')).toBeVisible()
    expect(screen.getByText('请输入密码')).toBeVisible()
    expect(screen.getByText('请确认密码')).toBeVisible()
    expect(screen.getByLabelText('账号')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('密码')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('确认密码')).toHaveAttribute('aria-invalid', 'true')
  })

  it('rejects mismatched confirm password on register', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByRole('button', { name: '登录' })

    await user.click(screen.getByRole('tab', { name: '注册账号' }))
    await user.type(screen.getByLabelText('账号'), 'demo')
    await user.type(screen.getByLabelText('密码'), 'abc12345')
    await user.type(screen.getByLabelText('确认密码'), 'abc99999')
    await user.click(screen.getByRole('button', { name: '注册' }))

    expect(screen.getByText('两次输入的密码不一致')).toBeVisible()
  })

  it('validates register password rule in realtime', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByRole('button', { name: '登录' })

    await user.click(screen.getByRole('tab', { name: '注册账号' }))
    await user.type(screen.getByLabelText('密码'), 'abc')

    expect(screen.getByText('密码需为8-20位字母和数字组合')).toBeVisible()
    expect(screen.getByLabelText('密码')).toHaveAttribute('aria-invalid', 'true')

    await user.clear(screen.getByLabelText('密码'))
    await user.type(screen.getByLabelText('密码'), 'abcdefgh')
    expect(screen.getByText('密码需为8-20位字母和数字组合')).toBeVisible()

    await user.clear(screen.getByLabelText('密码'))
    await user.type(screen.getByLabelText('密码'), 'abc12345')
    expect(screen.queryByText('密码需为8-20位字母和数字组合')).not.toBeInTheDocument()
    expect(screen.getByLabelText('密码')).toHaveAttribute('aria-invalid', 'false')
  })

  it('logs in through the API and shows the home empty state', async () => {
    const user = userEvent.setup()
    mockAuthApis({
      login: {
        user: {
          id: 1,
          username: 'admin',
          role: 'user',
          createdAt: '2026-01-01 00:00:00',
        },
      },
    })
    renderApp()
    await screen.findByRole('button', { name: '登录' })

    await user.clear(screen.getByLabelText('账号'))
    await user.type(screen.getByLabelText('账号'), 'admin')
    await user.type(screen.getByLabelText('密码'), 'secret1')
    await user.click(screen.getByRole('button', { name: '登录' }))

    expect(await screen.findByRole('heading', { name: '当前为空仓' })).toBeInTheDocument()
    expect(screen.getByText('我的家', { selector: '.top-nav__family-name' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '当前为空仓' })).toBeInTheDocument()
    expect(screen.getByText('请给家仓加个仓吧。')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '入库家里第一件物品' }),
    ).toBeInTheDocument()
  })

  it('shows home page after admin login instead of account management', async () => {
    const user = userEvent.setup()
    mockAuthApis({
      login: {
        user: {
          id: 2,
          username: '13424330500',
          role: 'admin',
          createdAt: '2026-01-01 00:00:00',
        },
      },
    })
    renderApp()
    await screen.findByRole('button', { name: '登录' })

    await user.clear(screen.getByLabelText('账号'))
    await user.type(screen.getByLabelText('账号'), '13424330500')
    await user.type(screen.getByLabelText('密码'), 'secret1')
    await user.click(screen.getByRole('button', { name: '登录' }))

    expect(await screen.findByRole('heading', { name: '当前为空仓' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '账号管理', level: 1 })).not.toBeInTheDocument()
    expect(screen.queryByText('账号已登录')).not.toBeInTheDocument()
  })

  it('opens profile page from avatar and admin account management', async () => {
    const user = userEvent.setup()
    mockAuthApis({
      me: {
        id: 2,
        username: '13424330500',
        role: 'admin',
        createdAt: '2026-01-01 00:00:00',
      },
      users: [
        {
          id: 2,
          username: '13424330500',
          role: 'admin',
          createdAt: '2026-01-01 00:00:00',
        },
        {
          id: 1,
          username: 'testuser01',
          role: 'user',
          createdAt: '2026-01-01 00:00:00',
        },
      ],
    })
    renderApp()

    expect(await screen.findByRole('heading', { name: '当前为空仓' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '个人主页' }))

    expect(await screen.findByRole('heading', { name: '个人主页', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '退出登录' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /账号管理/ }))

    expect(await screen.findByRole('heading', { name: '账号管理', level: 1 })).toBeInTheDocument()
    expect(await screen.findByText('testuser01')).toBeInTheDocument()
    expect(screen.getAllByText(/管理员/).length).toBeGreaterThan(0)
  })

  it('shows logout confirmation before signing out', async () => {
    const user = userEvent.setup()
    mockAuthApis({
      me: {
        id: 1,
        username: 'demo',
        role: 'user',
        createdAt: '2026-01-01 00:00:00',
      },
    })
    renderApp()

    await user.click(await screen.findByRole('button', { name: '个人主页' }))
    await user.click(screen.getByRole('button', { name: '退出登录' }))

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText('确定要退出当前账号吗？')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '退出' }))

    expect(await screen.findByRole('heading', { name: '家仓' })).toBeInTheDocument()
  })

  it('opens dedicated routes for profile sub pages', async () => {
    mockAuthApis({
      me: {
        id: 1,
        username: 'demo',
        role: 'user',
        createdAt: '2026-01-01 00:00:00',
      },
    })
    renderApp(['/profile/settings'])

    expect(await screen.findByRole('heading', { name: '账号设置', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '修改密码' })).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('请输入昵称')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '上传头像' })).not.toBeInTheDocument()
  })

  it('opens the scan-in bottom sheet from the empty warehouse CTA', async () => {
    const user = userEvent.setup()
    mockAuthApis({
      me: {
        id: 1,
        username: 'demo',
        role: 'user',
        createdAt: '2026-01-01 00:00:00',
      },
    })
    renderApp()

    await user.click(await screen.findByRole('button', { name: '入库家里第一件物品' }))

    const dialog = await screen.findByRole('dialog', { name: '扫码入库' })
    expect(dialog).toBeInTheDocument()
    expect(screen.getByText('请扫描商品包装上的条形码快速入库')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '无条形码？手动添加' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '关闭' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '扫码入库' })).not.toBeInTheDocument()
    })
  })

  it('reuses login-style validation on the change-password form', async () => {
    const user = userEvent.setup()
    mockAuthApis({
      me: {
        id: 1,
        username: 'demo',
        role: 'user',
        createdAt: '2026-01-01 00:00:00',
      },
    })
    renderApp(['/profile/settings'])

    await screen.findByRole('button', { name: '修改密码' })

    // 实时校验：新密码不满足规则时展示与注册页一致的错误
    await user.type(screen.getByLabelText('新密码'), 'abc')
    expect(screen.getByText('密码需为8-20位字母和数字组合')).toBeVisible()
    expect(screen.getByLabelText('新密码')).toHaveAttribute('aria-invalid', 'true')

    // 空提交：逐字段报错
    await user.clear(screen.getByLabelText('新密码'))
    await user.click(screen.getByRole('button', { name: '修改密码' }))
    expect(screen.getByText('请输入当前密码')).toBeVisible()
    expect(screen.getByText('请输入新密码')).toBeVisible()
    expect(screen.getByText('请确认新密码')).toBeVisible()

    // 密码可见性切换（与登录页一致的交互）
    await user.click(screen.getByRole('button', { name: '显示新密码' }))
    expect(screen.getByLabelText('新密码')).toHaveAttribute('type', 'text')

    // 合法输入提交成功
    await user.type(screen.getByLabelText('当前密码'), 'old12345')
    await user.type(screen.getByLabelText('新密码'), 'new12345')
    await user.type(screen.getByLabelText('确认新密码'), 'new12345')
    await user.click(screen.getByRole('button', { name: '修改密码' }))

    expect(await screen.findByText('密码已修改')).toBeVisible()
  })

  it('shows API field errors from the backend', async () => {
    const user = userEvent.setup()
    mockAuthApis({
      login: {
        error: {
          code: 'INVALID_CREDENTIALS',
          message: '账号或密码错误',
          field: 'password',
        },
      },
    })
    renderApp()
    await screen.findByRole('button', { name: '登录' })

    await user.type(screen.getByLabelText('密码'), 'badpass')
    await user.click(screen.getByRole('button', { name: '登录' }))

    await waitFor(() => {
      expect(screen.getByText('账号或密码错误')).toBeVisible()
    })
  })
})
