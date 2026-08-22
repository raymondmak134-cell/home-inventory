import { useId, type SelectHTMLAttributes } from 'react'

type SelectFieldProps = {
  label: string
  value: string
  onValueChange: (value: string) => void
  error?: string
  options: readonly { value: string; label: string }[]
  placeholder?: string
} & Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'value' | 'onChange' | 'className' | 'children'
>

/**
 * 通用下拉选择控件：复用登录页输入框的视觉风格。
 */
export function SelectField({
  label,
  value,
  onValueChange,
  error,
  options,
  placeholder = '请选择',
  id,
  ...selectProps
}: SelectFieldProps) {
  const autoId = useId()
  const errorId = useId()
  const selectId = id ?? autoId
  const invalid = Boolean(error)

  return (
    <div className="field-block">
      <label className={invalid ? 'field is-error' : 'field'} htmlFor={selectId}>
        <span className="sr-only">{label}</span>
        <select
          id={selectId}
          value={value}
          aria-invalid={invalid}
          aria-describedby={errorId}
          onChange={(event) => onValueChange(event.target.value)}
          {...selectProps}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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
