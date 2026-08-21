import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(() => {
  cleanup()
})

describe('scaffold', () => {
  it('mounts the app shell', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: '家物仓' })).toBeInTheDocument()
  })
})
