import { useEffect, useId } from 'react'

type ConfirmDialogProps = {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  confirming?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = '确定',
  cancelLabel = '取消',
  confirming = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId()
  const messageId = useId()

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !confirming) onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, confirming, onCancel])

  if (!open) return null

  return (
    <div className="confirm-dialog" role="presentation">
      <button
        type="button"
        className="confirm-dialog__backdrop"
        aria-label="关闭"
        disabled={confirming}
        onClick={onCancel}
      />
      <div
        className="confirm-dialog__panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
      >
        <h2 id={titleId} className="account-panel__title confirm-dialog__title">
          {title}
        </h2>
        <p id={messageId} className="brand-tagline confirm-dialog__message">
          {message}
        </p>
        <div className="confirm-dialog__actions">
          <button
            type="button"
            className="ghost-btn"
            onClick={onCancel}
            disabled={confirming}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="submit-btn confirm-dialog__confirm"
            onClick={onConfirm}
            disabled={confirming}
          >
            {confirming ? '处理中…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
