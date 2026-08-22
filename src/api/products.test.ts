import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchProductByBarcode, ProductApiError } from './products'

describe('fetchProductByBarcode', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns product data when API succeeds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          product: {
            id: 1,
            barcode: '6906337301091',
            goodsName: '葱油压缩饼干',
            brand: '冠生园',
            spec: '118g',
            categoryName: '饼干',
            company: '',
            image: '/api/uploads/products/6906337301091.jpg',
            shelfLife: '720天',
            originCountry: '中国',
            source: 'tanshu',
            createdAt: '2026-01-01 00:00:00',
            updatedAt: '2026-01-01 00:00:00',
          },
          fromCache: false,
        }),
      }),
    )

    const result = await fetchProductByBarcode('6906337301091')
    expect(result.product.goodsName).toBe('葱油压缩饼干')
    expect(result.fromCache).toBe(false)
  })

  it('throws PRODUCT_NOT_FOUND for misses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: '未找到该条形码对应的商品，请手动添加',
          },
        }),
      }),
    )

    await expect(fetchProductByBarcode('0000000000000')).rejects.toMatchObject({
      code: 'PRODUCT_NOT_FOUND',
    } satisfies Partial<ProductApiError>)
  })
})
