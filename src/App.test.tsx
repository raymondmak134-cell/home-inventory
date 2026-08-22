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
})
