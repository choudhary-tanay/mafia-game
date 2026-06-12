'use client'

import { useEffect, useState } from 'react'

const R = 42
const CIRC = 2 * Math.PI * R

function getRemainingSeconds(deadline: string | null, now: number): number | null {
  if (!deadline) return null
  return Math.max(0, Math.floor((new Date(deadline).getTime() - now) / 1000))
}

export default function CircularTimer({
  deadline,
  totalSeconds,
}: {
  deadline: string | null
  totalSeconds: number
}) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!deadline) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [deadline])

  const secs = getRemainingSeconds(deadline, now)
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

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: 88, height: 88 }}
      title={`${secs} seconds remaining`}
    >
      <svg
        width="88"
        height="88"
        className="absolute"
        style={{ transform: 'rotate(-90deg)' }}
        aria-hidden="true"
      >
        {/* Track */}
        <circle
          cx="44" cy="44" r={R}
          fill="none"
          stroke={trackStroke}
          strokeWidth="6"
        />
        {/* Progress */}
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
        <span
          className={`font-mono font-black tabular-nums leading-none ${
            urgent ? 'text-red-400 animate-timer-urgent' : warning ? 'text-amber-400' : 'text-text-primary'
          }`}
          style={{ fontSize: secs >= 100 ? '16px' : '20px' }}
        >
          {label}
        </span>
        {m > 0 && (
          <span className="block text-[8px] text-text-faint uppercase tracking-widest mt-0.5">min</span>
        )}
        {m === 0 && (
          <span className="block text-[8px] text-text-faint uppercase tracking-widest mt-0.5">sec</span>
        )}
      </div>
    </div>
  )
}
