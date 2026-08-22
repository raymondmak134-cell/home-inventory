import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function mockAuthApis(options?: {
  me?: { id: number; username: string; role?: 'admin' | 'user'; createdAt: string } | null
  login?:
    | { user: { id: number; username: string; role?: 'admin' | 'user'; createdAt: string } }
    | { error: { code: string; message: string; field?: string } }
  register?:
    | { user: { id: number; username: string; role?: 'admin' | 'user'; createdAt: string } }
    | { error: { code: string; message: string; field?: string } }
  users?: Array<{ id: number; username: string; role: 'admin' | 'user'; createdAt: string }>
}) {
  const me = options?.me === undefined ? null : options.me
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input)
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
    render(<App />)
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
    render(<App />)
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
    render(<App />)
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
    render(<App />)
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
    render(<App />)
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
    render(<App />)
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
    render(<App />)
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
    render(<App />)
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
    render(<App />)

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
    render(<App />)

    await user.click(await screen.findByRole('button', { name: '个人主页' }))
    await user.click(screen.getByRole('button', { name: '退出登录' }))

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText('确定要退出当前账号吗？')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '退出' }))

    expect(await screen.findByRole('heading', { name: '家仓' })).toBeInTheDocument()
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
    render(<App />)
    await screen.findByRole('button', { name: '登录' })

    await user.type(screen.getByLabelText('密码'), 'badpass')
    await user.click(screen.getByRole('button', { name: '登录' }))

    await waitFor(() => {
      expect(screen.getByText('账号或密码错误')).toBeVisible()
    })
  })
})
