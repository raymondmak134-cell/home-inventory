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

export type ProductLookupSuccess = {
  product: Product
  fromCache: boolean
}

export type ProductLookupFailure = {
  error: {
    code: string
    message: string
  }
}
