'use client'

import { useEffect, useRef, useState } from 'react'
import { Pause } from 'lucide-react'

const R = 42
const CIRC = 2 * Math.PI * R

function getRemainingSeconds(deadline: string | null, now: number): number | null {
  if (!deadline) return null
  return Math.max(0, Math.floor((new Date(deadline).getTime() - now) / 1000))
}

export default function CircularTimer({
  deadline,
  totalSeconds,
  onExpire,
  isPaused = false,
  remainingWhenPaused,
}: {
  deadline: string | null
  totalSeconds: number
  onExpire?: () => void
  isPaused?: boolean
  remainingWhenPaused?: number | null
}) {
  const [now, setNow] = useState(() => Date.now())
  const expiredRef = useRef(false)

  useEffect(() => {
    expiredRef.current = false
  }, [deadline])

  // Stop counting when paused
  useEffect(() => {
    if (!deadline || isPaused) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [deadline, isPaused])

  const secs = getRemainingSeconds(deadline, now)

  // Fire onExpire exactly once when the timer first reaches 0.
  useEffect(() => {
    if (isPaused) return
    if (secs === 0 && !expiredRef.current && onExpire) {
      expiredRef.current = true
      onExpire()
    }
  }, [secs, onExpire, isPaused])

  // When paused, show a static "paused" badge instead of a countdown
  if (isPaused) {
    const displaySecs = remainingWhenPaused ?? null
    const pct = displaySecs !== null && totalSeconds > 0 ? Math.min(1, displaySecs / totalSeconds) : 0
    const dash = CIRC * pct

    return (
      <div
        className="relative inline-flex items-center justify-center"
        style={{ width: 88, height: 88 }}
        title="Game paused"
        role="timer"
        aria-label="Game paused — timer frozen"
      >
        <svg
          width="88" height="88"
          className="absolute"
          style={{ transform: 'rotate(-90deg)' }}
          aria-hidden="true"
        >
          <circle cx="44" cy="44" r={R} fill="none" stroke="rgba(245,158,11,0.15)" strokeWidth="6" />
          <circle
            cx="44" cy="44" r={R}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${CIRC}`}
          />
        </svg>
        <div className="relative z-10 flex flex-col items-center justify-center">
          <Pause size={18} className="text-amber-400" />
          <span className="block text-[10px] text-amber-400 uppercase tracking-widest mt-0.5">paused</span>
        </div>
      </div>
    )
  }

  if (secs === null) return null

  const pct = totalSeconds > 0 ? Math.min(1, secs / totalSeconds) : 0
  const dash = CIRC * pct
  const urgent = secs <= 10
  const warning = secs <= 30
  const stroke = urgent ? '#ef4444' : warning ? '#f59e0b' : 'var(--accent)'
  const trackStroke = urgent ? 'rgba(239,68,68,0.15)' : warning ? 'rgba(245,158,11,0.15)' : 'rgba(192,57,43,0.15)'

  const m = Math.floor(secs / 60)
  const s = secs % 60
  const label = m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${secs}`

  const isExpired = secs === 0

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full ${
        urgent && !isExpired ? 'animate-vote-alarm' : ''
      }`}
      style={{ width: 88, height: 88 }}
      title={isExpired ? "Moving to next phase…" : `${secs} seconds remaining`}
      role="timer"
      aria-label={isExpired ? "Moving to next phase" : `${secs} seconds remaining`}
    >
      <svg
        width="88" height="88"
        className="absolute"
        style={{ transform: 'rotate(-90deg)' }}
        aria-hidden="true"
      >
        <circle cx="44" cy="44" r={R} fill="none" stroke={trackStroke} strokeWidth="6" />
        <circle
          cx="44" cy="44" r={R}
          fill="none"
          stroke={stroke}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${CIRC}`}
          style={{ transition: 'stroke-dasharray 1s linear, stroke 0.3s ease' }}
        />
      </svg>
      <div className="relative z-10 text-center">
        {isExpired ? (
          <>
            <span
              className="font-mono font-black tabular-nums leading-none text-red-400 animate-pulse"
              style={{ fontSize: '16px' }}
            >
              …
            </span>
            <span className="block text-[10px] text-text-faint uppercase tracking-widest mt-0.5">
              next
            </span>
          </>
        ) : (
          <>
            <span
              className={`font-mono font-black tabular-nums leading-none ${
                urgent ? 'text-red-400 animate-timer-urgent' : warning ? 'text-amber-400' : 'text-text-primary'
              }`}
              style={{ fontSize: secs >= 100 ? '16px' : '20px' }}
            >
              {label}
            </span>
            {m > 0 && (
              <span className="block text-[10px] text-text-faint uppercase tracking-widest mt-0.5">min</span>
            )}
            {m === 0 && (
              <span className="block text-[10px] text-text-faint uppercase tracking-widest mt-0.5">sec</span>
            )}
          </>
        )}
      </div>
    </div>
  )
}
