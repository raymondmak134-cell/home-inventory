import { afterEach, describe, expect, it, vi } from 'vitest'
import { BarcodeApiError, fetchBarcodeProduct } from './barcode'

describe('fetchBarcodeProduct', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('rejects empty barcode input', async () => {
    await expect(fetchBarcodeProduct('  ')).rejects.toThrow(BarcodeApiError)
  })

  it('returns product data when API succeeds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          code: 1,
          msg: '操作成功',
          data: {
            barcode: '6906337301091',
            goods_name: '葱油压缩饼干',
            brand: '冠生园',
          },
        }),
      }),
    )

    const result = await fetchBarcodeProduct('6906337301091')
    expect(result.data.goods_name).toBe('葱油压缩饼干')
  })
})
