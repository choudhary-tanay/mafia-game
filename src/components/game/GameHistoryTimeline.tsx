import type { GameHistoryRound, GameHistory, Role } from '@/types/database'
import Link from 'next/link'
import EmptyState from '@/components/ui/EmptyState'
import {
  MafiaMask,
  DoctorShield,
  DetectiveGlass,
  VillagerGroup,
  MoonScene,
  BallotBox,
  SkullMark,
  HourglassIcon,
} from '@/components/ui/illustrations'

const ROLE_COLOR: Record<Role, string> = {
  MAFIA: 'text-red-400',
  DOCTOR: 'text-cyan-400',
  DETECTIVE: 'text-purple-400',
  VILLAGER: 'text-emerald-400',
}

const ROLE_ART: Record<Role, typeof MafiaMask> = {
  MAFIA: MafiaMask,
  DOCTOR: DoctorShield,
  DETECTIVE: DetectiveGlass,
  VILLAGER: VillagerGroup,
}

const ACTION_LABEL: Record<string, string> = {
  MAFIA_KILL: 'Mafia targeted', DOCTOR_SAVE: 'Doctor protected', DETECTIVE_CHECK: 'Detective investigated',
}

function NightActionIcon({ type, died }: { type: string; died: boolean }) {
  if (type === 'MAFIA_KILL') {
    return died
      ? <SkullMark size={16} className="text-red-400" />
      : <MafiaMask size={16} className="text-red-400" />
  }
  if (type === 'DOCTOR_SAVE') return <DoctorShield size={16} className="text-cyan-400" />
  return <DetectiveGlass size={16} className="text-purple-400" />
}

function RoundCard({ round }: { round: GameHistoryRound }) {
  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-lg shadow-black/30">
      {/* Round header */}
      <div className="flex items-center gap-3 px-5 py-3 bg-surface-raised border-b border-border">
        <h3 className="font-display text-lg tracking-wider text-text-primary leading-none">
          Round {round.roundNumber}
        </h3>
        <span className="h-px flex-1 bg-gradient-to-r from-border-bright to-transparent" aria-hidden="true" />
      </div>

      {/* Night section */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2 mb-3">
          <MoonScene size={18} className="text-blue-400" />
          <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Night</span>
        </div>

        {/* Night actions */}
        {round.nightActions.length > 0 ? (
          <div className="space-y-2 mb-3">
            {round.nightActions.map((a, i) => (
              <div key={i} className={`flex items-start gap-2.5 rounded-xl px-3 py-2 text-xs ${
                a.type === 'MAFIA_KILL'
                  ? 'bg-red-950/30 border border-red-900/30'
                  : a.type === 'DOCTOR_SAVE'
                  ? 'bg-cyan-950/20 border border-cyan-900/20'
                  : 'bg-purple-950/20 border border-purple-900/20'
              }`}>
                <span className="flex-shrink-0 mt-0.5">
                  <NightActionIcon type={a.type} died={!!round.died} />
                </span>
                <span className="text-text-muted">
                  <span className="font-semibold text-text-primary">{a.actorName}</span>
                  {' · '}{ACTION_LABEL[a.type]}:{' '}
                  <span className="font-semibold text-text-primary">{a.targetName}</span>
                  {a.type === 'DETECTIVE_CHECK' && (
                    <span className={`ml-1.5 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold tracking-widest align-middle ${
                      a.isMafia
                        ? 'border-red-900/50 bg-red-950/60 text-red-400'
                        : 'border-emerald-900/50 bg-emerald-950/60 text-emerald-400'
                    }`}>
                      {a.isMafia ? 'MAFIA' : 'CLEAR'}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        {/* Night result */}
        <div className={`flex items-start gap-2.5 rounded-xl px-3 py-2 text-xs font-medium ${
          round.died
            ? 'bg-red-950/30 border border-red-900/30 text-red-300'
            : round.saved
            ? 'bg-cyan-950/20 border border-cyan-900/20 text-cyan-300'
            : 'bg-surface-raised border border-border text-text-muted'
        }`}>
          {round.died ? (
            <span className="flex-shrink-0 mt-0.5"><SkullMark size={16} className="text-red-400" /></span>
          ) : round.saved ? (
            <span className="flex-shrink-0 mt-0.5"><DoctorShield size={16} className="text-cyan-400" /></span>
          ) : null}
          <span>{round.nightResultMsg}</span>
        </div>
      </div>

      {/* Day / Voting section */}
      {(round.votes.length > 0 || round.voteResultMsg) && (
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <BallotBox size={18} className="text-red-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-red-400">Voting</span>
          </div>

          {/* Votes */}
          {round.votes.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5 mb-3">
              {round.votes.map((v, i) => (
                <div key={i} className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-surface-raised px-2.5 py-1.5 text-xs">
                  <span className="font-semibold text-text-primary truncate">{v.voterName}</span>
                  <span className="text-text-faint flex-shrink-0">→</span>
                  <span className={`truncate ${v.targetName ? 'text-text-muted' : 'text-text-faint italic'}`}>
                    {v.targetName ?? 'abstained'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Vote result */}
          {round.voteResultMsg && (
            <div className={`flex items-start gap-2.5 rounded-xl px-3 py-2 text-xs font-medium ${
              round.eliminated
                ? 'bg-red-950/40 border border-red-900/40 text-red-300 role-glow-mafia'
                : 'bg-surface-raised border border-border text-text-muted'
            }`}>
              {round.eliminated && (
                <span className="flex-shrink-0 mt-0.5"><SkullMark size={16} className="text-red-400" /></span>
              )}
              <span>
                {round.voteResultMsg}
                {round.eliminated && round.eliminatedRole && (
                  <span className={`ml-2 font-display text-sm tracking-wider ${ROLE_COLOR[round.eliminatedRole]}`}>
                    {round.eliminatedRole}
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function GameHistoryTimeline({
  history,
  gameId,
}: {
  history: GameHistory
  gameId?: string
}) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HourglassIcon size={18} className="text-gold" />
          <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted">Game History</h3>
        </div>
        {gameId && (
          <Link
            href={`/game/${gameId}/history`}
            className="inline-flex items-center rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs font-semibold text-accent hover:text-accent-hover hover:border-border-bright transition-colors"
          >
            Full recap →
          </Link>
        )}
      </div>

      {/* Final roles summary */}
      <div className="rounded-2xl border border-border bg-surface p-4 animate-fade-up">
        <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3">Final Roles</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {history.finalRoles.map((p) => {
            const Art = ROLE_ART[p.role]
            return (
              <div
                key={p.name}
                className={`flex items-center gap-2.5 rounded-xl border px-2.5 py-2 ${
                  p.survived
                    ? 'border-border bg-surface-raised'
                    : 'border-transparent bg-surface opacity-60'
                }`}
              >
                <Art size={22} className={`flex-shrink-0 ${ROLE_COLOR[p.role]} ${p.survived ? '' : 'opacity-70'}`} />
                <div className="min-w-0">
                  <p className={`text-xs font-semibold truncate ${p.survived ? 'text-text-primary' : 'text-text-muted line-through'}`}>
                    {p.name}
                  </p>
                  <p className={`text-[10px] font-bold tracking-wider ${ROLE_COLOR[p.role]}`}>{p.role}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Round timeline — crime-board rail */}
      {history.rounds.length > 0 && (
        <div className="relative">
          {/* vertical rail */}
          <span
            className="absolute left-4 top-4 bottom-4 w-px bg-gradient-to-b from-border-bright via-border to-transparent"
            aria-hidden="true"
          />
          <ol className="space-y-5">
            {history.rounds.map((round, i) => (
              <li
                key={round.roundNumber}
                className={`relative pl-12 animate-fade-up stagger-${Math.min(i + 1, 8)}`}
              >
                {/* numbered node on the rail */}
                <span
                  className="absolute left-0 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-border-bright bg-surface-high font-display text-base text-gold shadow-[0_0_14px_rgba(0,0,0,0.6)]"
                  aria-hidden="true"
                >
                  {round.roundNumber}
                </span>
                <RoundCard round={round} />
              </li>
            ))}
          </ol>
        </div>
      )}

      {history.rounds.length === 0 && (
        <div className="rounded-2xl border border-border bg-surface animate-fade-in">
          <EmptyState
            icon={<HourglassIcon size={44} className="text-text-faint" />}
            title="No round history available."
            hint="The village kept no record of this night."
          />
        </div>
      )}
    </div>
  )
}
