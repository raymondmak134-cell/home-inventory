import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(() => {
  cleanup()
})

describe('App', () => {
  it('mounts the app shell', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: '家物仓' })).toBeInTheDocument()
    expect(screen.getByLabelText('条形码')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '查询' })).toBeInTheDocument()
  })
})
