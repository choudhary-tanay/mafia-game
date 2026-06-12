'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { resumeGame } from '@/app/actions/game'
import { Play, Loader2 } from 'lucide-react'
import { HourglassIcon } from '@/components/ui/illustrations'

type Props = {
  gameId: string
  isHost: boolean
  pausedByName?: string | null
}

export default function PauseOverlay({ gameId, isHost, pausedByName }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const resumeRef = useRef<HTMLButtonElement>(null)

  // Move keyboard focus into the dialog when it appears (it blocks the page).
  useEffect(() => {
    resumeRef.current?.focus()
  }, [])

  function handleResume() {
    startTransition(async () => {
      const res = await resumeGame(gameId)
      if (res.error) setError(res.error)
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto py-6 vignette"
      style={{ background: 'rgba(4,4,14,0.9)', backdropFilter: 'blur(10px)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Game paused"
    >
      {/* Drifting fog behind the card */}
      <div className="fog-layer" aria-hidden="true" />

      <div className="relative w-full max-w-sm mx-4 my-auto max-h-[92vh] overflow-y-auto rounded-3xl border border-amber-700/50 bg-gradient-to-b from-amber-950/60 to-surface shadow-2xl shadow-amber-950/40 animate-scale-in text-center px-8 py-10">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-900/40 border border-amber-700/40 text-amber-300">
          <HourglassIcon size={40} className="animate-float drop-shadow-[0_0_14px_currentColor]" />
        </div>

        {/* Title */}
        <h2 className="font-display text-5xl leading-none tracking-wider text-amber-200 text-glow-gold mb-3">
          Game Paused
        </h2>

        <p className="text-sm text-amber-400/80 mb-1">
          {pausedByName ? 'Paused by the Host.' : 'The Host has paused the village.'}
        </p>

        {/* Divider */}
        <div className="my-6 h-px bg-gradient-to-r from-transparent via-amber-800/50 to-transparent" />

        {isHost ? (
          <div className="space-y-3">
            {error && (
              <p className="rounded-lg border border-red-700/40 bg-red-950/30 px-3 py-2 text-xs text-red-400">
                {error}
              </p>
            )}
            <button
              ref={resumeRef}
              onClick={handleResume}
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 hover:bg-emerald-600 px-6 py-3.5 min-h-[44px] text-base font-black text-white shadow-lg shadow-emerald-900/40 transition-all disabled:opacity-60 animate-breathe"
            >
              {isPending ? (
                <><Loader2 size={18} className="animate-spin" /> Resuming…</>
              ) : (
                <><Play size={18} /> Resume Game</>
              )}
            </button>
            <p className="text-xs text-text-faint">Only you can resume the game.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400/60 animate-pulse" />
              <p className="text-sm text-text-muted">Waiting for the Host to resume.</p>
            </div>
            <p className="text-xs text-text-faint">All timers and actions are frozen.</p>
          </div>
        )}
      </div>
    </div>
  )
}
