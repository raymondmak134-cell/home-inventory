import type { TanshuBarcodeResponse, TanshuBarcodeSuccess } from '../types/barcode'

export class BarcodeApiError extends Error {
  code?: number

  constructor(message: string, code?: number) {
    super(message)
    this.name = 'BarcodeApiError'
    this.code = code
  }
}

export async function fetchBarcodeProduct(
  barcode: string,
): Promise<TanshuBarcodeSuccess> {
  const trimmed = barcode.trim()
  if (!trimmed) {
    throw new BarcodeApiError('请输入条形码')
  }

  const response = await fetch(
    `/api/barcode?barcode=${encodeURIComponent(trimmed)}`,
  )

  if (!response.ok) {
    let message = `请求失败（${response.status}）`
    try {
      const body = (await response.json()) as { error?: string }
      if (body.error) message = body.error
    } catch {
      // ignore non-JSON error bodies
    }
    throw new BarcodeApiError(message)
  }

  const payload = (await response.json()) as TanshuBarcodeResponse

  if (payload.code !== 1) {
    throw new BarcodeApiError(payload.msg || '查询失败', payload.code)
  }

  return payload as TanshuBarcodeSuccess
}
