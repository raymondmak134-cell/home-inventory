import type { InventoryItem } from '../types/inventory'

type InventoryListProps = {
  items: InventoryItem[]
  onAddItem: () => void
}

export function InventoryList({ items, onAddItem }: InventoryListProps) {
  return (
    <section className="inventory-list" aria-labelledby="inventory-title">
      <div className="inventory-list__header">
        <div>
          <h1 id="inventory-title" className="inventory-list__title">
            我的家仓
          </h1>
          <p className="inventory-list__count">共 {items.length} 件物品</p>
        </div>
        <button type="button" className="submit-btn inventory-list__add" onClick={onAddItem}>
          扫码入库
        </button>
      </div>

      <ul className="inventory-list__items">
        {items.map((item) => (
          <li key={item.id} className="inventory-list__item">
            <div className="inventory-list__item-main">
              <p className="inventory-list__item-name">{item.goodsName}</p>
              <p className="inventory-list__item-meta">
                {[item.brand, item.spec].filter(Boolean).join(' · ') || '—'}
              </p>
            </div>
            {item.barcode ? (
              <p className="inventory-list__item-barcode">{item.barcode}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
