import { type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export default function Input({ label, error, id, className = '', ...props }: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-text-primary">
        {label}
      </label>
      <input
        id={inputId}
        className={`
          rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm
          text-text-primary placeholder:text-text-muted
          focus:outline-none focus:border-accent/70 focus:ring-1 focus:ring-accent/40
          disabled:opacity-50 transition-colors
          ${error ? 'border-red-500/70 focus:border-red-500 focus:ring-red-500/30' : ''}
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
