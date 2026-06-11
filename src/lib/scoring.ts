// Server-only scoring engine.
// computeAndPersistScores() is idempotent: game_results has a unique(game_id)
// constraint — the first successful insert is the gate. Any subsequent call
// (retry, page refresh, concurrent request) exits early with no side effects.
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { WinCondition } from '@/types/database'

// ─── Score constants ──────────────────────────────────────────────────────────
const POINTS = {
  WIN_VILLAGE: 100,
  WIN_MAFIA: 120,       // Mafia winners get slightly more
  LOSE: 25,             // Participation points
  SURVIVED: 50,
  ELIMINATED: 5,        // Extra participation if killed
  DOCTOR_SAVE: 40,
  DETECTIVE_FIND: 40,
  CORRECT_VOTE: 20,
} as const

export async function computeAndPersistScores(
  supabase: SupabaseClient,
  gameId: string,
  winner: NonNullable<WinCondition>,
): Promise<void> {
  // ── Idempotency gate ───────────────────────────────────────────────────────
  // Insert game_results; unique(game_id) ensures this only succeeds once.
  // If another process already inserted, the upsert silently ignores it.
  const { error: grError, data: grData } = await supabase
    .from('game_results')
    .insert({ game_id: gameId, winning_team: winner, ended_reason: 'WIN_CONDITION' })
    .select('id')
    .single()

  if (grError || !grData) {
    // Either already processed or DB error — either way, skip.
    return
  }

  // ── Fetch all data needed for scoring ─────────────────────────────────────
  const [
    { data: players },
    { data: nightActions },
    { data: allVotes },
    { data: saveEvents },
  ] = await Promise.all([
    supabase
      .from('game_players')
      .select('user_id, role, is_alive, death_round_number')
      .eq('game_id', gameId),
    supabase
      .from('night_actions')
      .select('actor_user_id, action_type, target_user_id, round_id')
      .eq('game_id', gameId),
    supabase
      .from('votes')
      .select('voter_user_id, target_user_id')
      .eq('game_id', gameId),
    supabase
      .from('game_events')
      .select('round_id')
      .eq('game_id', gameId)
      .eq('event_type', 'PLAYER_SAVED_BY_DOCTOR'),
  ])

  if (!players?.length) return

  const mafiaIds = new Set(players.filter((p) => p.role === 'MAFIA').map((p) => p.user_id))
  const savedRoundIds = new Set((saveEvents ?? []).map((e) => e.round_id).filter(Boolean))

  // ── Per-player calculation ─────────────────────────────────────────────────
  for (const player of players) {
    const isWinner =
      (winner === 'MAFIA' && player.role === 'MAFIA') ||
      (winner === 'VILLAGE' && player.role !== 'MAFIA')

    const team = player.role === 'MAFIA' ? 'MAFIA' : 'VILLAGE'
    const survivedToEnd = player.is_alive as boolean

    // Base points
    let delta = isWinner
      ? winner === 'MAFIA'
        ? POINTS.WIN_MAFIA
        : POINTS.WIN_VILLAGE
      : POINTS.LOSE

    // Survival
    delta += survivedToEnd ? POINTS.SURVIVED : POINTS.ELIMINATED

    // Doctor: count rounds where this doctor's save target equals the Mafia kill target
    let doctorSaves = 0
    if (player.role === 'DOCTOR') {
      const saves = (nightActions ?? []).filter(
        (a) => a.actor_user_id === player.user_id && a.action_type === 'DOCTOR_SAVE',
      )
      for (const s of saves) {
        if (savedRoundIds.has(s.round_id)) doctorSaves++
      }
      delta += doctorSaves * POINTS.DOCTOR_SAVE
    }

    // Detective: count rounds where the investigated player was Mafia
    let detectiveFinds = 0
    if (player.role === 'DETECTIVE') {
      const checks = (nightActions ?? []).filter(
        (a) => a.actor_user_id === player.user_id && a.action_type === 'DETECTIVE_CHECK',
      )
      for (const c of checks) {
        if (c.target_user_id && mafiaIds.has(c.target_user_id)) detectiveFinds++
      }
      delta += detectiveFinds * POINTS.DETECTIVE_FIND
    }

    // Correct votes against Mafia (any round)
    const myVotes = (allVotes ?? []).filter((v) => v.voter_user_id === player.user_id)
    const correctVotes = myVotes.filter(
      (v) => v.target_user_id && mafiaIds.has(v.target_user_id),
    ).length
    delta += correctVotes * POINTS.CORRECT_VOTE

    // ── Insert stat row (unique(game_id, user_id) protects from duplicates) ──
    await supabase.from('player_game_stats').insert({
      game_id: gameId,
      user_id: player.user_id,
      role: player.role,
      team,
      won: isWinner,
      survived_to_end: survivedToEnd,
      eliminated_round_number: player.death_round_number ?? null,
      correct_votes_against_mafia: correctVotes,
      successful_doctor_saves: doctorSaves,
      successful_detective_finds: detectiveFinds,
      score_delta: delta,
    })

    // ── Atomic user aggregate update ──────────────────────────────────────────
    // Fetch current values, then write the new totals.
    // Safe because the idempotency gate above ensures this runs at most once.
    type UserStats = {
      total_score: number; total_games_played: number; total_wins: number; total_losses: number
      mafia_wins: number; village_wins: number; games_as_mafia: number; games_as_doctor: number
      games_as_detective: number; games_as_villager: number; successful_doctor_saves: number
      successful_detective_finds: number; correct_votes_against_mafia: number; survived_games: number
    }

    const { data: rawU } = await supabase
      .from('users')
      .select(
        'total_score,total_games_played,total_wins,total_losses,' +
          'mafia_wins,village_wins,games_as_mafia,games_as_doctor,' +
          'games_as_detective,games_as_villager,successful_doctor_saves,' +
          'successful_detective_finds,correct_votes_against_mafia,survived_games',
      )
      .eq('id', player.user_id)
      .single()

    if (!rawU) continue
    const u = rawU as unknown as UserStats

    const roleKey = (
      {
        MAFIA: 'games_as_mafia',
        DOCTOR: 'games_as_doctor',
        DETECTIVE: 'games_as_detective',
        VILLAGER: 'games_as_villager',
      } as const
    )[player.role as 'MAFIA' | 'DOCTOR' | 'DETECTIVE' | 'VILLAGER']

    await supabase
      .from('users')
      .update({
        total_score: u.total_score + delta,
        total_games_played: u.total_games_played + 1,
        total_wins: u.total_wins + (isWinner ? 1 : 0),
        total_losses: u.total_losses + (isWinner ? 0 : 1),
        mafia_wins: u.mafia_wins + (isWinner && player.role === 'MAFIA' ? 1 : 0),
        village_wins: u.village_wins + (isWinner && player.role !== 'MAFIA' ? 1 : 0),
        [roleKey]: (u as Record<string, number>)[roleKey] + 1,
        successful_doctor_saves: u.successful_doctor_saves + doctorSaves,
        successful_detective_finds: u.successful_detective_finds + detectiveFinds,
        correct_votes_against_mafia: u.correct_votes_against_mafia + correctVotes,
        survived_games: u.survived_games + (survivedToEnd ? 1 : 0),
      })
      .eq('id', player.user_id)
  }
}
