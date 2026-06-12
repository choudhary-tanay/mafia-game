import type { Announcement } from '@/types/database'

const EVENT_CONFIG: Record<string, { icon: string; border: string; bg: string; label: string }> = {
  NIGHT_STARTED:             { icon: '🌙', border: 'border-l-blue-500', bg: 'bg-blue-950/20', label: 'Night' },
  PLAYER_KILLED_BY_MAFIA:   { icon: '💀', border: 'border-l-red-500', bg: 'bg-red-950/30', label: 'Eliminated' },
  PLAYER_SAVED_BY_DOCTOR:   { icon: '🛡️', border: 'border-l-cyan-400', bg: 'bg-cyan-950/20', label: 'Saved' },
  NIGHT_QUIET:              { icon: '😶', border: 'border-l-slate-500', bg: 'bg-slate-950/20', label: 'Quiet night' },
  DISCUSSION_STARTED:       { icon: '☀️', border: 'border-l-amber-400', bg: 'bg-amber-950/20', label: 'Discussion' },
  VOTING_STARTED:           { icon: '🗳️', border: 'border-l-orange-400', bg: 'bg-orange-950/20', label: 'Voting' },
  PLAYER_ELIMINATED_BY_VOTE:{ icon: '⚖️', border: 'border-l-red-400', bg: 'bg-red-950/25', label: 'Eliminated' },
  NO_ELIMINATION_TIE:       { icon: '🤝', border: 'border-l-yellow-400', bg: 'bg-yellow-950/20', label: 'Tie' },
  NO_ELIMINATION_ABSTAIN:   { icon: '🤫', border: 'border-l-zinc-400', bg: 'bg-zinc-950/20', label: 'No vote' },
  GAME_ENDED:               { icon: '🏆', border: 'border-l-amber-400', bg: 'bg-amber-950/20', label: 'Game over' },
}

const DEFAULT_CFG = { icon: '📌', border: 'border-l-border', bg: 'bg-surface-raised', label: 'Event' }

export default function AnnouncementFeed({ announcements }: { announcements: Announcement[] }) {
  if (!announcements.length) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5 text-center">
        <p className="text-2xl mb-2">📜</p>
        <p className="text-xs text-text-faint">Events will appear here as the game unfolds.</p>
      </div>
    )
  }

  const reversed = [...announcements].reverse()

  return (
    <div className="rounded-xl border border-border bg-surface flex flex-col max-h-96 lg:max-h-[520px]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border flex-shrink-0">
        <span className="text-sm">📢</span>
        <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted">Game log</h2>
        <span className="ml-auto rounded-full bg-surface-raised px-2 py-0.5 text-xs font-mono text-text-faint">
          {announcements.length}
        </span>
      </div>
      <ul className="overflow-y-auto flex-1 p-3 space-y-2">
        {reversed.map((a, i) => {
          const cfg = EVENT_CONFIG[a.event_type] ?? DEFAULT_CFG
          return (
            <li
              key={a.id}
              className={`border-l-2 ${cfg.border} ${cfg.bg} rounded-r-xl px-3 py-2.5 animate-slide-in`}
              style={{ animationDelay: `${i * 20}ms` }}
            >
              <div className="flex items-start gap-2.5">
                <span className="text-base leading-5 flex-shrink-0 mt-0.5">{cfg.icon}</span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-text-faint mb-0.5">
                    {cfg.label}
                  </p>
                  <p className="text-sm text-text-primary leading-relaxed">{a.message}</p>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
