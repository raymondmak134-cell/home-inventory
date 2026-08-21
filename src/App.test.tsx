import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { STORAGE_KEY } from './lib/inventory'

describe('家物仓 App', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('registers an item and persists it', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('名称'), '晾衣架')
    await user.type(screen.getByLabelText('位置'), '阳台储物柜')
    await user.clear(screen.getByLabelText('数量'))
    await user.type(screen.getByLabelText('数量'), '1')
    await user.type(screen.getByLabelText('备注'), '金属')
    await user.click(screen.getByRole('button', { name: '加入家物仓' }))

    expect(screen.getByRole('heading', { name: '晾衣架' })).toBeInTheDocument()
    expect(screen.getByText(/阳台储物柜/)).toBeInTheDocument()

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Array<{
      name: string
    }>
    expect(stored).toHaveLength(1)
    expect(stored[0].name).toBe('晾衣架')
  })

  it('filters registered items', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          id: '1',
          name: '热水壶',
          location: '厨房',
          quantity: 1,
          note: '',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: '2',
          name: '毛毯',
          location: '卧室',
          quantity: 2,
          note: '',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ]),
    )

    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByRole('heading', { name: '热水壶' })).toBeInTheDocument()
    await user.type(screen.getByPlaceholderText('搜索名称、位置或备注'), '卧室')
    expect(screen.queryByRole('heading', { name: '热水壶' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '毛毯' })).toBeInTheDocument()
  })
})
