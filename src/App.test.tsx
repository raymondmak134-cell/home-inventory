import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(() => {
  cleanup()
})

describe('登录页', () => {
  it('renders the designed login shell', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: '家仓' })).toBeInTheDocument()
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

    await user.click(screen.getByRole('tab', { name: '注册账号' }))
    await user.type(screen.getByLabelText('账号'), 'demo')
    await user.type(screen.getByLabelText('密码'), 'abc12345')
    await user.type(screen.getByLabelText('确认密码'), 'abc99999')
    await user.click(screen.getByRole('button', { name: '注册' }))

    expect(screen.getByText('两次输入的密码不一致')).toBeVisible()
  })
})
