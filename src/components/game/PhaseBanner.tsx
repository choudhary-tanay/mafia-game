import type { GamePhase } from '@/types/database'

type PhaseCfg = {
  icon: string
  title: string
  subtitle: string
  border: string
  bg: string
  accentColor: string
}

const CFG: Partial<Record<GamePhase, PhaseCfg>> = {
  NIGHT_ACTIONS_OPEN: {
    icon: '🌙',
    title: 'Night Falls',
    subtitle: 'The village sleeps. Hidden roles, make your move.',
    border: 'border-blue-800/50',
    bg: 'bg-gradient-to-r from-blue-950/40 to-indigo-950/30',
    accentColor: 'text-blue-300',
  },
  NIGHT_RESOLUTION: {
    icon: '⚙️',
    title: 'Resolving Night…',
    subtitle: 'The darkness holds its secrets for just a moment longer.',
    border: 'border-blue-800/40',
    bg: 'bg-blue-950/20',
    accentColor: 'text-blue-400',
  },
  DAY_ANNOUNCEMENT: {
    icon: '☀️',
    title: 'Morning Arrives',
    subtitle: 'The village stirs. What happened in the night?',
    border: 'border-amber-700/40',
    bg: 'bg-gradient-to-r from-amber-950/30 to-orange-950/20',
    accentColor: 'text-amber-300',
  },
  DISCUSSION: {
    icon: '💬',
    title: 'Discussion',
    subtitle: 'Debate, accuse, defend. Find the Mafia before they strike again.',
    border: 'border-amber-700/40',
    bg: 'bg-gradient-to-r from-amber-950/25 to-yellow-950/15',
    accentColor: 'text-amber-300',
  },
  VOTING: {
    icon: '🗳️',
    title: 'Cast Your Vote',
    subtitle: 'Choose carefully. The village will act on your decision.',
    border: 'border-red-800/50',
    bg: 'bg-gradient-to-r from-red-950/40 to-rose-950/30',
    accentColor: 'text-red-300',
  },
  VOTE_RESOLUTION: {
    icon: '⚖️',
    title: 'Votes Are In',
    subtitle: 'The village has spoken. The results are being tallied.',
    border: 'border-red-800/40',
    bg: 'bg-red-950/25',
    accentColor: 'text-red-400',
  },
  GAME_OVER: {
    icon: '🏁',
    title: 'Game Over',
    subtitle: 'The dust has settled. See who was who.',
    border: 'border-border',
    bg: 'bg-surface-raised',
    accentColor: 'text-text-muted',
  },
}

export default function PhaseBanner({ phase, round }: { phase: GamePhase; round: number }) {
  const cfg = CFG[phase]
  if (!cfg) return null

  return (
    <div className={`rounded-2xl border ${cfg.border} ${cfg.bg} px-5 py-4 animate-fade-up`}>
      <div className="flex items-center gap-4">
        <div className="text-3xl flex-shrink-0">{cfg.icon}</div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-xs font-bold uppercase tracking-widest ${cfg.accentColor}`}>
              {round > 0 ? `Round ${round}` : 'Game'}
            </span>
          </div>
          <h2 className="text-xl font-bold text-text-primary leading-tight">{cfg.title}</h2>
          <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{cfg.subtitle}</p>
        </div>
      </div>
    </div>
  )
}
