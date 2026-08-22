export interface BarcodeProduct {
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

export interface TanshuBarcodeSuccess {
  code: 1
  msg: string
  data: BarcodeProduct
}

export interface TanshuBarcodeFailure {
  error: {
    code: string
    message: string
  }
}

export type TanshuBarcodeResponse = TanshuBarcodeSuccess | TanshuBarcodeFailure
