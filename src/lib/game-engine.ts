// Pure game-engine helpers — no 'use server', no next/headers.
// Called from server actions and the game page server component.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { WinCondition } from '@/types/database'

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

  const aliveMafia = data.filter((p) => p.role === 'MAFIA').length
  const aliveOthers = data.filter((p) => p.role !== 'MAFIA').length

  if (aliveMafia === 0) return 'VILLAGE'
  if (aliveMafia >= aliveOthers) return 'MAFIA'
  return null
}

// ─── Night readiness ──────────────────────────────────────────────────────────

// Returns true when all alive Mafia have submitted a kill AND
// all alive Doctors/Detectives have submitted their action.
// Used to auto-resolve night without waiting for the deadline.
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

  const aliveMafia = alive.filter((p) => p.role === 'MAFIA').map((p) => p.user_id)
  const aliveDoctors = alive.filter((p) => p.role === 'DOCTOR').map((p) => p.user_id)
  const aliveDetectives = alive.filter((p) => p.role === 'DETECTIVE').map((p) => p.user_id)

  const { data: actions } = await supabase
    .from('night_actions')
    .select('actor_user_id, action_type')
    .eq('round_id', roundId)

  const submitted = new Map<string, Set<string>>() // userId → Set<actionType>
  for (const a of actions ?? []) {
    if (!submitted.has(a.actor_user_id)) submitted.set(a.actor_user_id, new Set())
    submitted.get(a.actor_user_id)!.add(a.action_type)
  }

  // At least one Mafia member must have submitted a MAFIA_KILL
  const mafiaKillSubmitted = aliveMafia.some((id) =>
    submitted.get(id)?.has('MAFIA_KILL'),
  )
  if (aliveMafia.length > 0 && !mafiaKillSubmitted) return false

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
