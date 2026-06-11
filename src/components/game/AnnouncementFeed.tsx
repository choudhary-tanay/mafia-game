import type { Announcement } from '@/types/database'

const EVENT_ICON: Record<string, string> = {
  NIGHT_STARTED:             '🌙',
  PLAYER_KILLED_BY_MAFIA:    '💀',
  PLAYER_SAVED_BY_DOCTOR:    '🛡️',
  DISCUSSION_STARTED:        '☀️',
  VOTING_STARTED:            '🗳️',
  PLAYER_ELIMINATED_BY_VOTE: '⚖️',
  NO_ELIMINATION_TIE:        '🤝',
  NO_ELIMINATION_ABSTAIN:    '🤫',
  DETECTIVE_INVESTIGATION:   '🔍',
  GAME_ENDED:                '🏆',
}

const EVENT_BORDER: Record<string, string> = {
  NIGHT_STARTED:             'border-l-blue-500/50',
  PLAYER_KILLED_BY_MAFIA:    'border-l-red-500/60',
  PLAYER_SAVED_BY_DOCTOR:    'border-l-cyan-400/50',
  DISCUSSION_STARTED:        'border-l-amber-400/50',
  VOTING_STARTED:            'border-l-orange-400/50',
  PLAYER_ELIMINATED_BY_VOTE: 'border-l-red-400/50',
  NO_ELIMINATION_TIE:        'border-l-yellow-400/50',
  NO_ELIMINATION_ABSTAIN:    'border-l-zinc-400/40',
  DETECTIVE_INVESTIGATION:   'border-l-purple-400/50',
  GAME_ENDED:                'border-l-yellow-400/60',
}

export default function AnnouncementFeed({ announcements }: { announcements: Announcement[] }) {
  if (!announcements.length) return null

  const reversed = [...announcements].reverse()

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-text-muted">
        📢 Announcements
      </h2>
      <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {reversed.map((a, i) => {
          const icon = EVENT_ICON[a.event_type] ?? '📌'
          const border = EVENT_BORDER[a.event_type] ?? 'border-l-border'
          return (
            <li
              key={a.id}
              className={`border-l-2 ${border} bg-surface-raised rounded-r-lg px-3 py-2.5 animate-slide-in`}
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div className="flex items-start gap-2">
                <span className="text-sm leading-5 flex-shrink-0">{icon}</span>
                <p className="text-sm text-text-primary leading-relaxed">{a.message}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
