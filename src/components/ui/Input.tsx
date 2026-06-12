import { type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
}

export default function Input({ label, error, hint, id, className = '', ...props }: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </label>
      <input
        id={inputId}
        className={`
          rounded-xl border bg-surface-raised px-4 py-3 text-sm
          text-text-primary placeholder:text-text-faint
          focus:outline-none focus:ring-1 transition-all
          disabled:opacity-50
          ${error
            ? 'border-red-700/60 focus:border-red-600 focus:ring-red-700/30'
            : 'border-border focus:border-border-bright focus:ring-border/50'
          }
          ${className}
        `}
        {...props}
      />
      {hint && !error && <p className="text-xs text-text-faint">{hint}</p>}
      {error && <p className="text-xs text-red-400 flex items-center gap-1">⚠ {error}</p>}
    </div>
  )
}
