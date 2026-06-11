import { type SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  placeholder?: string
  options: { value: string; label: string }[]
}

export default function Select({ label, error, id, options, placeholder, className = '', ...props }: SelectProps) {
  const selectId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="text-sm font-medium text-text-primary">
        {label}
      </label>
      <select
        id={selectId}
        className={`
          rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm
          text-text-primary
          focus:outline-none focus:border-accent/70 focus:ring-1 focus:ring-accent/40
          disabled:opacity-50 transition-colors
          ${error ? 'border-red-500/70 focus:border-red-500 focus:ring-red-500/30' : ''}
          ${className}
        `}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
