// Pure game-engine helpers — no 'use server', no next/headers.
// Called from server actions and the game page server component.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Role, WinCondition } from '@/types/database'

// ─── Role assignment ──────────────────────────────────────────────────────────
// Exported so game.ts and tests can both import it.

export function buildRoleList(playerCount: number, mafiaCount: number): Role[] {
  const roles: Role[] = []
  for (let i = 0; i < mafiaCount; i++) roles.push('MAFIA')
  const nonMafia = playerCount - mafiaCount
  if (nonMafia >= 2) roles.push('DOCTOR')
  if (nonMafia >= 4) roles.push('DETECTIVE')  // 5+ players needed for Detective (per PRD)
  while (roles.length < playerCount) roles.push('VILLAGER')
  // Fisher-Yates shuffle
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[roles[i], roles[j]] = [roles[j], roles[i]]
  }
  return roles
}

// ─── Score calculation (pure, no DB) ─────────────────────────────────────────

export function calculateScoreDelta({
  role,
  isWinner,
  winner,
  survivedToEnd,
  doctorSaves,
  detectiveFinds,
  correctVotes,
}: {
  role: Role
  isWinner: boolean
  winner: NonNullable<WinCondition>
  survivedToEnd: boolean
  doctorSaves: number
  detectiveFinds: number
  correctVotes: number
}): number {
  let delta = isWinner
    ? winner === 'MAFIA'
      ? 120  // Mafia win bonus
      : 100  // Village win
    : 25     // Lose — participation

  delta += survivedToEnd ? 50 : 5  // survived bonus / eliminated participation

  if (role === 'DOCTOR')    delta += doctorSaves    * 40
  if (role === 'DETECTIVE') delta += detectiveFinds * 40
  delta += correctVotes * 20

  return delta
}

// ─── Win condition ────────────────────────────────────────────────────────────

export async function checkWinCondition(
  supabase: SupabaseClient,
  gameId: string,
): Promise<WinCondition> {
  const { data } = await supabase
    .from('game_players')
    .select('role, is_alive')
    .eq('game_id', gameId)
    .eq('is_alive', true)

  if (!data) return null

  const aliveMafia  = data.filter((p) => p.role === 'MAFIA').length
  const aliveOthers = data.filter((p) => p.role !== 'MAFIA').length

  if (aliveMafia === 0) return 'VILLAGE'
  if (aliveMafia >= aliveOthers) return 'MAFIA'
  return null
}

// ─── Night readiness ──────────────────────────────────────────────────────────

export async function areNightActionsComplete(
  supabase: SupabaseClient,
  gameId: string,
  roundId: string,
): Promise<boolean> {
  const { data: alive } = await supabase
    .from('game_players')
    .select('user_id, role')
    .eq('game_id', gameId)
    .eq('is_alive', true)

  if (!alive) return false

  const aliveMafia      = alive.filter((p) => p.role === 'MAFIA').map((p) => p.user_id)
  const aliveDoctors    = alive.filter((p) => p.role === 'DOCTOR').map((p) => p.user_id)
  const aliveDetectives = alive.filter((p) => p.role === 'DETECTIVE').map((p) => p.user_id)

  const { data: actions } = await supabase
    .from('night_actions')
    .select('actor_user_id, action_type')
    .eq('round_id', roundId)

  const submitted = new Map<string, Set<string>>()
  for (const a of actions ?? []) {
    if (!submitted.has(a.actor_user_id)) submitted.set(a.actor_user_id, new Set())
    submitted.get(a.actor_user_id)!.add(a.action_type)
  }

  // At least one Mafia member must have submitted MAFIA_KILL
  if (aliveMafia.length > 0) {
    const hasKill = aliveMafia.some((id) => submitted.get(id)?.has('MAFIA_KILL'))
    if (!hasKill) return false
  }

  for (const id of aliveDoctors) {
    if (!submitted.get(id)?.has('DOCTOR_SAVE')) return false
  }
  for (const id of aliveDetectives) {
    if (!submitted.get(id)?.has('DETECTIVE_CHECK')) return false
  }
  return true
}

// ─── Voting readiness ─────────────────────────────────────────────────────────

export async function areAllVotesIn(
  supabase: SupabaseClient,
  gameId: string,
  roundId: string,
): Promise<boolean> {
  const { count: aliveCount } = await supabase
    .from('game_players')
    .select('*', { count: 'exact', head: true })
    .eq('game_id', gameId)
    .eq('is_alive', true)

  const { count: voteCount } = await supabase
    .from('votes')
    .select('*', { count: 'exact', head: true })
    .eq('round_id', roundId)

  return (voteCount ?? 0) >= (aliveCount ?? 1)
}

// ─── Deadline helpers ─────────────────────────────────────────────────────────

export function isDeadlinePassed(deadline: string | null): boolean {
  if (!deadline) return false
  return new Date(deadline) < new Date()
}

export function futureDeadline(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString()
}
