import { ChevronDown } from 'lucide-react'

interface TextSelectOption {
  value: string
  label: string
}

interface TextSelectProps {
  id: string
  value: string
  options: TextSelectOption[]
  onChange: (value: string) => void
  prefix: string
  disabled?: boolean
  'aria-label'?: string
}

export function TextSelect({
  id,
  value,
  options,
  onChange,
  prefix,
  disabled = false,
  'aria-label': ariaLabel,
}: TextSelectProps) {
  const selected = options.find((o) => o.value === value) ?? options[0]

  return (
    <span className="text-select-wrap whitespace-nowrap">
      <label className="sr-only" htmlFor={id}>{ariaLabel ?? prefix}</label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="text-select-native"
        aria-label={ariaLabel}
      >
        {options.map((opt) => (
          <option key={opt.value || 'all'} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span className="text-select-face" aria-hidden="true">
        <span className="text-meta">{prefix}</span>{' '}
        <span className="text-stone">{selected?.label}</span>
        <ChevronDown className="inline w-3.5 h-3.5 text-meta -mt-0.5" />
      </span>
    </span>
  )
}
