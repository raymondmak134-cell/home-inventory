import { useId, useRef, useState } from 'react'
import { useClickOutside } from '../hooks/useClickOutside'

type DatePickerFieldProps = {
  label: string
  showLabel?: boolean
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

export function DatePickerField({
  label,
  showLabel = false,
  value,
  onChange,
  placeholder = '请选择日期',
  error,
}: DatePickerFieldProps) {
  const triggerId = useId()
  const errorId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const invalid = Boolean(error)
  const [open, setOpen] = useState(false)

  const selectedDate = parseIsoDate(value)
  const initialView = selectedDate ?? new Date()
  const [viewYear, setViewYear] = useState(initialView.getFullYear())
  const [viewMonth, setViewMonth] = useState(initialView.getMonth())

  useClickOutside(rootRef, () => setOpen(false), open)

  function openPicker() {
    const base = selectedDate ?? new Date()
    setViewYear(base.getFullYear())
    setViewMonth(base.getMonth())
    setOpen(true)
  }

  function selectDay(day: number) {
    const next = formatIsoDate(new Date(viewYear, viewMonth, day))
    onChange(next)
    setOpen(false)
  }

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(next.getFullYear())
    setViewMonth(next.getMonth())
  }

  const days = buildCalendarDays(viewYear, viewMonth)
  const displayValue = value ? formatDisplayDate(value) : ''

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
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-invalid={invalid}
          aria-describedby={errorId}
          onClick={() => (open ? setOpen(false) : openPicker())}
        >
          {!showLabel ? <span className="sr-only">{label}</span> : null}
          <span
            className={
              displayValue ? 'field-picker__value' : 'field-picker__placeholder'
            }
          >
            {displayValue || placeholder}
          </span>
          <CalendarIcon />
        </button>

        {open ? (
          <div className="date-picker__panel" role="dialog" aria-label={`选择${label}`}>
            <div className="date-picker__header">
              <button
                type="button"
                className="date-picker__nav"
                aria-label="上一月"
                onClick={() => shiftMonth(-1)}
              >
                <ChevronLeftIcon />
              </button>
              <p className="date-picker__title">
                {viewYear}年{viewMonth + 1}月
              </p>
              <button
                type="button"
                className="date-picker__nav"
                aria-label="下一月"
                onClick={() => shiftMonth(1)}
              >
                <ChevronRightIcon />
              </button>
            </div>

            <div className="date-picker__weekdays" aria-hidden="true">
              {WEEKDAY_LABELS.map((weekday) => (
                <span key={weekday} className="date-picker__weekday">
                  {weekday}
                </span>
              ))}
            </div>

            <div className="date-picker__grid" role="grid">
              {days.map((day, index) => {
                if (day === null) {
                  return (
                    <span key={`empty-${index}`} className="date-picker__day is-empty" />
                  )
                }

                const iso = formatIsoDate(new Date(viewYear, viewMonth, day))
                const isSelected = value === iso
                const isToday = iso === formatIsoDate(new Date())

                return (
                  <button
                    key={iso}
                    type="button"
                    className={
                      isSelected
                        ? 'date-picker__day is-selected'
                        : isToday
                          ? 'date-picker__day is-today'
                          : 'date-picker__day'
                    }
                    role="gridcell"
                    aria-label={formatDisplayDate(iso)}
                    aria-selected={isSelected}
                    onClick={() => selectDay(day)}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </div>
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

function buildCalendarDays(year: number, month: number): Array<number | null> {
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: Array<number | null> = Array.from({ length: firstWeekday }, () => null)

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day)
  }

  while (cells.length % 7 !== 0) {
    cells.push(null)
  }

  return cells
}

function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  return date
}

function formatIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDisplayDate(value: string): string {
  const date = parseIsoDate(value)
  if (!date) return value
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

function CalendarIcon() {
  return (
    <svg
      className="field-picker__icon"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      aria-hidden="true"
    >
      <rect x="4" y="5.5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 3.5v4M16 3.5v4M4 10h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M14.5 6 9 12l5.5 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M9.5 6 15 12l-5.5 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
