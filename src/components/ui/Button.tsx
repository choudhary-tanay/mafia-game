'use client'

import { type ButtonHTMLAttributes } from 'react'
import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'ghost' | 'danger' | 'gold'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
}

const variants: Record<Variant, string> = {
  primary:
    'bg-accent hover:bg-accent-hover text-white font-semibold shadow-md shadow-red-900/20 hover:shadow-red-900/40 transition-all',
  ghost:
    'border border-border bg-surface-raised text-text-muted hover:text-text-primary hover:bg-surface-high hover:border-border-bright transition-all',
  danger:
    'bg-red-900 hover:bg-red-800 text-white font-semibold transition-all',
  gold:
    'border border-amber-700/50 bg-amber-900/20 text-amber-300 hover:bg-amber-900/40 hover:border-amber-600/70 font-semibold transition-all',
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
        inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm
        focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${className}
      `}
      {...props}
    >
      {isLoading && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  )
}
