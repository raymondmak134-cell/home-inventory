import type { ProductLookupFailure, ProductLookupSuccess } from '../types/product'

export class ProductApiError extends Error {
  code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'ProductApiError'
    this.code = code
  }
}

export function isProductNotFound(error: unknown): boolean {
  return error instanceof ProductApiError && error.code === 'PRODUCT_NOT_FOUND'
}

export async function fetchProductByBarcode(barcode: string) {
  const trimmed = barcode.trim()
  if (!trimmed) {
    throw new ProductApiError('请输入条形码', 'INVALID_BARCODE')
  }

  const response = await fetch(
    `/api/products/barcode/${encodeURIComponent(trimmed)}`,
    { credentials: 'include' },
  )

  const payload = (await response.json()) as
    | ProductLookupSuccess
    | ProductLookupFailure

  if (!response.ok || 'error' in payload) {
    const message =
      'error' in payload
        ? payload.error.message
        : `请求失败（${response.status}）`
    const code = 'error' in payload ? payload.error.code : undefined
    throw new ProductApiError(message, code)
  }

  return payload
}
