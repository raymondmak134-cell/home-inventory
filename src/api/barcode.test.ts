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
            brand: '冠生园',
            goods_name: '葱油压缩饼干',
            company: '上海冠生园益民食品有限公司',
            category_code: '10000161',
            category_name: '饼干、曲奇（耐存储）',
            image: '',
            spec: '118g*48袋',
            width: '',
            height: '',
            depth: '',
            gross_weight: '',
            net_weight: '',
            price: '',
            origin_country: '中国',
            first_ship_date: '',
            packaging_type: '',
            shelf_life: '720天',
            min_sales_unit: '',
            certification_standard: '',
            certificate_license: '',
          },
        }),
      }),
    )

    const result = await fetchBarcodeProduct('6906337301091')
    expect(result.code).toBe(1)
    expect(result.data.goods_name).toBe('葱油压缩饼干')
  })

  it('throws when upstream returns business error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          code: 10001,
          msg: '无效的 key',
        }),
      }),
    )

    await expect(fetchBarcodeProduct('6906337301091')).rejects.toThrow('无效的 key')
  })
})
