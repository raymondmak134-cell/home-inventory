import { useId, useRef, useState } from 'react'
import { useClickOutside } from '../hooks/useClickOutside'

type SelectFieldProps = {
  label: string
  showLabel?: boolean
  value: string
  onValueChange: (value: string) => void
  error?: string
  options: readonly { value: string; label: string }[]
  placeholder?: string
  disabled?: boolean
}

/**
 * 通用下拉选择控件：自定义选项面板，复用登录页输入框视觉风格。
 */
export function SelectField({
  label,
  showLabel = false,
  value,
  onValueChange,
  error,
  options,
  placeholder = '请选择',
  disabled = false,
}: SelectFieldProps) {
  const triggerId = useId()
  const listboxId = useId()
  const errorId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const invalid = Boolean(error)
  const [open, setOpen] = useState(false)

  useClickOutside(rootRef, () => setOpen(false), open && !disabled)

  const selected = options.find((option) => option.value === value)

  function choose(nextValue: string) {
    onValueChange(nextValue)
    setOpen(false)
  }

  return (
    <div className={showLabel ? 'field-block field-block--labeled' : 'field-block'}>
      {showLabel ? (
        <label className="field-label" htmlFor={triggerId}>
          {label}
        </label>
      ) : null}
      <div className="field-picker" ref={rootRef}>
        <button
          id={triggerId}
          type="button"
          className={
            invalid
              ? 'field field-picker__trigger is-error'
              : 'field field-picker__trigger'
          }
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-invalid={invalid}
          aria-describedby={errorId}
          disabled={disabled}
          onClick={() => {
            if (!disabled) setOpen((current) => !current)
          }}
        >
          {!showLabel ? <span className="sr-only">{label}</span> : null}
          <span
            className={
              selected ? 'field-picker__value' : 'field-picker__placeholder'
            }
          >
            {selected?.label ?? placeholder}
          </span>
          <ChevronDownIcon />
        </button>

        {open ? (
          <ul id={listboxId} className="field-picker__menu" role="listbox" aria-label={label}>
            {options.map((option) => {
              const isSelected = option.value === value
              return (
                <li key={option.value} role="presentation">
                  <button
                    type="button"
                    className={
                      isSelected
                        ? 'field-picker__option is-selected'
                        : 'field-picker__option'
                    }
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => choose(option.value)}
                  >
                    {option.label}
                  </button>
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>
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

function ChevronDownIcon() {
  return (
    <svg
      className="field-picker__icon"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m7 10 5 5 5-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
