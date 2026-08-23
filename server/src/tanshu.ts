export type TanshuBarcodeProduct = {
  barcode: string
  brand: string
  goods_name: string
  company: string
  category_code: string
  category_name: string
  image: string
  spec: string
  width: string
  height: string
  depth: string
  gross_weight: string
  net_weight: string
  price: string
  origin_country: string
  first_ship_date: string
  packaging_type: string
  shelf_life: string
  min_sales_unit: string
  certification_standard: string
  certificate_license: string
  keyword?: string
  goods_type?: string
  remark?: string
}

export type TanshuLookupResult =
  | { ok: true; data: TanshuBarcodeProduct }
  | { ok: false; message: string; code?: number }

const TANSHU_BARCODE_ENDPOINT =
  'https://api2.tanshuapi.com/api/barcode/v1/index'

export async function lookupTanshuBarcode(
  barcode: string,
  apiKey: string,
): Promise<TanshuLookupResult> {
  const trimmed = barcode.trim()
  if (!trimmed) {
    return { ok: false, message: '请输入条形码' }
  }
  if (!apiKey.trim()) {
    return { ok: false, message: '未配置 TANSHU_API_KEY' }
  }

  const url = new URL(TANSHU_BARCODE_ENDPOINT)
  url.searchParams.set('key', apiKey.trim())
  url.searchParams.set('barcode', trimmed)

  let response: Response
  try {
    response = await fetch(url)
  } catch {
    return { ok: false, message: '无法连接探数 API，请稍后重试' }
  }

  let payload: { code?: number; msg?: string; data?: TanshuBarcodeProduct }
  try {
    payload = (await response.json()) as typeof payload
  } catch {
    return { ok: false, message: '探数 API 返回格式无效' }
  }

  if (payload.code !== 1 || !payload.data) {
    return {
      ok: false,
      message: payload.msg || '未找到该条形码对应的商品',
      code: payload.code,
    }
  }

  return { ok: true, data: payload.data }
}
