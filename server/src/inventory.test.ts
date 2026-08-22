import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from './app.ts'
import { createDatabase } from './db.ts'

process.env.SESSION_SECRET = 'test-session-secret-at-least-16'

function cookieFrom(response: Response): string | undefined {
  const headers = response.headers.getSetCookie?.() ?? []
  const session = headers.find((value) => value.startsWith('jiawucang_session='))
  return session?.split(';')[0]
}

describe('inventory api', () => {
  let dbPath = ''
  let app: ReturnType<typeof createApp>
  let cookie = ''

  beforeEach(async () => {
    const dir = mkdtempSync(join(tmpdir(), 'jiawucang-inv-'))
    dbPath = join(dir, 'test.sqlite')
    app = createApp(createDatabase(dbPath))

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

  it('lists and creates inventory items for the logged-in user', async () => {
    const empty = await app.request('/api/inventory/items', {
      headers: { cookie },
    })
    expect(empty.status).toBe(200)
    expect(((await empty.json()) as { items: unknown[] }).items).toEqual([])

    const created = await app.request('/api/inventory/items', {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({
        goodsName: '葱油压缩饼干',
        brand: '冠生园',
        spec: '118g',
        barcode: '6906337301091',
      }),
    })
    expect(created.status).toBe(201)
    const body = (await created.json()) as {
      item: { goodsName: string; barcode: string | null }
    }
    expect(body.item.goodsName).toBe('葱油压缩饼干')
    expect(body.item.barcode).toBe('6906337301091')

    const list = await app.request('/api/inventory/items', {
      headers: { cookie },
    })
    expect(((await list.json()) as { items: unknown[] }).items).toHaveLength(1)
  })

  it('proxies barcode lookup through TANSHU_API_KEY', async () => {
    process.env.TANSHU_API_KEY = 'test-key'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
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
      ),
    )

    const response = await app.request('/api/barcode?barcode=6906337301091', {
      headers: { cookie },
    })
    expect(response.status).toBe(200)
    const body = (await response.json()) as { data: { goods_name: string } }
    expect(body.data.goods_name).toBe('葱油压缩饼干')
  })
})
