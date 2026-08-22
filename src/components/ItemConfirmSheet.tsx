import { useEffect, useId, useState } from 'react'
import type { BarcodeProduct } from '../types/barcode'

type ItemConfirmSheetProps = {
  open: boolean
  barcode: string
  product: BarcodeProduct | null
  loading: boolean
  error: string | null
  saving: boolean
  onClose: () => void
  onConfirm: () => void
}

type Phase = 'closed' | 'entering' | 'open' | 'closing'

const EXIT_DURATION_MS = 360

export function ItemConfirmSheet({
  open,
  barcode,
  product,
  loading,
  error,
  saving,
  onClose,
  onConfirm,
}: ItemConfirmSheetProps) {
  const titleId = useId()
  const [phase, setPhase] = useState<Phase>(open ? 'open' : 'closed')
  const [prevOpen, setPrevOpen] = useState(open)

  if (prevOpen !== open) {
    setPrevOpen(open)
    setPhase(open ? 'entering' : 'closing')
  }

  useEffect(() => {
    if (phase !== 'entering') return
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setPhase('open'))
    })
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  }, [phase])

  useEffect(() => {
    if (phase !== 'closing') return
    const timer = window.setTimeout(() => setPhase('closed'), EXIT_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [phase])

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !saving) onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, saving])

  if (phase === 'closed') return null

  return (
    <div
      className={phase === 'open' ? 'scan-sheet is-open' : 'scan-sheet'}
      role="presentation"
      style={{ zIndex: 45 }}
    >
      <button
        type="button"
        className="scan-sheet__backdrop"
        aria-label="关闭弹窗"
        onClick={saving ? undefined : onClose}
        disabled={saving}
      />
      <div
        className="scan-sheet__panel item-confirm-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="scan-sheet__header">
          <h2 id={titleId} className="scan-sheet__title">
            确认入库
          </h2>
          <button
            type="button"
            className="scan-sheet__close"
            aria-label="关闭"
            onClick={onClose}
            disabled={saving}
          >
            ×
          </button>
        </header>

        <div className="item-confirm-sheet__body">
          <p className="item-confirm-sheet__barcode">条形码：{barcode}</p>

          {loading ? (
            <p className="item-confirm-sheet__status" role="status">
              正在查询商品信息…
            </p>
          ) : null}

          {error ? (
            <p className="item-confirm-sheet__error" role="alert">
              {error}
            </p>
          ) : null}

          {product ? (
            <dl className="item-confirm-sheet__product">
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
            </dl>
          ) : null}
        </div>

        <div className="item-confirm-sheet__actions">
          <button
            type="button"
            className="submit-btn item-confirm-sheet__cancel"
            onClick={onClose}
            disabled={saving}
          >
            取消
          </button>
          <button
            type="button"
            className="submit-btn"
            onClick={onConfirm}
            disabled={saving || loading || !product || Boolean(error)}
          >
            {saving ? '入库中…' : '确认入库'}
          </button>
        </div>
      </div>
    </div>
  )
}
