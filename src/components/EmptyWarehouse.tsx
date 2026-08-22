type EmptyWarehouseProps = {
  onAddFirstItem?: () => void
}

export function EmptyWarehouse({ onAddFirstItem }: EmptyWarehouseProps) {
  return (
    <section className="empty-warehouse" aria-labelledby="empty-title">
      <div className="empty-warehouse__copy">
        <h1 id="empty-title" className="brand-name empty-warehouse__title">
          当前为空仓
        </h1>
        <p className="brand-tagline empty-warehouse__desc">请给家仓加个仓吧。</p>
      </div>

      <div className="empty-warehouse__action">
        <button
          type="button"
          className="submit-btn empty-warehouse__cta"
          onClick={onAddFirstItem}
        >
          入库家里第一件物品
        </button>
      </div>
    </section>
  )
}
