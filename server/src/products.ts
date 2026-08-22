import { createWriteStream, existsSync, mkdirSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { pipeline } from 'node:stream/promises'
import type { DatabaseSync } from 'node:sqlite'
import { lookupTanshuBarcode, type TanshuBarcodeProduct } from './tanshu.ts'

export type ProductRow = {
  id: number
  barcode: string
  goods_name: string
  brand: string
  spec: string
  category_name: string
  company: string
  image_path: string
  shelf_life: string
  origin_country: string
  source: string
  created_at: string
  updated_at: string
}

export type Product = {
  id: number
  barcode: string
  goodsName: string
  brand: string
  spec: string
  categoryName: string
  company: string
  image: string
  shelfLife: string
  originCountry: string
  source: string
  createdAt: string
  updatedAt: string
}

export type ProductLookupResult =
  | { ok: true; product: Product; fromCache: boolean }
  | { ok: false; code: 'PRODUCT_NOT_FOUND' | 'INVALID_BARCODE' | 'UPSTREAM_ERROR'; message: string }

const PRODUCT_SELECT = `SELECT id, barcode, goods_name, brand, spec, category_name,
                                 company, image_path, shelf_life, origin_country,
                                 source, created_at, updated_at
                          FROM products`

export function resolveUploadsDir(): string {
  if (process.env.UPLOADS_PATH) {
    return resolve(process.env.UPLOADS_PATH)
  }
  return resolve(process.cwd(), 'data', 'uploads')
}

export function ensureProductTables(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode TEXT NOT NULL UNIQUE,
      goods_name TEXT NOT NULL,
      brand TEXT NOT NULL DEFAULT '',
      spec TEXT NOT NULL DEFAULT '',
      category_name TEXT NOT NULL DEFAULT '',
      company TEXT NOT NULL DEFAULT '',
      image_path TEXT NOT NULL DEFAULT '',
      shelf_life TEXT NOT NULL DEFAULT '',
      origin_country TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'tanshu',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);

    CREATE TABLE IF NOT EXISTS barcode_misses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode TEXT NOT NULL,
      user_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_barcode_misses_barcode ON barcode_misses(barcode);
  `)
}

export function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    barcode: row.barcode,
    goodsName: row.goods_name,
    brand: row.brand,
    spec: row.spec,
    categoryName: row.category_name,
    company: row.company,
    image: row.image_path,
    shelfLife: row.shelf_life,
    originCountry: row.origin_country,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function findProductByBarcode(
  db: DatabaseSync,
  barcode: string,
): Product | undefined {
  const row = db
    .prepare(`${PRODUCT_SELECT} WHERE barcode = ?`)
    .get(barcode.trim()) as ProductRow | undefined
  return row ? toProduct(row) : undefined
}

export function findProductById(
  db: DatabaseSync,
  id: number,
): Product | undefined {
  const row = db.prepare(`${PRODUCT_SELECT} WHERE id = ?`).get(id) as
    | ProductRow
    | undefined
  return row ? toProduct(row) : undefined
}

export function recordBarcodeMiss(
  db: DatabaseSync,
  barcode: string,
  userId?: number,
): void {
  db.prepare(
    `INSERT INTO barcode_misses (barcode, user_id) VALUES (?, ?)`,
  ).run(barcode.trim(), userId ?? null)
}

function guessImageExtension(contentType: string | null, url: string): string {
  const type = (contentType ?? '').toLowerCase()
  if (type.includes('png')) return '.png'
  if (type.includes('webp')) return '.webp'
  if (type.includes('gif')) return '.gif'
  const fromUrl = extname(new URL(url).pathname).toLowerCase()
  if (/^\.(png|webp|gif|jpe?g)$/.test(fromUrl)) return fromUrl
  return '.jpg'
}

export async function downloadProductImage(
  barcode: string,
  imageUrl: string,
  uploadsDir: string,
): Promise<string | null> {
  const trimmed = imageUrl.trim()
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) return null

  try {
    const response = await fetch(trimmed)
    if (!response.ok) return null

    const productsDir = join(uploadsDir, 'products')
    mkdirSync(productsDir, { recursive: true })

    const extension = guessImageExtension(
      response.headers.get('content-type'),
      trimmed,
    )
    const filename = `${barcode}${extension}`
    const filepath = join(productsDir, filename)

    if (response.body) {
      await pipeline(response.body, createWriteStream(filepath))
    } else {
      const { writeFileSync } = await import('node:fs')
      writeFileSync(filepath, Buffer.from(await response.arrayBuffer()))
    }

    return `/api/uploads/products/${filename}`
  } catch {
    return null
  }
}

function insertProductFromTanshu(
  db: DatabaseSync,
  remote: TanshuBarcodeProduct,
  imagePath: string,
): Product {
  const row = db
    .prepare(
      `INSERT INTO products (
         barcode, goods_name, brand, spec, category_name, company,
         image_path, shelf_life, origin_country, source
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'tanshu')
       RETURNING id, barcode, goods_name, brand, spec, category_name,
                 company, image_path, shelf_life, origin_country,
                 source, created_at, updated_at`,
    )
    .get(
      remote.barcode.trim(),
      remote.goods_name.trim() || remote.barcode,
      remote.brand.trim(),
      remote.spec.trim(),
      remote.category_name.trim(),
      remote.company.trim(),
      imagePath,
      remote.shelf_life.trim(),
      remote.origin_country.trim(),
    ) as ProductRow

  return toProduct(row)
}

export async function resolveProductByBarcode(
  db: DatabaseSync,
  barcode: string,
  options: {
    apiKey: string
    uploadsDir: string
    userId?: number
  },
): Promise<ProductLookupResult> {
  const trimmed = barcode.trim()
  if (!trimmed) {
    return { ok: false, code: 'INVALID_BARCODE', message: '请输入条形码' }
  }

  const cached = findProductByBarcode(db, trimmed)
  if (cached) {
    return { ok: true, product: cached, fromCache: true }
  }

  const remote = await lookupTanshuBarcode(trimmed, options.apiKey)
  if (!remote.ok) {
    if (
      remote.message === '未配置 TANSHU_API_KEY' ||
      remote.message === '无法连接探数 API，请稍后重试' ||
      remote.message === '探数 API 返回格式无效'
    ) {
      return {
        ok: false,
        code: 'UPSTREAM_ERROR',
        message: remote.message,
      }
    }

    recordBarcodeMiss(db, trimmed, options.userId)
    return {
      ok: false,
      code: 'PRODUCT_NOT_FOUND',
      message: '未找到该条形码对应的商品，请手动添加',
    }
  }

  const imagePath =
    (await downloadProductImage(trimmed, remote.data.image, options.uploadsDir)) ??
    ''

  const product = insertProductFromTanshu(db, remote.data, imagePath)
  return { ok: true, product, fromCache: false }
}

export function resolveProductImagePath(
  uploadsDir: string,
  requestPath: string,
): string | null {
  const normalized = requestPath.replace(/^\/+/, '')
  const match = normalized.match(/^products\/([\w.-]+\.(?:jpe?g|png|webp|gif))$/i)
  if (!match) return null

  const filepath = join(uploadsDir, 'products', match[1]!)
  if (!existsSync(filepath)) return null
  return filepath
}

export function contentTypeForImagePath(filepath: string): string {
  const ext = extname(filepath).toLowerCase()
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.gif') return 'image/gif'
  return 'image/jpeg'
}
