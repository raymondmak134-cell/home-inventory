import type { TanshuBarcodeResponse } from '../types/barcode'

export class BarcodeApiError extends Error {
  code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'BarcodeApiError'
    this.code = code
  }
}

export async function fetchBarcodeProduct(barcode: string) {
  const trimmed = barcode.trim()
  if (!trimmed) {
    throw new BarcodeApiError('请输入条形码')
  }

  const response = await fetch(
    `/api/barcode?barcode=${encodeURIComponent(trimmed)}`,
    { credentials: 'include' },
  )

  const payload = (await response.json()) as TanshuBarcodeResponse

  if (!response.ok || 'error' in payload) {
    const message =
      'error' in payload
        ? payload.error.message
        : `请求失败（${response.status}）`
    const code = 'error' in payload ? payload.error.code : undefined
    throw new BarcodeApiError(message, code)
  }

  return payload
}
