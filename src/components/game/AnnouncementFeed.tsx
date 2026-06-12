import type { ReactNode } from 'react'
import type { Announcement } from '@/types/database'
import EmptyState from '@/components/ui/EmptyState'
import {
  MoonScene, SkullMark, DoctorShield, VillagerGroup,
  BallotBox, TrophyIcon, DetectiveGlass,
} from '@/components/ui/illustrations'

type EventCfg = {
  icon: ReactNode
  border: string
  bg: string
  label: string
  /** Soft box-shadow glow applied to the newest entry only. */
  glow: string
}

const EVENT_CONFIG: Record<string, EventCfg> = {
  NIGHT_STARTED: {
    icon: <MoonScene size={16} className="text-blue-400" />,
    border: 'border-l-blue-500', bg: 'bg-blue-950/20', label: 'Night',
    glow: 'shadow-[0_0_14px_rgba(59,130,246,0.25)]',
  },
  PLAYER_KILLED_BY_MAFIA: {
    icon: <SkullMark size={16} className="text-red-400" />,
    border: 'border-l-red-500', bg: 'bg-red-950/30', label: 'Eliminated',
    glow: 'shadow-[0_0_14px_rgba(239,68,68,0.3)]',
  },
  PLAYER_SAVED_BY_DOCTOR: {
    icon: <DoctorShield size={16} className="text-cyan-400" />,
    border: 'border-l-cyan-400', bg: 'bg-cyan-950/20', label: 'Saved',
    glow: 'shadow-[0_0_14px_rgba(34,211,238,0.25)]',
  },
  NIGHT_QUIET: {
    icon: <MoonScene size={16} className="text-slate-400" />,
    border: 'border-l-slate-500', bg: 'bg-slate-950/20', label: 'Quiet night',
    glow: 'shadow-[0_0_14px_rgba(148,163,184,0.18)]',
  },
  DISCUSSION_STARTED: {
    icon: <VillagerGroup size={16} className="text-amber-400" />,
    border: 'border-l-amber-400', bg: 'bg-amber-950/20', label: 'Discussion',
    glow: 'shadow-[0_0_14px_rgba(251,191,36,0.22)]',
  },
  VOTING_STARTED: {
    icon: <BallotBox size={16} className="text-red-400" />,
    border: 'border-l-red-400', bg: 'bg-red-950/20', label: 'Voting',
    glow: 'shadow-[0_0_14px_rgba(239,68,68,0.25)]',
  },
  PLAYER_ELIMINATED_BY_VOTE: {
    icon: <SkullMark size={16} className="text-red-400" />,
    border: 'border-l-red-400', bg: 'bg-red-950/25', label: 'Eliminated',
    glow: 'shadow-[0_0_14px_rgba(239,68,68,0.3)]',
  },
  NO_ELIMINATION_TIE: {
    icon: <BallotBox size={16} className="text-yellow-400" />,
    border: 'border-l-yellow-400', bg: 'bg-yellow-950/20', label: 'Tie',
    glow: 'shadow-[0_0_14px_rgba(250,204,21,0.2)]',
  },
  NO_ELIMINATION_ABSTAIN: {
    icon: <span className="block h-1.5 w-1.5 rounded-full bg-zinc-400" aria-hidden="true" />,
    border: 'border-l-zinc-400', bg: 'bg-zinc-950/20', label: 'No vote',
    glow: 'shadow-[0_0_14px_rgba(161,161,170,0.18)]',
  },
  GAME_ENDED: {
    icon: <TrophyIcon size={16} className="text-gold" />,
    border: 'border-l-amber-400', bg: 'bg-amber-950/20', label: 'Game over',
    glow: 'shadow-[0_0_14px_rgba(217,119,6,0.3)]',
  },
}

const DETECTIVE_CFG: EventCfg = {
  icon: <DetectiveGlass size={16} className="text-purple-400" />,
  border: 'border-l-purple-400', bg: 'bg-purple-950/20', label: 'Investigation',
  glow: 'shadow-[0_0_14px_rgba(192,132,252,0.25)]',
}

const DEFAULT_CFG: EventCfg = {
  icon: <span className="block h-1.5 w-1.5 rounded-full bg-zinc-500" aria-hidden="true" />,
  border: 'border-l-border', bg: 'bg-surface-raised', label: 'Event',
  glow: 'shadow-[0_0_14px_rgba(255,255,255,0.08)]',
}

function configFor(eventType: string): EventCfg {
  return (
    EVENT_CONFIG[eventType] ??
    (eventType.includes('DETECTIVE') ? DETECTIVE_CFG : DEFAULT_CFG)
  )
}

export default function AnnouncementFeed({ announcements }: { announcements: Announcement[] }) {
  if (!announcements.length) {
    return (
      <div className="rounded-xl border border-border bg-surface">
        <EmptyState
          icon={<MoonScene size={40} className="text-blue-400/70" />}
          title="The village is quiet… for now."
          hint="Events will appear here as the night unfolds."
        />
      </div>
    )
  }

  const reversed = [...announcements].reverse()

  return (
    <div className="rounded-xl border border-border bg-surface flex flex-col max-h-96 lg:max-h-[520px]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border flex-shrink-0">
        <span className="text-sm" aria-hidden="true">📢</span>
        <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted">Game log</h2>
        <span className="ml-auto rounded-full bg-surface-raised px-2 py-0.5 text-xs font-mono text-text-faint">
          {announcements.length}
        </span>
      </div>
      <ul role="log" aria-live="polite" className="overflow-y-auto flex-1 p-3 space-y-2">
        {reversed.map((a, i) => {
          const cfg = configFor(a.event_type)
          const isNewest = i === 0
          return (
            <li
              key={a.id}
              className={`border-l-2 ${cfg.border} ${cfg.bg} rounded-r-xl px-3 py-2.5 animate-slide-in ${
                isNewest ? `${cfg.glow} ring-1 ring-white/5` : ''
              }`}
              style={{ animationDelay: `${i * 20}ms` }}
            >
              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 items-center justify-center flex-shrink-0 mt-0.5" aria-hidden="true">
                  {cfg.icon}
                </span>
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
