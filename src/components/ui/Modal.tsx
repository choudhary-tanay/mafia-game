'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

export default function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    // Focus management: move focus into the dialog, trap Tab inside it,
    // and restore focus to the trigger on close.
    const previouslyFocused = document.activeElement as HTMLElement | null
    panelRef.current?.focus()

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab' || !panelRef.current) return
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus()
      }
    }
    document.addEventListener('keydown', handler)
    // Prevent background scroll when open
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
      previouslyFocused?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-lg"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border-bright bg-surface shadow-2xl shadow-black/60 animate-slide-up max-h-[92vh] flex flex-col focus:outline-none"
      >
        {/* Top accent hairline */}
        <div
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent pointer-events-none"
          aria-hidden="true"
        />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-raised/50 flex-shrink-0">
          <div>
            <h2 className="font-bold text-text-primary text-base tracking-wide">{title}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 flex-1">
          {children}
        </div>

        {/* Footer close button (always visible on mobile) */}
        <div className="sm:hidden px-6 py-4 border-t border-border flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full rounded-xl border border-border bg-surface-raised py-3 min-h-[44px] text-sm font-semibold text-text-muted hover:text-text-primary hover:bg-surface-high transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
