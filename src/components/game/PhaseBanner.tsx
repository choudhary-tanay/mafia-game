import type { GamePhase } from '@/types/database'

type PhaseCfg = {
  icon: string
  title: string
  subtitle: string
  border: string
  glow: string
}

const CFG: Partial<Record<GamePhase, PhaseCfg>> = {
  NIGHT_ACTIONS_OPEN: {
    icon: '🌙', title: 'Night', subtitle: 'The village sleeps. Act in the dark.',
    border: 'border-blue-800/40', glow: 'bg-blue-900/20',
  },
  NIGHT_RESOLUTION: {
    icon: '⚙️', title: 'Resolving…', subtitle: 'The night\'s secrets are unfolding.',
    border: 'border-blue-800/30', glow: 'bg-blue-900/10',
  },
  DAY_ANNOUNCEMENT: {
    icon: '☀️', title: 'Morning', subtitle: 'The village wakes to news.',
    border: 'border-amber-700/30', glow: 'bg-amber-900/10',
  },
  DISCUSSION: {
    icon: '💬', title: 'Discussion', subtitle: 'Debate, deduce, and detect the Mafia.',
    border: 'border-amber-700/30', glow: 'bg-amber-900/10',
  },
  VOTING: {
    icon: '🗳️', title: 'Voting', subtitle: 'Cast your vote. Choose wisely.',
    border: 'border-red-800/40', glow: 'bg-red-900/20',
  },
  VOTE_RESOLUTION: {
    icon: '⚖️', title: 'Vote Results', subtitle: 'The village has decided.',
    border: 'border-red-800/30', glow: 'bg-red-900/10',
  },
  GAME_OVER: {
    icon: '🏁', title: 'Game Over', subtitle: 'The dust settles.',
    border: 'border-border', glow: 'bg-surface',
  },
}

export default function PhaseBanner({ phase, round }: { phase: GamePhase; round: number }) {
  const cfg = CFG[phase]
  if (!cfg) return null
  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.glow} px-5 py-4 animate-fade-up`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl leading-none">{cfg.icon}</span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">
            {round > 0 ? `Round ${round}` : 'Game'}
          </p>
          <h2 className="text-lg font-bold text-text-primary leading-tight">{cfg.title}</h2>
          <p className="text-xs text-text-muted mt-0.5">{cfg.subtitle}</p>
        </div>
      </div>
    </div>
  )
}
