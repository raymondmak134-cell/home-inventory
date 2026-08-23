import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from './app.ts'
import { createDatabase } from './db.ts'
import { createInventoryItem } from './inventory.ts'
import {
  findProductByBarcode,
  resolveProductByBarcode,
} from './products.ts'

process.env.SESSION_SECRET = 'test-session-secret-at-least-16'

function cookieFrom(response: Response): string | undefined {
  const headers = response.headers.getSetCookie?.() ?? []
  const session = headers.find((value) => value.startsWith('jiawucang_session='))
  return session?.split(';')[0]
}

describe('products api', () => {
  let dbPath = ''
  let uploadsDir = ''
  let app: ReturnType<typeof createApp>
  let cookie = ''

  beforeEach(async () => {
    const dir = mkdtempSync(join(tmpdir(), 'jiawucang-products-'))
    dbPath = join(dir, 'test.sqlite')
    uploadsDir = join(dir, 'uploads')
    app = createApp(createDatabase(dbPath), { uploadsDir })

    const register = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'demo', password: 'secret12' }),
    })
    cookie = cookieFrom(register)!
  })

  afterEach(() => {
    if (dbPath) {
      rmSync(join(dbPath, '..'), { recursive: true, force: true })
    }
    vi.unstubAllGlobals()
    delete process.env.TANSHU_API_KEY
  })

  it('returns cached product on second lookup without calling upstream', async () => {
    process.env.TANSHU_API_KEY = 'test-key'
    const fetchMock = vi.fn(async () =>
      Response.json({
        code: 1,
        msg: '操作成功',
        data: {
          barcode: '6906337301091',
          goods_name: '葱油压缩饼干',
          brand: '冠生园',
          company: '上海冠生园益民食品有限公司',
          category_code: '10000161',
          category_name: '饼干',
          image: 'https://example.com/product.jpg',
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
    )
    vi.stubGlobal('fetch', fetchMock)

    const first = await app.request('/api/products/barcode/6906337301091', {
      headers: { cookie },
    })
    expect(first.status).toBe(200)
    const firstBody = (await first.json()) as {
      product: { goodsName: string; image: string }
      fromCache: boolean
    }
    expect(firstBody.fromCache).toBe(false)
    expect(firstBody.product.goodsName).toBe('葱油压缩饼干')
    expect(firstBody.product.image).toContain('/api/uploads/products/6906337301091')

    const second = await app.request('/api/products/barcode/6906337301091', {
      headers: { cookie },
    })
    expect(second.status).toBe(200)
    const secondBody = (await second.json()) as { fromCache: boolean }
    expect(secondBody.fromCache).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('records barcode miss and returns PRODUCT_NOT_FOUND', async () => {
    process.env.TANSHU_API_KEY = 'test-key'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          code: 10001,
          msg: '未找到商品',
        }),
      ),
    )

    const db = createDatabase(dbPath)
    const response = await app.request('/api/products/barcode/0000000000000', {
      headers: { cookie },
    })
    expect(response.status).toBe(404)
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe(
      'PRODUCT_NOT_FOUND',
    )

    const misses = db
      .prepare(`SELECT COUNT(*) AS count FROM barcode_misses WHERE barcode = ?`)
      .get('0000000000000') as { count: number }
    expect(Number(misses.count)).toBe(1)
  })

  it('creates inventory item from product id snapshot', async () => {
    const db = createDatabase(dbPath)
    db.prepare(
      `INSERT INTO products (barcode, goods_name, brand, spec)
       VALUES ('6906337301091', '葱油压缩饼干', '冠生园', '118g')`,
    ).run()

    const item = createInventoryItem(db, 1, { productId: 1 })
    expect(item.goodsName).toBe('葱油压缩饼干')
    expect(item.productId).toBe(1)
    expect(item.barcode).toBe('6906337301091')
  })

  it('serves downloaded product images', async () => {
    process.env.TANSHU_API_KEY = 'test-key'
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          Response.json({
            code: 1,
            msg: '操作成功',
            data: {
              barcode: '6906337301092',
              goods_name: '测试商品',
              brand: '测试',
              company: '',
              category_code: '',
              category_name: '',
              image: 'https://example.com/product.png',
              spec: '',
              width: '',
              height: '',
              depth: '',
              gross_weight: '',
              net_weight: '',
              price: '',
              origin_country: '',
              first_ship_date: '',
              packaging_type: '',
              shelf_life: '',
              min_sales_unit: '',
              certification_standard: '',
              certificate_license: '',
            },
          }),
        )
        .mockResolvedValueOnce(new Response(Buffer.from('fake-image'), {
          status: 200,
          headers: { 'content-type': 'image/png' },
        })),
    )

    const lookup = await app.request('/api/products/barcode/6906337301092', {
      headers: { cookie },
    })
    const body = (await lookup.json()) as { product: { image: string } }
    const imagePath = body.product.image.replace('/api/uploads/products/', '')
    const image = await app.request(`/api/uploads/products/${imagePath}`)
    expect(image.status).toBe(200)
    expect(image.headers.get('content-type')).toBe('image/png')
    expect(Buffer.from(await image.arrayBuffer()).toString()).toBe('fake-image')
  })
})

describe('resolveProductByBarcode', () => {
  let dbPath = ''
  let uploadsDir = ''

  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), 'jiawucang-products-unit-'))
    dbPath = join(dir, 'test.sqlite')
    uploadsDir = join(dir, 'uploads')
  })

  afterEach(() => {
    rmSync(join(dbPath, '..'), { recursive: true, force: true })
    vi.unstubAllGlobals()
  })

  it('reads local product without upstream call', async () => {
    const db = createDatabase(dbPath)
    db.prepare(
      `INSERT INTO products (barcode, goods_name, brand)
       VALUES ('123', '本地商品', '本地品牌')`,
    ).run()

    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const result = await resolveProductByBarcode(db, '123', {
      apiKey: 'key',
      uploadsDir,
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.fromCache).toBe(true)
      expect(result.product.goodsName).toBe('本地商品')
    }
    expect(fetchMock).not.toHaveBeenCalled()
    expect(findProductByBarcode(db, '123')?.goodsName).toBe('本地商品')
  })
})
