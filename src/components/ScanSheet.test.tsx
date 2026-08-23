import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ScanSheet } from './ScanSheet'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ScanSheet', () => {
  it('renders scanning state with manual add entry', async () => {
    render(<ScanSheet open onClose={() => {}} onManualAdd={() => {}} />)

    expect(await screen.findByRole('dialog', { name: '扫码入库' })).toBeInTheDocument()
    expect(screen.getByText('请扫描商品包装上的条形码快速入库')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '无条形码？手动添加' })).toBeInTheDocument()
  })
})
