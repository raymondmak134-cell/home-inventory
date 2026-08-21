export type InventoryItem = {
  id: string
  name: string
  location: string
  quantity: number
  note: string
  createdAt: string
  updatedAt: string
}

export type InventoryItemInput = {
  name: string
  location: string
  quantity: number
  note: string
}
