import type { DatabaseSync } from 'node:sqlite'
import type { TanshuBarcodeProduct } from './tanshu.ts'

export type InventoryItemRow = {
  id: number
  user_id: number
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
  barcode?: string | null
  goodsName: string
  brand?: string
  spec?: string
  categoryName?: string
  company?: string
  image?: string
  shelfLife?: string
  originCountry?: string
}

const ITEM_SELECT = `SELECT id, user_id, barcode, goods_name, brand, spec,
                            category_name, company, image, shelf_life,
                            origin_country, created_at
                     FROM inventory_items`

export function ensureInventoryTables(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
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
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_inventory_items_user_id
      ON inventory_items(user_id);
  `)
}

export function toInventoryItem(row: InventoryItemRow): InventoryItem {
  return {
    id: row.id,
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

export function createInventoryItem(
  db: DatabaseSync,
  userId: number,
  input: CreateInventoryItemInput,
): InventoryItem {
  const goodsName = input.goodsName.trim()
  if (!goodsName) {
    throw new Error('GOODS_NAME_REQUIRED')
  }

  const row = db
    .prepare(
      `INSERT INTO inventory_items (
         user_id, barcode, goods_name, brand, spec, category_name,
         company, image, shelf_life, origin_country
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id, user_id, barcode, goods_name, brand, spec,
                 category_name, company, image, shelf_life,
                 origin_country, created_at`,
    )
    .get(
      userId,
      input.barcode?.trim() || null,
      goodsName,
      input.brand?.trim() ?? '',
      input.spec?.trim() ?? '',
      input.categoryName?.trim() ?? '',
      input.company?.trim() ?? '',
      input.image?.trim() ?? '',
      input.shelfLife?.trim() ?? '',
      input.originCountry?.trim() ?? '',
    ) as InventoryItemRow

  return toInventoryItem(row)
}

export function createInventoryItemFromBarcodeProduct(
  userId: number,
  product: TanshuBarcodeProduct,
): CreateInventoryItemInput {
  return {
    barcode: product.barcode,
    goodsName: product.goods_name,
    brand: product.brand,
    spec: product.spec,
    categoryName: product.category_name,
    company: product.company,
    image: product.image,
    shelfLife: product.shelf_life,
    originCountry: product.origin_country,
  }
}
