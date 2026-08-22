import { useId, useState, type InputHTMLAttributes } from 'react'
import type { ReactNode } from 'react'

type TextFieldProps = {
  /** 无障碍名称；默认 sr-only，showLabel 为 true 时在输入框上方展示 */
  label: string
  value: string
  onValueChange: (value: string) => void
  /** 报错文案；非空时高亮描边并展示（布局高度恒定，不会跳动） */
  error?: string
  /** 左侧图标 */
  icon?: ReactNode
  /** 密码输入框显示「显示/隐藏」切换按钮 */
  allowReveal?: boolean
  /** 只读：不可编辑，并使用专用样式 */
  readOnly?: boolean
  /** 在输入框上方展示字段名称 */
  showLabel?: boolean
} & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'className' | 'children' | 'readOnly'
>

/**
 * 通用输入框控件：复用登录/注册页的布局与交互
 * （灰底圆角、sr-only label、预留高度的错误行、错误红描边、聚焦深色描边）。
 */
export function TextField({
  label,
  value,
  onValueChange,
  error,
  icon,
  allowReveal = false,
  readOnly = false,
  showLabel = false,
  type = 'text',
  id,
  ...inputProps
}: TextFieldProps) {
  const autoId = useId()
  const errorId = useId()
  const inputId = id ?? autoId
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword && allowReveal && revealed ? 'text' : type
  const invalid = Boolean(error)

  const fieldClassName = [
    'field',
    invalid ? 'is-error' : '',
    readOnly ? 'is-readonly' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={showLabel ? 'field-block field-block--labeled' : 'field-block'}>
      {showLabel ? (
        <label className="field-label" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <label className={fieldClassName} htmlFor={inputId}>
        {!showLabel ? <span className="sr-only">{label}</span> : null}
        {icon ? (
          <span className="field__icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <input
          id={inputId}
          type={inputType}
          value={value}
          readOnly={readOnly}
          aria-invalid={invalid}
          aria-describedby={errorId}
          onChange={(event) => {
            if (!readOnly) onValueChange(event.target.value)
          }}
          {...inputProps}
        />
        {isPassword && allowReveal ? (
          <button
            type="button"
            className="field__action"
            aria-label={revealed ? `隐藏${label}` : `显示${label}`}
            aria-pressed={revealed}
            onClick={() => setRevealed((current) => !current)}
          >
            {revealed ? <EyeIcon /> : <EyeOffIcon />}
          </button>
        ) : null}
      </label>
      <p
        id={errorId}
        className={invalid ? 'field-error is-visible' : 'field-error'}
        role={invalid ? 'alert' : undefined}
      >
        {error ?? ''}
      </p>
    </div>
  )
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path
        d="M3.5 12s3.2-6 8.5-6 8.5 6 8.5 6-3.2 6-8.5 6-8.5-6-8.5-6Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4 20 20 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path
        d="M3.5 12s3.2-6 8.5-6 8.5 6 8.5 6-3.2 6-8.5 6-8.5-6-8.5-6Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}
