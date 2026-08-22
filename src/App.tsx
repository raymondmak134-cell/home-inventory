import { useState, type FormEvent } from 'react'
import { BarcodeApiError, fetchBarcodeProduct } from './api/barcode'
import type { BarcodeProduct } from './types/barcode'
import './index.css'

export default function App() {
  const [barcode, setBarcode] = useState('6906337301091')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [product, setProduct] = useState<BarcodeProduct | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setProduct(null)

    try {
      const result = await fetchBarcodeProduct(barcode)
      setProduct(result.data)
    } catch (caught) {
      if (caught instanceof BarcodeApiError) {
        setError(caught.message)
      } else {
        setError('查询失败，请稍后重试')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="app">
      <header className="app__header">
        <h1>家物仓</h1>
        <p>扫描或输入条形码，自动获取商品信息。</p>
      </header>

      <section className="card">
        <h2>条形码查询（探数 API）</h2>
        <form className="barcode-form" onSubmit={handleSubmit}>
          <label htmlFor="barcode">条形码</label>
          <div className="barcode-form__row">
            <input
              id="barcode"
              name="barcode"
              value={barcode}
              onChange={(event) => setBarcode(event.target.value)}
              placeholder="例如 6906337301091"
              autoComplete="off"
            />
            <button type="submit" disabled={loading}>
              {loading ? '查询中…' : '查询'}
            </button>
          </div>
        </form>

        {error ? <p className="message message--error">{error}</p> : null}

        {product ? (
          <dl className="product">
            <div>
              <dt>商品名称</dt>
              <dd>{product.goods_name || '—'}</dd>
            </div>
            <div>
              <dt>品牌</dt>
              <dd>{product.brand || '—'}</dd>
            </div>
            <div>
              <dt>规格</dt>
              <dd>{product.spec || '—'}</dd>
            </div>
            <div>
              <dt>分类</dt>
              <dd>{product.category_name || '—'}</dd>
            </div>
            <div>
              <dt>生产企业</dt>
              <dd>{product.company || '—'}</dd>
            </div>
            <div>
              <dt>原产国</dt>
              <dd>{product.origin_country || '—'}</dd>
            </div>
            <div>
              <dt>保质期</dt>
              <dd>{product.shelf_life || '—'}</dd>
            </div>
            {product.image ? (
              <div>
                <dt>商品图片</dt>
                <dd>
                  <img
                    className="product__image"
                    src={product.image}
                    alt={product.goods_name}
                  />
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </section>

      <p className="hint">
        首次使用前，请按 README 配置 <code>TANSHU_API_KEY</code>。
      </p>
    </main>
  )
}
