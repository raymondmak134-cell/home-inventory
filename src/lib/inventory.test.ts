import { describe, expect, it } from 'vitest'
import {
  createItem,
  filterItems,
  removeItem,
  upsertItem,
} from './inventory'

describe('inventory helpers', () => {
  it('creates an item with trimmed fields', () => {
    const item = createItem({
      name: ' 备用电池 ',
      location: ' 玄关抽屉 ',
      quantity: 2.8,
      note: ' 碱性 ',
    })

    expect(item.name).toBe('备用电池')
    expect(item.location).toBe('玄关抽屉')
    expect(item.quantity).toBe(2)
    expect(item.note).toBe('碱性')
    expect(item.id).toBeTruthy()
  })

  it('upserts and removes items', () => {
    const created = upsertItem([], {
      name: '雨伞',
      location: '门口',
      quantity: 1,
      note: '',
    })
    expect(created).toHaveLength(1)

    const updated = upsertItem(
      created,
      {
        name: '折叠伞',
        location: '门口鞋柜',
        quantity: 2,
        note: '黑色',
      },
      created[0].id,
    )
    expect(updated[0].name).toBe('折叠伞')
    expect(updated[0].quantity).toBe(2)

    expect(removeItem(updated, created[0].id)).toHaveLength(0)
  })

  it('filters by name, location, or note', () => {
    const items = [
      createItem({ name: '充电器', location: '卧室', quantity: 1, note: 'Type-C' }),
      createItem({ name: '手电筒', location: '厨房', quantity: 1, note: '' }),
    ]

    expect(filterItems(items, '卧室')).toHaveLength(1)
    expect(filterItems(items, 'type-c')).toHaveLength(1)
    expect(filterItems(items, '不存在')).toHaveLength(0)
  })
})
