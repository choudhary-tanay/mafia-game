'use client'

import { useEffect, useState } from 'react'

export default function PhaseTimer({ deadline }: { deadline: string | null }) {
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
