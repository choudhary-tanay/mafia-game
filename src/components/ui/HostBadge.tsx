import { Crown } from 'lucide-react'

/** Gold crown chip marking the room host. `compact` renders icon-only. */
export default function HostBadge({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <span
        aria-label="Host"
        title="Host"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-b from-amber-400 to-amber-600 shadow-lg shadow-amber-900/50 animate-gold-pulse"
      >
        <Crown size={11} className="text-amber-950" />
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-600/50 bg-gradient-to-b from-amber-900/50 to-amber-950/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
      <Crown size={9} />
      Host
    </span>
  )
}
