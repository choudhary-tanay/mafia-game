'use server'

import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { validateLobby } from '@/lib/lobby'
import { computeAndPersistScores } from '@/lib/scoring'
import {
  buildRoleList,
  checkWinCondition,
  areNightActionsComplete,
  areAllVotesIn,
  isDeadlinePassed,
  futureDeadline,
} from '@/lib/game-engine'
import {
  mafiaKillStory,
  doctorSaveStory,
  voteEliminationStory,
  tieStory,
  abstainStory,
} from '@/lib/stories'
import type { Role, WinCondition } from '@/types/database'

// ─── Phase 3: start game ──────────────────────────────────────────────────────
// buildRoleList is imported from lib/game-engine.ts (exported for testing)

export async function startGame(roomCode: string): Promise<void> {
  const session = await getSession()
  if (!session?.userId) redirect('/login')
  const supabase = createServiceClient()

  const { data: room } = await supabase
    .from('rooms')
    .select('id, host_user_id, status, mafia_count')
    .eq('code', roomCode)
    .maybeSingle()

  if (!room || room.status !== 'LOBBY') redirect(`/lobby/${roomCode}`)
  if (room.host_user_id !== session.userId) redirect(`/lobby/${roomCode}`)

  const { data: players } = await supabase
    .from('room_players')
    .select('user_id')
    .eq('room_id', room.id)

  if (!players || players.length < 4) redirect(`/lobby/${roomCode}`)
  const { canStart } = validateLobby(players.length, room.mafia_count)
  if (!canStart) redirect(`/lobby/${roomCode}`)

  const roles = buildRoleList(players.length, room.mafia_count)

  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({ room_id: room.id, status: 'ROLE_REVEAL', current_phase: 'ROLE_REVEAL', current_round_number: 0 })
    .select('id')
    .single()

  if (gameError || !game) redirect(`/lobby/${roomCode}`)

  await supabase.from('game_players').insert(
    players.map((p, i) => ({
      game_id: game.id,
      room_id: room.id,
      user_id: p.user_id,
      role: roles[i],
      is_alive: true,
      survived_to_end: false,
    })),
  )
  await supabase.from('rooms').update({ status: 'ACTIVE' }).eq('id', room.id)

  redirect(`/game/${game.id}`)
}

// ─── Phase 4: game state machine ─────────────────────────────────────────────

// Begin Night: ROLE_REVEAL or VOTE_RESOLUTION → NIGHT_ACTIONS_OPEN + new round
export async function beginNight(gameId: string): Promise<void> {
  const session = await getSession()
  if (!session?.userId) redirect('/login')
  const supabase = createServiceClient()

  const { data: game } = await supabase
    .from('games')
    .select('id, room_id, current_phase, current_round_number')
    .eq('id', gameId)
    .maybeSingle()

  if (!game) redirect('/dashboard')

  // Security: only a participant can advance
  const { data: me } = await supabase
    .from('game_players')
    .select('role')
    .eq('game_id', gameId)
    .eq('user_id', session.userId)
    .maybeSingle()
  if (!me) redirect('/dashboard')

  // Host check: only host (room host) can advance from ROLE_REVEAL
  const { data: room } = await supabase
    .from('rooms')
    .select('host_user_id, night_timer_seconds')
    .eq('id', game.room_id)
    .single()

  if (room?.host_user_id !== session.userId) return

  const nextRound = game.current_round_number + 1

  const { data: round } = await supabase
    .from('rounds')
    .insert({ game_id: gameId, round_number: nextRound, phase: 'NIGHT_ACTIONS_OPEN' })
    .select('id')
    .single()

  if (!round) return

  await supabase
    .from('games')
    .update({
      current_phase: 'NIGHT_ACTIONS_OPEN',
      status: 'NIGHT_ACTIONS_OPEN',
      current_round_number: nextRound,
      phase_deadline: futureDeadline(room?.night_timer_seconds ?? 60),
    })
    .eq('id', gameId)

  await addEvent(supabase, gameId, round.id, 'NIGHT_STARTED', 'PUBLIC', null,
    `Night ${nextRound} has begun. The village falls asleep.`)
}

// Submit night action (Mafia kill / Doctor save / Detective check)
export async function submitNightAction(
  gameId: string,
  actionType: 'MAFIA_KILL' | 'DOCTOR_SAVE' | 'DETECTIVE_CHECK',
  targetUserId: string,
): Promise<{ error?: string }> {
  const session = await getSession()
  if (!session?.userId) return { error: 'Not authenticated.' }
  const supabase = createServiceClient()

  const { data: game } = await supabase
    .from('games')
    .select('current_phase, current_round_number, phase_deadline')
    .eq('id', gameId)
    .maybeSingle()

  if (!game || game.current_phase !== 'NIGHT_ACTIONS_OPEN')
    return { error: 'Not in night phase.' }
  if (isDeadlinePassed(game.phase_deadline))
    return { error: 'Night phase has ended.' }

  const { data: me } = await supabase
    .from('game_players')
    .select('role, is_alive')
    .eq('game_id', gameId)
    .eq('user_id', session.userId)
    .maybeSingle()

  if (!me?.is_alive) return { error: 'Dead players cannot act.' }

  // Validate role matches action type
  const allowed: Record<string, string[]> = {
    MAFIA_KILL: ['MAFIA'],
    DOCTOR_SAVE: ['DOCTOR'],
    DETECTIVE_CHECK: ['DETECTIVE'],
  }
  if (!allowed[actionType]?.includes(me.role)) return { error: 'Invalid action for your role.' }

  // Verify target is alive
  const { data: target } = await supabase
    .from('game_players')
    .select('is_alive')
    .eq('game_id', gameId)
    .eq('user_id', targetUserId)
    .maybeSingle()

  if (!target?.is_alive) return { error: 'Target is not alive.' }

  // Get current round
  const { data: round } = await supabase
    .from('rounds')
    .select('id')
    .eq('game_id', gameId)
    .eq('round_number', game.current_round_number)
    .maybeSingle()

  if (!round) return { error: 'Round not found.' }

  // Upsert — Mafia can change their kill choice
  await supabase.from('night_actions').upsert(
    {
      game_id: gameId,
      round_id: round.id,
      actor_user_id: session.userId,
      action_type: actionType,
      target_user_id: targetUserId,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: 'round_id,actor_user_id,action_type' },
  )

  // Auto-resolve if all actions in
  const complete = await areNightActionsComplete(supabase, gameId, round.id)
  if (complete) {
    await resolveNight(supabase, gameId, round.id)
  }

  return {}
}

// Submit day vote (targetUserId = null means abstain)
export async function submitVote(
  gameId: string,
  targetUserId: string | null,
): Promise<{ error?: string }> {
  const session = await getSession()
  if (!session?.userId) return { error: 'Not authenticated.' }
  const supabase = createServiceClient()

  const { data: game } = await supabase
    .from('games')
    .select('current_phase, current_round_number, phase_deadline')
    .eq('id', gameId)
    .maybeSingle()

  if (!game || game.current_phase !== 'VOTING')
    return { error: 'Not in voting phase.' }
  if (isDeadlinePassed(game.phase_deadline))
    return { error: 'Voting has ended.' }

  const { data: me } = await supabase
    .from('game_players')
    .select('is_alive')
    .eq('game_id', gameId)
    .eq('user_id', session.userId)
    .maybeSingle()

  if (!me?.is_alive) return { error: 'Dead players cannot vote.' }

  if (targetUserId) {
    const { data: target } = await supabase
      .from('game_players')
      .select('is_alive')
      .eq('game_id', gameId)
      .eq('user_id', targetUserId)
      .maybeSingle()
    if (!target?.is_alive) return { error: 'Target is not alive.' }
  }

  const { data: round } = await supabase
    .from('rounds')
    .select('id')
    .eq('game_id', gameId)
    .eq('round_number', game.current_round_number)
    .maybeSingle()

  if (!round) return { error: 'Round not found.' }

  await supabase.from('votes').upsert(
    {
      game_id: gameId,
      round_id: round.id,
      voter_user_id: session.userId,
      target_user_id: targetUserId,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: 'round_id,voter_user_id' },
  )

  const allIn = await areAllVotesIn(supabase, gameId, round.id)
  if (allIn) {
    await resolveVote(supabase, gameId, round.id)
  }

  return {}
}

// Called by the game page on every render — lazy deadline enforcement.
// Returns true if a phase transition happened (triggers a re-render).
export async function maybeAdvancePhase(gameId: string): Promise<boolean> {
  const supabase = createServiceClient()

  const { data: game } = await supabase
    .from('games')
    .select('id, current_phase, phase_deadline, current_round_number, room_id')
    .eq('id', gameId)
    .maybeSingle()

  if (!game) return false
  if (!isDeadlinePassed(game.phase_deadline)) return false

  const { data: round } = await supabase
    .from('rounds')
    .select('id')
    .eq('game_id', gameId)
    .eq('round_number', game.current_round_number)
    .maybeSingle()

  const phase = game.current_phase

  if (phase === 'NIGHT_ACTIONS_OPEN') {
    if (round) await resolveNight(supabase, gameId, round.id)
    return true
  }
  if (phase === 'DISCUSSION') {
    const { data: room } = await supabase
      .from('rooms')
      .select('voting_timer_seconds')
      .eq('id', game.room_id)
      .single()
    await supabase
      .from('games')
      .update({ current_phase: 'VOTING', status: 'VOTING', phase_deadline: futureDeadline(room?.voting_timer_seconds ?? 60) })
      .eq('id', gameId)
      .eq('current_phase', 'DISCUSSION') // atomic guard
    if (round) {
      await addEvent(supabase, gameId, round.id, 'VOTING_STARTED', 'PUBLIC', null,
        'Voting has started. Cast your vote before time runs out.')
    }
    return true
  }
  if (phase === 'VOTING') {
    if (round) await resolveVote(supabase, gameId, round.id)
    return true
  }

  // VOTE_RESOLUTION: auto-advance to next night after the 5s show-results window.
  if (phase === 'VOTE_RESOLUTION') {
    const { data: room } = await supabase
      .from('rooms')
      .select('night_timer_seconds')
      .eq('id', game.room_id)
      .single()

    const nextRound = game.current_round_number + 1

    // Atomic: only create round if still in VOTE_RESOLUTION
    const { data: newRound, error: roundErr } = await supabase
      .from('rounds')
      .insert({ game_id: gameId, round_number: nextRound, phase: 'NIGHT_ACTIONS_OPEN' })
      .select('id')
      .single()

    if (roundErr || !newRound) return false // round already created by another request

    const { error: advanceErr } = await supabase
      .from('games')
      .update({
        current_phase: 'NIGHT_ACTIONS_OPEN',
        status: 'NIGHT_ACTIONS_OPEN',
        current_round_number: nextRound,
        phase_deadline: futureDeadline(room?.night_timer_seconds ?? 60),
      })
      .eq('id', gameId)
      .eq('current_phase', 'VOTE_RESOLUTION')

    if (!advanceErr && newRound) {
      await addEvent(supabase, gameId, newRound.id, 'NIGHT_STARTED', 'PUBLIC', null,
        `Night ${nextRound} begins. The village falls asleep.`)
    }
    return true
  }

  return false
}

// ─── Internal resolvers ───────────────────────────────────────────────────────

async function resolveNight(
  supabase: ReturnType<typeof createServiceClient>,
  gameId: string,
  roundId: string,
) {
  // Atomic guard: only resolve once
  const { error } = await supabase
    .from('games')
    .update({ current_phase: 'NIGHT_RESOLUTION', status: 'NIGHT_RESOLUTION', phase_deadline: null })
    .eq('id', gameId)
    .eq('current_phase', 'NIGHT_ACTIONS_OPEN')

  if (error) return // already resolved by another request

  // Fetch all night actions for this round
  const { data: actions } = await supabase
    .from('night_actions')
    .select('action_type, actor_user_id, target_user_id, submitted_at')
    .eq('round_id', roundId)
    .order('submitted_at', { ascending: false })

  // Pick kill target: last submitted MAFIA_KILL
  const killAction = actions?.find((a) => a.action_type === 'MAFIA_KILL')
  const killTargetId = killAction?.target_user_id ?? null

  // Pick save target: any DOCTOR_SAVE
  const saveAction = actions?.find((a) => a.action_type === 'DOCTOR_SAVE')
  const saveTargetId = saveAction?.target_user_id ?? null

  // Detective check
  const detectiveAction = actions?.find((a) => a.action_type === 'DETECTIVE_CHECK')

  let killed: string | null = null
  let saved = false

  if (killTargetId) {
    if (killTargetId === saveTargetId) {
      saved = true
      await addEvent(supabase, gameId, roundId, 'PLAYER_SAVED_BY_DOCTOR', 'PUBLIC', null,
        doctorSaveStory())
    } else {
      killed = killTargetId
      // Get display name for story
      const { data: victim } = await supabase
        .from('room_players')
        .select('display_name, rooms!inner(id)')
        .eq('user_id', killTargetId)
        .maybeSingle()
      const name = (victim as { display_name: string } | null)?.display_name ?? 'Someone'

      await supabase
        .from('game_players')
        .update({ is_alive: false, death_round_number: (await getRoundNumber(supabase, roundId)), death_cause: 'MAFIA_KILL' })
        .eq('game_id', gameId)
        .eq('user_id', killTargetId)

      await addEvent(supabase, gameId, roundId, 'PLAYER_KILLED_BY_MAFIA', 'PUBLIC', killTargetId,
        mafiaKillStory(name))
    }
  } else {
    await addEvent(supabase, gameId, roundId, 'PLAYER_SAVED_BY_DOCTOR', 'PUBLIC', null,
      'The night passed quietly. No one was eliminated.')
  }

  // Detective result (private)
  if (detectiveAction?.target_user_id) {
    const { data: suspect } = await supabase
      .from('game_players')
      .select('role')
      .eq('game_id', gameId)
      .eq('user_id', detectiveAction.target_user_id)
      .maybeSingle()

    const isMafia = suspect?.role === 'MAFIA'
    const { data: suspectName } = await supabase
      .from('room_players')
      .select('display_name')
      .eq('user_id', detectiveAction.target_user_id)
      .maybeSingle()

    const name = (suspectName as { display_name: string } | null)?.display_name ?? 'Your target'
    await addEvent(
      supabase, gameId, roundId, 'DETECTIVE_INVESTIGATION',
      'PRIVATE_TO_PLAYER', detectiveAction.target_user_id,
      isMafia ? `${name} is MAFIA.` : `${name} is NOT Mafia.`,
      detectiveAction.actor_user_id,
    )
  }

  // Check win condition
  const winner = await checkWinCondition(supabase, gameId)
  if (winner) {
    await endGame(supabase, gameId, roundId, winner)
    return
  }

  // Advance to DAY_ANNOUNCEMENT
  const { data: room } = await supabase
    .from('rooms')
    .select('discussion_timer_seconds')
    .eq('id', (await supabase.from('games').select('room_id').eq('id', gameId).single()).data?.room_id)
    .maybeSingle()

  await supabase
    .from('games')
    .update({ current_phase: 'DISCUSSION', status: 'DISCUSSION', phase_deadline: futureDeadline(room?.discussion_timer_seconds ?? 180) })
    .eq('id', gameId)

  await addEvent(supabase, gameId, roundId, 'DISCUSSION_STARTED', 'PUBLIC', null,
    'The village wakes up. Discussion has begun.')
}

async function resolveVote(
  supabase: ReturnType<typeof createServiceClient>,
  gameId: string,
  roundId: string,
) {
  const { error } = await supabase
    .from('games')
    .update({ current_phase: 'VOTE_RESOLUTION', status: 'VOTE_RESOLUTION', phase_deadline: null })
    .eq('id', gameId)
    .eq('current_phase', 'VOTING')

  if (error) return

  const { data: allVotes } = await supabase
    .from('votes')
    .select('target_user_id')
    .eq('round_id', roundId)

  // Count votes
  const counts = new Map<string, number>()
  let abstains = 0
  for (const v of allVotes ?? []) {
    if (!v.target_user_id) { abstains++; continue }
    counts.set(v.target_user_id, (counts.get(v.target_user_id) ?? 0) + 1)
  }

  let eliminated: string | null = null

  if (counts.size === 0) {
    await addEvent(supabase, gameId, roundId, 'NO_ELIMINATION_ABSTAIN', 'PUBLIC', null, abstainStory())
  } else {
    const maxVotes = Math.max(...counts.values())
    const topCandidates = [...counts.entries()].filter(([, c]) => c === maxVotes)
    if (topCandidates.length > 1) {
      // Tie — NO_ELIMINATION rule
      await addEvent(supabase, gameId, roundId, 'NO_ELIMINATION_TIE', 'PUBLIC', null, tieStory())
    } else {
      eliminated = topCandidates[0][0]
      const { data: victim } = await supabase
        .from('room_players')
        .select('display_name')
        .eq('user_id', eliminated)
        .maybeSingle()
      const name = (victim as { display_name: string } | null)?.display_name ?? 'Someone'

      const roundNum = await getRoundNumber(supabase, roundId)
      await supabase
        .from('game_players')
        .update({ is_alive: false, death_round_number: roundNum, death_cause: 'VOTE' })
        .eq('game_id', gameId)
        .eq('user_id', eliminated)

      await addEvent(supabase, gameId, roundId, 'PLAYER_ELIMINATED_BY_VOTE', 'PUBLIC', eliminated,
        voteEliminationStory(name))
    }
  }

  const winner = await checkWinCondition(supabase, gameId)
  if (winner) {
    await endGame(supabase, gameId, roundId, winner)
    return
  }

  // Continue to next night — small delay via 5s deadline so players see result
  await supabase
    .from('games')
    .update({ current_phase: 'VOTE_RESOLUTION', phase_deadline: futureDeadline(5) })
    .eq('id', gameId)
}

// Called from game page after VOTE_RESOLUTION deadline — advances to next night
export async function beginNextNight(gameId: string): Promise<void> {
  const session = await getSession()
  if (!session?.userId) redirect('/login')
  const supabase = createServiceClient()

  const { data: game } = await supabase
    .from('games')
    .select('room_id, current_phase, current_round_number')
    .eq('id', gameId)
    .maybeSingle()

  if (!game || game.current_phase !== 'VOTE_RESOLUTION') return

  const { data: room } = await supabase
    .from('rooms')
    .select('night_timer_seconds')
    .eq('id', game.room_id)
    .single()

  const nextRound = game.current_round_number + 1
  const { data: round } = await supabase
    .from('rounds')
    .insert({ game_id: gameId, round_number: nextRound, phase: 'NIGHT_ACTIONS_OPEN' })
    .select('id')
    .single()

  if (!round) return

  await supabase
    .from('games')
    .update({
      current_phase: 'NIGHT_ACTIONS_OPEN',
      status: 'NIGHT_ACTIONS_OPEN',
      current_round_number: nextRound,
      phase_deadline: futureDeadline(room?.night_timer_seconds ?? 60),
    })
    .eq('id', gameId)

  await addEvent(supabase, gameId, round.id, 'NIGHT_STARTED', 'PUBLIC', null,
    `Night ${nextRound} begins. The village falls asleep again.`)
}

// ─── Utilities ────────────────────────────────────────────────────────────────

async function endGame(
  supabase: ReturnType<typeof createServiceClient>,
  gameId: string,
  roundId: string,
  winner: WinCondition,
) {
  await supabase
    .from('games')
    .update({
      current_phase: 'GAME_OVER',
      status: 'GAME_OVER',
      winning_team: winner,
      ended_at: new Date().toISOString(),
      phase_deadline: null,
    })
    .eq('id', gameId)

  const msg =
    winner === 'VILLAGE'
      ? 'Village wins! All Mafia have been eliminated.'
      : 'Mafia wins! They now control the village.'
  await addEvent(supabase, gameId, roundId, 'GAME_ENDED', 'PUBLIC', null, msg)

  // Scoring — runs after the game event is committed so data is complete.
  // computeAndPersistScores is idempotent; safe to call even if called twice.
  if (winner) {
    await computeAndPersistScores(supabase, gameId, winner)
  }
}

async function addEvent(
  supabase: ReturnType<typeof createServiceClient>,
  gameId: string,
  roundId: string,
  eventType: string,
  visibility: 'PUBLIC' | 'PRIVATE_TO_PLAYER',
  targetPlayerId: string | null,
  message: string,
  recipientUserId?: string,
) {
  await supabase.from('game_events').insert({
    game_id: gameId,
    round_id: roundId,
    event_type: eventType,
    visibility,
    target_player_id: targetPlayerId,
    recipient_user_id: recipientUserId ?? null,
    message,
  })
}

async function getRoundNumber(
  supabase: ReturnType<typeof createServiceClient>,
  roundId: string,
): Promise<number> {
  const { data } = await supabase.from('rounds').select('round_number').eq('id', roundId).single()
  return data?.round_number ?? 0
}
