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
      <label htmlFor={selectId} className="text-xs font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </label>
      <select
        id={selectId}
        className={`
          rounded-xl border bg-surface-raised px-4 py-3 text-sm
          text-text-primary
          focus:outline-none focus:ring-1 transition-all
          disabled:opacity-50
          ${error
            ? 'border-red-700/60 focus:border-red-600 focus:ring-red-700/30'
            : 'border-border focus:border-border-bright focus:ring-border/50'
          }
          ${className}
        `}
        {...props}
      >
        {placeholder && (
          <option value="" disabled style={{ background: 'var(--surface-raised)', color: 'var(--text-faint)' }}>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} style={{ background: 'var(--surface-raised)', color: 'var(--text-primary)' }}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-400 flex items-center gap-1">⚠ {error}</p>}
    </div>
  )
}
