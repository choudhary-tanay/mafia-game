import type { ReactNode } from 'react'

/** Themed empty/waiting state: illustration or icon + title + optional hint. */
export default function EmptyState({
  icon,
  title,
  hint,
  className = '',
}: {
  icon: ReactNode
  title: string
  hint?: string
  className?: string
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 px-6 py-10 text-center ${className}`}>
      <div className="text-text-faint opacity-80 animate-float" aria-hidden="true">
        {icon}
      </div>
      <p className="text-sm font-semibold text-text-muted">{title}</p>
      {hint && <p className="text-xs text-text-faint max-w-xs leading-relaxed">{hint}</p>}
    </div>
  )
}
