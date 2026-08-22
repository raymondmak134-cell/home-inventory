import { useId } from 'react'

type QuantityStepperProps = {
  label: string
  showLabel?: boolean
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  error?: string
}

export function QuantityStepper({
  label,
  showLabel = false,
  value,
  onChange,
  min = 1,
  max = 999,
  error,
}: QuantityStepperProps) {
  const controlId = useId()
  const errorId = useId()
  const invalid = Boolean(error)

  function decrement() {
    onChange(Math.max(min, value - 1))
  }

  function increment() {
    onChange(Math.min(max, value + 1))
  }

  return (
    <div className={showLabel ? 'field-block field-block--labeled' : 'field-block'}>
      {showLabel ? (
        <label className="field-label" htmlFor={controlId}>
          {label}
        </label>
      ) : null}
      <div
        id={controlId}
        className={invalid ? 'quantity-stepper is-error' : 'quantity-stepper'}
        role="group"
        aria-label={label}
        aria-invalid={invalid}
        aria-describedby={errorId}
      >
        <button
          type="button"
          className="quantity-stepper__btn"
          aria-label="减少数量"
          onClick={decrement}
          disabled={value <= min}
        >
          <MinusIcon />
        </button>
        <span className="quantity-stepper__value" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          className="quantity-stepper__btn"
          aria-label="增加数量"
          onClick={increment}
          disabled={value >= max}
        >
          <PlusIcon />
        </button>
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

function MinusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M6 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M12 6v12M6 12h12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
