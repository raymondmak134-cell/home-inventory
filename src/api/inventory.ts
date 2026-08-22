import type { CreateInventoryItemInput, InventoryItem } from '../types/inventory'

export class InventoryApiError extends Error {
  code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'InventoryApiError'
    this.code = code
  }
}

type ApiErrorBody = {
  error?: { code?: string; message?: string }
}

async function readApiError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as ApiErrorBody
    if (body.error?.message) {
      throw new InventoryApiError(body.error.message, body.error.code)
    }
  } catch (error) {
    if (error instanceof InventoryApiError) throw error
  }
  throw new InventoryApiError(fallback)
}

export async function fetchInventoryItems(): Promise<InventoryItem[]> {
  const response = await fetch('/api/inventory/items', {
    credentials: 'include',
  })
  if (!response.ok) {
    await readApiError(response, '加载物品失败')
  }
  const body = (await response.json()) as { items: InventoryItem[] }
  return body.items
}

export async function createInventoryItem(
  input: CreateInventoryItemInput,
): Promise<InventoryItem> {
  const response = await fetch('/api/inventory/items', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    await readApiError(response, '入库失败')
  }
  const body = (await response.json()) as { item: InventoryItem }
  return body.item
}

export async function createInventoryItemFromProduct(
  productId: number,
): Promise<InventoryItem> {
  return createInventoryItem({ productId })
}
