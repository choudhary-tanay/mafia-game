'use client'

import { useEffect, useState } from 'react'

const R = 38
const CIRC = 2 * Math.PI * R

export default function CircularTimer({
  deadline,
  totalSeconds,
}: {
  deadline: string | null
  totalSeconds: number
}) {
  const [secs, setSecs] = useState<number | null>(null)

  useEffect(() => {
    if (!deadline) { setSecs(null); return }
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000))
      setSecs(diff)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [deadline])

  if (secs === null) return null

  const pct = totalSeconds > 0 ? Math.min(1, secs / totalSeconds) : 0
  const dash = CIRC * pct
  const gap = CIRC - dash
  const urgent = secs <= 10
  const stroke = urgent ? '#ef4444' : secs <= 30 ? '#f59e0b' : 'var(--accent)'

  const m = Math.floor(secs / 60)
  const s = secs % 60
  const label = m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${secs}`

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: 72, height: 72 }}>
      <svg width="72" height="72" className="absolute" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="36" cy="36" r={R} fill="none" stroke="var(--surface-raised)" strokeWidth="5" />
        <circle
          cx="36" cy="36" r={R}
          fill="none"
          stroke={stroke}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${CIRC}`}
          style={{ transition: 'stroke-dasharray 1s linear, stroke 0.3s ease' }}
        />
      </svg>
      <span
        className={`relative font-mono font-bold tabular-nums z-10 ${urgent ? 'text-red-400 animate-pulse' : 'text-text-primary'}`}
        style={{ fontSize: secs >= 100 ? '14px' : '16px' }}
      >
        {label}
      </span>
    </div>
  )
}
