'use client'

import { useEffect, useRef, useState } from 'react'
import type { BollywoodEvent } from '@/lib/bollywood-reactions'
import { X } from 'lucide-react'

type Props = {
  event: BollywoodEvent
  onClose: () => void
}

export default function BollywoodReactionModal({ event, onClose }: Props) {
  const [imgError, setImgError] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function startAutoClose(delay: number) {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(onClose, delay)
  }

  useEffect(() => {
    startAutoClose(event.durationMs)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id])

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Bollywood reaction"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Card — framed like a film still */}
      <div
        className="relative flex flex-col items-center rounded-2xl border-2 border-amber-700/50 bg-surface shadow-2xl shadow-red-950/50 overflow-hidden animate-pop-in"
        style={{ maxWidth: 'min(90vw, 720px)', maxHeight: '90vh' }}
      >
        {/* Inner red frame line (double border) */}
        <div
          className="absolute inset-1.5 z-10 rounded-xl border border-red-800/50 pointer-events-none"
          aria-hidden="true"
        />

        {/* Film chip */}
        <span
          className="absolute top-3 left-3 z-20 flex items-center gap-1 rounded-full border border-amber-700/40 bg-black/70 px-2 py-1 text-xs font-bold uppercase tracking-wider text-amber-300"
          aria-hidden="true"
        >
          🎬
        </span>

        {/* Close button — always visible */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
        >
          <X size={16} />
        </button>

        {/* Image or text fallback */}
        <div
          className="w-full flex items-center justify-center overflow-hidden"
          style={{ maxHeight: '70vh' }}
        >
          {imgError ? (
            <div className="flex h-40 w-full items-center justify-center bg-red-950/30">
              <p className="text-5xl">🎬</p>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.imagePath}
              alt={event.caption}
              onError={() => setImgError(true)}
              onLoad={() => startAutoClose(event.durationMs)}
              className="w-auto h-auto object-contain"
              style={{ maxWidth: '100%', maxHeight: '70vh' }}
            />
          )}
        </div>

        {/* Caption — subtitle bar */}
        <div className="w-full px-5 py-4 bg-gradient-to-t from-black/95 to-black/50 border-t border-amber-900/30 text-center flex-shrink-0">
          <p className="text-base sm:text-lg font-black text-amber-50 leading-snug tracking-wide drop-shadow [text-shadow:0_1px_8px_rgba(0,0,0,0.9)]">
            {event.caption}
          </p>
          <button
            onClick={onClose}
            className="mt-3 rounded-xl border border-red-700/50 bg-red-900/30 px-8 py-3 min-h-[44px] text-xs font-bold uppercase tracking-wider text-red-200 hover:bg-red-900/60 transition-all"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
