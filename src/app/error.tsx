'use client'

import { startTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw } from 'lucide-react'

/**
 * Route error boundary — a client-side crash must never brick a live game.
 * Auto-retries (recovers transient render errors), then offers a manual
 * reload. Retries are time-windowed in sessionStorage to guard against an
 * infinite reload loop without permanently spending the budget.
 */
const RETRY_KEY = 'mafia-error-retries'
const RETRY_WINDOW_MS = 60_000
const MAX_RETRIES = 2

function readRetries(): number {
  try {
    const raw = sessionStorage.getItem(RETRY_KEY)
    if (!raw) return 0
    const { n, ts } = JSON.parse(raw) as { n: number; ts: number }
    // Old failures don't count against the budget — only a tight crash loop does.
    return Date.now() - ts < RETRY_WINDOW_MS ? n : 0
  } catch { return 0 }
}

function writeRetries(n: number): void {
  try { sessionStorage.setItem(RETRY_KEY, JSON.stringify({ n, ts: Date.now() })) } catch { /* noop */ }
}

export default function GameError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()
  const retriedRef = useRef(false)

  useEffect(() => {
    console.error('[mafia] client error boundary:', error)
    const retries = readRetries()
    if (retries < MAX_RETRIES && !retriedRef.current) {
      retriedRef.current = true
      writeRetries(retries + 1)
      const t = setTimeout(() => {
        // reset() alone re-renders WITHOUT refetching in Next 16 — pair it
        // with router.refresh() so recovery uses fresh server state.
        startTransition(() => {
          router.refresh()
          reset()
        })
      }, 1500)
      return () => clearTimeout(t)
    }
  }, [error, reset, router])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center bg-background">
      <div className="text-4xl animate-pulse" aria-hidden="true">🌫️</div>
      <div>
        <h1 className="text-xl font-bold text-text-primary mb-1">Reconnecting to the village…</h1>
        <p className="text-sm text-text-muted max-w-xs">
          Something went wrong on this screen. Your game is safe on the server.
        </p>
      </div>
      <button
        onClick={() => {
          try { sessionStorage.removeItem(RETRY_KEY) } catch { /* noop */ }
          window.location.reload()
        }}
        className="flex items-center gap-2 rounded-xl bg-accent px-6 py-3 min-h-[44px] text-sm font-bold text-white hover:bg-accent-hover transition-all"
      >
        <RotateCcw size={15} />
        Reload game
      </button>
    </main>
  )
}
