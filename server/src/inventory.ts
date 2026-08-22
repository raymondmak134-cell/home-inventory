import type { DatabaseSync } from 'node:sqlite'
import { findProductById, type Product } from './products.ts'

export type InventoryItemRow = {
  id: number
  user_id: number
  product_id: number | null
  barcode: string | null
  goods_name: string
  brand: string
  spec: string
  category_name: string
  company: string
  image: string
  shelf_life: string
  origin_country: string
  created_at: string
}

export type InventoryItem = {
  id: number
  productId: number | null
  barcode: string | null
  goodsName: string
  brand: string
  spec: string
  categoryName: string
  company: string
  image: string
  shelfLife: string
  originCountry: string
  createdAt: string
}

export type CreateInventoryItemInput = {
  productId?: number
  barcode?: string | null
  goodsName?: string
  brand?: string
  spec?: string
  categoryName?: string
  company?: string
  image?: string
  shelfLife?: string
  originCountry?: string
}

const ITEM_SELECT = `SELECT id, user_id, product_id, barcode, goods_name, brand, spec,
                            category_name, company, image, shelf_life,
                            origin_country, created_at
                     FROM inventory_items`

export function ensureInventoryTables(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER,
      barcode TEXT,
      goods_name TEXT NOT NULL,
      brand TEXT NOT NULL DEFAULT '',
      spec TEXT NOT NULL DEFAULT '',
      category_name TEXT NOT NULL DEFAULT '',
      company TEXT NOT NULL DEFAULT '',
      image TEXT NOT NULL DEFAULT '',
      shelf_life TEXT NOT NULL DEFAULT '',
      origin_country TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_inventory_items_user_id
      ON inventory_items(user_id);
  `)

  const columns = db.prepare(`PRAGMA table_info(inventory_items)`).all() as Array<{
    name: string
  }>
  if (!columns.some((column) => column.name === 'product_id')) {
    db.exec(`ALTER TABLE inventory_items ADD COLUMN product_id INTEGER`)
  }
}

export function toInventoryItem(row: InventoryItemRow): InventoryItem {
  return {
    id: row.id,
    productId: row.product_id,
    barcode: row.barcode,
    goodsName: row.goods_name,
    brand: row.brand,
    spec: row.spec,
    categoryName: row.category_name,
    company: row.company,
    image: row.image,
    shelfLife: row.shelf_life,
    originCountry: row.origin_country,
    createdAt: row.created_at,
  }
}

export function listInventoryItems(
  db: DatabaseSync,
  userId: number,
): InventoryItem[] {
  const rows = db
    .prepare(
      `${ITEM_SELECT}
       WHERE user_id = ?
       ORDER BY datetime(created_at) DESC, id DESC`,
    )
    .all(userId) as InventoryItemRow[]
  return rows.map(toInventoryItem)
}

function inventoryInputFromProduct(product: Product): Required<
  Pick<
    CreateInventoryItemInput,
    | 'barcode'
    | 'goodsName'
    | 'brand'
    | 'spec'
    | 'categoryName'
    | 'company'
    | 'image'
    | 'shelfLife'
    | 'originCountry'
  >
> {
  return {
    barcode: product.barcode,
    goodsName: product.goodsName,
    brand: product.brand,
    spec: product.spec,
    categoryName: product.categoryName,
    company: product.company,
    image: product.image,
    shelfLife: product.shelfLife,
    originCountry: product.originCountry,
  }
}

export function createInventoryItem(
  db: DatabaseSync,
  userId: number,
  input: CreateInventoryItemInput,
): InventoryItem {
  let productId = input.productId ?? null
  let snapshot = {
    barcode: input.barcode?.trim() || null,
    goodsName: input.goodsName?.trim() ?? '',
    brand: input.brand?.trim() ?? '',
    spec: input.spec?.trim() ?? '',
    categoryName: input.categoryName?.trim() ?? '',
    company: input.company?.trim() ?? '',
    image: input.image?.trim() ?? '',
    shelfLife: input.shelfLife?.trim() ?? '',
    originCountry: input.originCountry?.trim() ?? '',
  }

  if (productId) {
    const product = findProductById(db, productId)
    if (!product) {
      throw new Error('PRODUCT_NOT_FOUND')
    }
    snapshot = inventoryInputFromProduct(product)
  }

  if (!snapshot.goodsName) {
    throw new Error('GOODS_NAME_REQUIRED')
  }

  const row = db
    .prepare(
      `INSERT INTO inventory_items (
         user_id, product_id, barcode, goods_name, brand, spec, category_name,
         company, image, shelf_life, origin_country
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id, user_id, product_id, barcode, goods_name, brand, spec,
                 category_name, company, image, shelf_life,
                 origin_country, created_at`,
    )
    .get(
      userId,
      productId,
      snapshot.barcode,
      snapshot.goodsName,
      snapshot.brand,
      snapshot.spec,
      snapshot.categoryName,
      snapshot.company,
      snapshot.image,
      snapshot.shelfLife,
      snapshot.originCountry,
    ) as InventoryItemRow

  return toInventoryItem(row)
}
