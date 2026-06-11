'use client'

import { useEffect, useState } from 'react'

function getRemainingSeconds(deadline: string | null, now: number): number | null {
  if (!deadline) return null
  return Math.max(0, Math.floor((new Date(deadline).getTime() - now) / 1000))
}

export default function PhaseTimer({ deadline }: { deadline: string | null }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!deadline) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [deadline])

  const secs = getRemainingSeconds(deadline, now)
  if (secs === null) return null

  const m = Math.floor(secs / 60)
  const s = secs % 60
  const label = m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`
  const urgent = secs <= 10

  return (
    <div className={`text-center text-2xl font-mono font-bold tabular-nums ${urgent ? 'text-red-400 animate-pulse' : 'text-text-muted'}`}>
      {label}
    </div>
  )
}
