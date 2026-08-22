import { useEffect, useId, useState, type FormEvent } from 'react'
import { TextField } from './TextField'

type ManualAddSheetProps = {
  open: boolean
  saving: boolean
  error: string | null
  onClose: () => void
  onSubmit: (input: {
    goodsName: string
    brand: string
    spec: string
  }) => void
}

type Phase = 'closed' | 'entering' | 'open' | 'closing'

const EXIT_DURATION_MS = 360

export function ManualAddSheet({
  open,
  saving,
  error,
  onClose,
  onSubmit,
}: ManualAddSheetProps) {
  const titleId = useId()
  const [phase, setPhase] = useState<Phase>(open ? 'open' : 'closed')
  const [prevOpen, setPrevOpen] = useState(open)
  const [goodsName, setGoodsName] = useState('')
  const [brand, setBrand] = useState('')
  const [spec, setSpec] = useState('')
  const [fieldError, setFieldError] = useState('')

  if (prevOpen !== open) {
    setPrevOpen(open)
    setPhase(open ? 'entering' : 'closing')
    if (open) {
      setGoodsName('')
      setBrand('')
      setSpec('')
      setFieldError('')
    }
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = goodsName.trim()
    if (!trimmed) {
      setFieldError('请输入商品名称')
      return
    }
    setFieldError('')
    onSubmit({ goodsName: trimmed, brand: brand.trim(), spec: spec.trim() })
  }

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
        className="scan-sheet__panel manual-add-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="scan-sheet__header">
          <h2 id={titleId} className="scan-sheet__title">
            手动添加
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

        <form className="manual-add-sheet__form" onSubmit={handleSubmit}>
          <TextField
            id="manual-goods-name"
            label="商品名称"
            value={goodsName}
            onValueChange={(value) => {
              setGoodsName(value)
              if (fieldError) setFieldError('')
            }}
            placeholder="例如 洗衣液"
            autoComplete="off"
            error={fieldError}
            required
          />
          <TextField
            id="manual-brand"
            label="品牌（选填）"
            value={brand}
            onValueChange={setBrand}
            placeholder="例如 蓝月亮"
            autoComplete="off"
          />
          <TextField
            id="manual-spec"
            label="规格（选填）"
            value={spec}
            onValueChange={setSpec}
            placeholder="例如 2kg"
            autoComplete="off"
          />

          {error ? (
            <p className="manual-add-sheet__error" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" className="submit-btn" disabled={saving}>
            {saving ? '入库中…' : '确认入库'}
          </button>
        </form>
      </div>
    </div>
  )
}
