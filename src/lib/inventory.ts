import type { InventoryItem, InventoryItemInput } from '../types'

export const STORAGE_KEY = 'jiawucang.inventory.v1'

export function createItem(input: InventoryItemInput): InventoryItem {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    location: input.location.trim(),
    quantity: Math.max(1, Math.floor(input.quantity) || 1),
    note: input.note.trim(),
    createdAt: now,
    updatedAt: now,
  }
}

export function loadItems(): InventoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as InventoryItem[]
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

export function saveItems(items: InventoryItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function upsertItem(
  items: InventoryItem[],
  input: InventoryItemInput,
  editingId?: string | null,
): InventoryItem[] {
  if (editingId) {
    return items.map((item) =>
      item.id === editingId
        ? {
            ...item,
            name: input.name.trim(),
            location: input.location.trim(),
            quantity: Math.max(1, Math.floor(input.quantity) || 1),
            note: input.note.trim(),
            updatedAt: new Date().toISOString(),
          }
        : item,
    )
  }
  return [createItem(input), ...items]
}

export function removeItem(items: InventoryItem[], id: string): InventoryItem[] {
  return items.filter((item) => item.id !== id)
}

export function filterItems(
  items: InventoryItem[],
  query: string,
): InventoryItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter((item) => {
    const haystack = `${item.name} ${item.location} ${item.note}`.toLowerCase()
    return haystack.includes(q)
  })
}
