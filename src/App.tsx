import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { InventoryItem, InventoryItemInput } from './types'
import {
  filterItems,
  loadItems,
  removeItem,
  saveItems,
  upsertItem,
} from './lib/inventory'
import './App.css'

const emptyForm: InventoryItemInput = {
  name: '',
  location: '',
  quantity: 1,
  note: '',
}

function App() {
  const [items, setItems] = useState<InventoryItem[]>(() => loadItems())
  const [form, setForm] = useState<InventoryItemInput>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    saveItems(items)
  }, [items])

  const visibleItems = useMemo(
    () => filterItems(items, query),
    [items, query],
  )

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.name.trim() || !form.location.trim()) return
    setItems((current) => upsertItem(current, form, editingId))
    resetForm()
  }

  function startEdit(item: InventoryItem) {
    setEditingId(item.id)
    setForm({
      name: item.name,
      location: item.location,
      quantity: item.quantity,
      note: item.note,
    })
  }

  function handleDelete(id: string) {
    setItems((current) => removeItem(current, id))
    if (editingId === id) resetForm()
  }

  return (
    <div className="page">
      <div className="atmosphere" aria-hidden="true" />

      <header className="hero">
        <p className="brand">家物仓</p>
        <h1>把家里的东西，收进一个看得见的仓</h1>
        <p className="lede">
          记录物品、存放位置与数量，找东西不再翻箱倒柜。
        </p>
        <a className="cta" href="#inventory">
          开始登记
        </a>
        <div className="hero-visual" aria-hidden="true">
          <div className="shelf shelf-a" />
          <div className="shelf shelf-b" />
          <div className="bin bin-a" />
          <div className="bin bin-b" />
          <div className="bin bin-c" />
        </div>
      </header>

      <main id="inventory" className="workspace">
        <section className="compose" aria-labelledby="compose-title">
          <h2 id="compose-title">{editingId ? '编辑物品' : '登记物品'}</h2>
          <p>名称与位置必填，数量默认为 1。</p>

          <form className="item-form" onSubmit={handleSubmit}>
            <label>
              <span>名称</span>
              <input
                name="name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="例如：备用充电器"
                required
                autoComplete="off"
              />
            </label>

            <label>
              <span>位置</span>
              <input
                name="location"
                value={form.location}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    location: event.target.value,
                  }))
                }
                placeholder="例如：客厅抽屉"
                required
                autoComplete="off"
              />
            </label>

            <label>
              <span>数量</span>
              <input
                name="quantity"
                type="number"
                min={1}
                value={form.quantity}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    quantity: Number(event.target.value),
                  }))
                }
              />
            </label>

            <label className="full">
              <span>备注</span>
              <input
                name="note"
                value={form.note}
                onChange={(event) =>
                  setForm((current) => ({ ...current, note: event.target.value }))
                }
                placeholder="可选：品牌、颜色、用途"
                autoComplete="off"
              />
            </label>

            <div className="form-actions">
              <button type="submit">{editingId ? '保存修改' : '加入家物仓'}</button>
              {editingId ? (
                <button type="button" className="ghost" onClick={resetForm}>
                  取消
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="catalog" aria-labelledby="catalog-title">
          <div className="catalog-head">
            <div>
              <h2 id="catalog-title">仓内物品</h2>
              <p>
                共 {items.length} 件
                {query.trim() ? `，匹配 ${visibleItems.length} 件` : ''}
              </p>
            </div>
            <label className="search">
              <span className="sr-only">搜索</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索名称、位置或备注"
              />
            </label>
          </div>

          {visibleItems.length === 0 ? (
            <p className="empty">
              {items.length === 0
                ? '仓里还是空的，先登记第一件物品吧。'
                : '没有匹配的物品，试试换个关键词。'}
            </p>
          ) : (
            <ul className="item-list">
              {visibleItems.map((item) => (
                <li key={item.id}>
                  <div className="item-main">
                    <h3>{item.name}</h3>
                    <p>
                      <span>{item.location}</span>
                      <span aria-hidden="true"> · </span>
                      <span>×{item.quantity}</span>
                    </p>
                    {item.note ? <p className="note">{item.note}</p> : null}
                  </div>
                  <div className="item-actions">
                    <button type="button" className="ghost" onClick={() => startEdit(item)}>
                      编辑
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => handleDelete(item.id)}
                    >
                      删除
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
