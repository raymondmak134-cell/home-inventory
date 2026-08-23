import { afterEach, describe, expect, it, vi } from 'vitest'
import { createInventoryItem, fetchInventoryItems } from './inventory'

describe('inventory api client', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads inventory items', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 1,
              barcode: '6906337301091',
              goodsName: '葱油压缩饼干',
              brand: '冠生园',
              spec: '118g',
              categoryName: '',
              company: '',
              image: '',
              shelfLife: '',
              originCountry: '',
              createdAt: '2026-01-01 00:00:00',
            },
          ],
        }),
      }),
    )

    const items = await fetchInventoryItems()
    expect(items).toHaveLength(1)
    expect(items[0]?.goodsName).toBe('葱油压缩饼干')
  })

  it('creates inventory items', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          item: {
            id: 2,
            barcode: null,
            goodsName: '洗衣液',
            brand: '蓝月亮',
            spec: '2kg',
            categoryName: '',
            company: '',
            image: '',
            shelfLife: '',
            originCountry: '',
            createdAt: '2026-01-01 00:00:00',
          },
        }),
      }),
    )

    const item = await createInventoryItem({ goodsName: '洗衣液', brand: '蓝月亮' })
    expect(item.goodsName).toBe('洗衣液')
  })
})
