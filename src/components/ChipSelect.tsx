import { ChevronDown } from 'lucide-react'

interface ChipSelectOption {
  value: string
  label: string
}

interface ChipSelectProps {
  id: string
  value: string
  options: ChipSelectOption[]
  onChange: (value: string) => void
  prefix?: string
  disabled?: boolean
  'aria-label'?: string
}

export function ChipSelect({
  id,
  value,
  options,
  onChange,
  prefix = 'For',
  disabled = false,
  'aria-label': ariaLabel,
}: ChipSelectProps) {
  const selected = options.find((o) => o.value === value) ?? options[0]

  return (
    <div className="chip-select-wrap shrink-0">
      <label className="sr-only" htmlFor={id}>{ariaLabel ?? prefix}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="chip-select"
        aria-label={ariaLabel}
      >
        {options.map((opt) => (
          <option key={opt.value || 'all'} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span className="chip-select-face" aria-hidden="true">
        <span className="text-meta font-normal">{prefix}:</span>{' '}
        <span className="text-stone">{selected?.label ?? 'All roles'}</span>
        <ChevronDown className="w-3.5 h-3.5 text-meta ml-0.5" />
      </span>
    </div>
  )
}
