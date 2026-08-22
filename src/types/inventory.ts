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
