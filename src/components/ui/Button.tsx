'use client'

import { type ButtonHTMLAttributes } from 'react'
import { useFormStatus } from 'react-dom'

type Variant = 'primary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
}

const variants: Record<Variant, string> = {
  primary:
    'bg-accent hover:bg-accent-hover text-white font-semibold shadow-lg transition-colors',
  ghost:
    'border border-border text-text-muted hover:text-text-primary hover:border-text-muted transition-colors',
  danger: 'bg-red-800 hover:bg-red-700 text-white font-semibold transition-colors',
}

export default function Button({
  variant = 'primary',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const { pending } = useFormStatus()
  const isLoading = loading || pending

  return (
    <button
      disabled={disabled || isLoading}
      className={`
        inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm
        focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${className}
      `}
      {...props}
    >
      {isLoading && (
        <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}
