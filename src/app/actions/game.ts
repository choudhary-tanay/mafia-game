'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { getPlayerIdentity } from '@/lib/identity'
import {
  gamePlayerInsertPayload,
  hasGuestPlayerColumns,
  nightActionsResolutionSelect,
  playerIdentityFilter,
  roomPlayersSelect,
  stablePlayerOrFilter,
} from '@/lib/guest-schema'
import { validateLobby } from '@/lib/lobby'
import { computeAndPersistScores } from '@/lib/scoring'
import { broadcastGameUpdate } from '@/lib/realtime'
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

type StablePlayerRow = {
  user_id: string | null
  guest_id?: string | null
  display_name?: string | null
  is_alive?: boolean
  role?: Role
}

async function getGamePlayerByStableId(
  supabase: ReturnType<typeof createServiceClient>,
  gameId: string,
  playerId: string,
  hasGuestColumns: boolean,
  select = hasGuestColumns
    ? 'user_id, guest_id, display_name, is_alive, role'
    : 'user_id, is_alive, role',
) {
  const { data } = await supabase
    .from('game_players')
    .select(select)
    .eq('game_id', gameId)
    .or(stablePlayerOrFilter(playerId, hasGuestColumns))
    .maybeSingle()

  return data as StablePlayerRow | null
}

async function getDisplayNameForStableId(
  supabase: ReturnType<typeof createServiceClient>,
  gameId: string,
  playerId: string | null,
  hasGuestColumns: boolean,
): Promise<string> {
  if (!playerId) return 'Someone'
  const player = await getGamePlayerByStableId(
    supabase,
    gameId,
    playerId,
    hasGuestColumns,
    hasGuestColumns ? 'display_name, user_id, guest_id' : 'room_id, user_id',
  ) as (StablePlayerRow & { room_id?: string | null }) | null

  if (player?.display_name) return player.display_name
  if (!player?.room_id) return 'Someone'

  const { data: roomPlayer } = await supabase
    .from('room_players')
    .select('display_name')
    .eq('room_id', player.room_id)
    .eq('user_id', playerId)
    .maybeSingle()

  return (roomPlayer as { display_name?: string } | null)?.display_name ?? 'Someone'
}

// ─── Phase 3: start game ──────────────────────────────────────────────────────
// buildRoleList is imported from lib/game-engine.ts (exported for testing)

export async function startGame(roomCode: string): Promise<void> {
  const identity = await getPlayerIdentity()
  if (!identity) redirect(`/join/${roomCode}`)
  const supabase = createServiceClient()

  const { data: room } = await supabase
    .from('rooms')
    .select('id, host_user_id, host_guest_id, status, mafia_count')
    .eq('code', roomCode)
    .maybeSingle()

  if (!room || room.status !== 'LOBBY') redirect(`/lobby/${roomCode}`)

  const isHost =
    (identity.userId  && room.host_user_id  === identity.userId) ||
    (identity.guestId && room.host_guest_id === identity.guestId)
  if (!isHost) redirect(`/lobby/${roomCode}`)

  const hasGuestColumns = await hasGuestPlayerColumns(supabase)
  const { data: players } = await supabase
    .from('room_players')
    .select(roomPlayersSelect(hasGuestColumns))
    .eq('room_id', room.id)

  if (!players || players.length < 4) redirect(`/lobby/${roomCode}`)
  const { canStart } = validateLobby(players.length, room.mafia_count)
  if (!canStart) redirect(`/lobby/${roomCode}`)

  const roles = buildRoleList(players.length, room.mafia_count)

  // Claim the room atomically BEFORE creating the game. A concurrent second
  // start (double-click, second tab) matches zero rows here and is bounced to
  // the lobby, which forwards to the one game that was actually created.
  const { data: roomClaim } = await supabase
    .from('rooms')
    .update({ status: 'ACTIVE' })
    .eq('id', room.id)
    .eq('status', 'LOBBY')
    .select('id')
  if (!roomClaim?.length) redirect(`/lobby/${roomCode}`)

  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({ room_id: room.id, status: 'ROLE_REVEAL', current_phase: 'ROLE_REVEAL', current_round_number: 0 })
    .select('id')
    .single()

  if (gameError || !game) {
    await supabase.from('rooms').update({ status: 'LOBBY' }).eq('id', room.id)
    redirect(`/lobby/${roomCode}`)
  }

  const { error: playersError } = await supabase.from('game_players').insert(
    players.map((p, i) => ({
      ...gamePlayerInsertPayload({
        hasGuestColumns,
        gameId: game.id,
        roomId: room.id,
        player: p as unknown as {
          user_id: string | null
          guest_id?: string | null
          is_guest?: boolean | null
          display_name?: string | null
        },
        role: roles[i],
      }),
    })),
  )

  if (playersError) {
    await supabase.from('games').delete().eq('id', game.id)
    await supabase.from('rooms').update({ status: 'LOBBY' }).eq('id', room.id)
    redirect(`/lobby/${roomCode}`)
  }

  redirect(`/game/${game.id}`)
}

// ─── Phase 4: game state machine ─────────────────────────────────────────────

// Begin Night: ROLE_REVEAL or VOTE_RESOLUTION → NIGHT_ACTIONS_OPEN + new round
export async function beginNight(gameId: string): Promise<void> {
  const identity = await getPlayerIdentity()
  if (!identity) redirect('/')
  const supabase = createServiceClient()

  const { data: game } = await supabase
    .from('games')
    .select('id, room_id, current_phase, current_round_number')
    .eq('id', gameId)
    .maybeSingle()

  if (!game) redirect('/')

  const hasGuestColumns = await hasGuestPlayerColumns(supabase)

  // Security: only a participant can advance
  const { data: me } = await supabase
    .from('game_players')
    .select('role')
    .eq('game_id', gameId)
    .match(playerIdentityFilter(identity, hasGuestColumns))
    .maybeSingle()
  if (!me) redirect('/')

  // Host check: only the room host can begin night
  const { data: room } = await supabase
    .from('rooms')
    .select('host_user_id, host_guest_id, night_timer_seconds')
    .eq('id', game.room_id)
    .single()

  const isHost =
    (identity.userId  && room?.host_user_id  === identity.userId) ||
    (identity.guestId && room?.host_guest_id === identity.guestId)
  if (!isHost) return

  // Only valid from ROLE_REVEAL — a stale tab or double-click must not skip
  // an in-progress day or restart the night.
  if (game.current_phase !== 'ROLE_REVEAL') return

  const nextRound = game.current_round_number + 1

  // Atomic claim: zero rows updated means another request already advanced.
  const { data: claim } = await supabase
    .from('games')
    .update({
      current_phase: 'NIGHT_ACTIONS_OPEN',
      status: 'NIGHT_ACTIONS_OPEN',
      current_round_number: nextRound,
      phase_deadline: futureDeadline(room?.night_timer_seconds ?? 60),
    })
    .eq('id', gameId)
    .eq('current_phase', 'ROLE_REVEAL')
    .select('id')
  if (!claim?.length) return

  const { data: round } = await supabase
    .from('rounds')
    .insert({ game_id: gameId, round_number: nextRound, phase: 'NIGHT_ACTIONS_OPEN' })
    .select('id')
    .single()

  if (round) {
    await addEvent(supabase, gameId, round.id, 'NIGHT_STARTED', 'PUBLIC', null,
      `Night ${nextRound} has begun. The village falls asleep.`)
  }

  await broadcastGameUpdate(gameId, 'phase_changed', { phase: 'NIGHT_ACTIONS_OPEN' })
  revalidatePath(`/game/${gameId}`)
}

// Submit night action (Mafia kill / Doctor save / Detective check)
export async function submitNightAction(
  gameId: string,
  actionType: 'MAFIA_KILL' | 'DOCTOR_SAVE' | 'DETECTIVE_CHECK',
  targetUserId: string,
): Promise<{ error?: string }> {
  const identity = await getPlayerIdentity()
  if (!identity) return { error: 'Not authenticated.' }
  const supabase = createServiceClient()
  const hasGuestColumns = await hasGuestPlayerColumns(supabase)

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
    .match(playerIdentityFilter(identity, hasGuestColumns))
    .maybeSingle()

  if (!me?.is_alive) return { error: 'Dead players cannot act.' }

  const allowed: Record<string, string[]> = {
    MAFIA_KILL: ['MAFIA'], DOCTOR_SAVE: ['DOCTOR'], DETECTIVE_CHECK: ['DETECTIVE'],
  }
  if (!allowed[actionType]?.includes(me.role)) return { error: 'Invalid action for your role.' }

  const target = await getGamePlayerByStableId(
    supabase,
    gameId,
    targetUserId,
    hasGuestColumns,
    hasGuestColumns ? 'is_alive, user_id, guest_id' : 'is_alive, user_id',
  )

  if (!target?.is_alive) return { error: 'Target is not alive.' }

  const { data: round } = await supabase
    .from('rounds')
    .select('id')
    .eq('game_id', gameId)
    .eq('round_number', game.current_round_number)
    .maybeSingle()

  if (!round) return { error: 'Round not found.' }

  const actorStableId = identity.userId ?? identity.guestId!
  // No upsert here: the partial unique indexes on night_actions cannot arbitrate
  // a PostgREST ON CONFLICT (Postgres 42P10), so select-then-update/insert.
  const actorCol = identity.userId || !hasGuestColumns ? 'actor_user_id' : 'actor_guest_id'

  const { data: existingAction } = await supabase
    .from('night_actions')
    .select('id')
    .eq('round_id', round.id)
    .eq('action_type', actionType)
    .eq(actorCol, actorStableId)
    .limit(1)
    .maybeSingle()

  let actionError = null
  if (existingAction) {
    const { error } = await supabase
      .from('night_actions')
      .update({ target_user_id: targetUserId, submitted_at: new Date().toISOString() })
      .eq('id', existingAction.id)
    actionError = error
  } else {
    const { error } = await supabase.from('night_actions').insert(
      hasGuestColumns
        ? {
            game_id: gameId,
            round_id: round.id,
            actor_user_id:  identity.userId  ?? null,
            actor_guest_id: identity.guestId ?? null,
            action_type: actionType,
            target_user_id: targetUserId,
            submitted_at: new Date().toISOString(),
          }
        : {
            game_id: gameId,
            round_id: round.id,
            actor_user_id: actorStableId,
            action_type: actionType,
            target_user_id: targetUserId,
            submitted_at: new Date().toISOString(),
          },
    )
    if (error?.code === '23505') {
      // Lost a concurrent-insert race — update the row that won instead.
      const { error: retryError } = await supabase
        .from('night_actions')
        .update({ target_user_id: targetUserId, submitted_at: new Date().toISOString() })
        .eq('round_id', round.id)
        .eq('action_type', actionType)
        .eq(actorCol, actorStableId)
      actionError = retryError
    } else {
      actionError = error
    }
  }

  if (actionError) return { error: 'Could not submit night action.' }

  const complete = await areNightActionsComplete(supabase, gameId, round.id, hasGuestColumns)
  if (complete) await resolveNight(supabase, gameId, round.id, hasGuestColumns)

  return {}
}

// Submit day vote (targetUserId = null means abstain)
export async function submitVote(
  gameId: string,
  targetUserId: string | null,
): Promise<{ error?: string }> {
  const identity = await getPlayerIdentity()
  if (!identity) return { error: 'Not authenticated.' }
  const supabase = createServiceClient()
  const hasGuestColumns = await hasGuestPlayerColumns(supabase)

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
    .match(playerIdentityFilter(identity, hasGuestColumns))
    .maybeSingle()

  if (!me?.is_alive) return { error: 'Dead players cannot vote.' }

  if (targetUserId) {
    const target = await getGamePlayerByStableId(
      supabase,
      gameId,
      targetUserId,
      hasGuestColumns,
      hasGuestColumns ? 'is_alive, user_id, guest_id' : 'is_alive, user_id',
    )
    if (!target?.is_alive) return { error: 'Target is not alive.' }
  }

  const { data: round } = await supabase
    .from('rounds')
    .select('id')
    .eq('game_id', gameId)
    .eq('round_number', game.current_round_number)
    .maybeSingle()

  if (!round) return { error: 'Round not found.' }

  const voterStableId = identity.userId ?? identity.guestId!
  // No upsert here either — same partial-index/ON CONFLICT limitation as
  // night_actions: select-then-update/insert.
  const voterCol = identity.userId || !hasGuestColumns ? 'voter_user_id' : 'voter_guest_id'

  const { data: existingVote } = await supabase
    .from('votes')
    .select('id')
    .eq('round_id', round.id)
    .eq(voterCol, voterStableId)
    .limit(1)
    .maybeSingle()

  let voteError = null
  if (existingVote) {
    const { error } = await supabase
      .from('votes')
      .update({ target_user_id: targetUserId, submitted_at: new Date().toISOString() })
      .eq('id', existingVote.id)
    voteError = error
  } else {
    const { error } = await supabase.from('votes').insert(
      hasGuestColumns
        ? {
            game_id: gameId,
            round_id: round.id,
            voter_user_id:  identity.userId  ?? null,
            voter_guest_id: identity.guestId ?? null,
            target_user_id: targetUserId,
            submitted_at: new Date().toISOString(),
          }
        : {
            game_id: gameId,
            round_id: round.id,
            voter_user_id: voterStableId,
            target_user_id: targetUserId,
            submitted_at: new Date().toISOString(),
          },
    )
    if (error?.code === '23505') {
      const { error: retryError } = await supabase
        .from('votes')
        .update({ target_user_id: targetUserId, submitted_at: new Date().toISOString() })
        .eq('round_id', round.id)
        .eq(voterCol, voterStableId)
      voteError = retryError
    } else {
      voteError = error
    }
  }

  if (voteError) return { error: 'Could not submit vote.' }

  const allIn = await areAllVotesIn(supabase, gameId, round.id)
  if (allIn) await resolveVote(supabase, gameId, round.id, hasGuestColumns)

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
  const hasGuestColumns = await hasGuestPlayerColumns(supabase)

  const { data: round } = await supabase
    .from('rounds')
    .select('id')
    .eq('game_id', gameId)
    .eq('round_number', game.current_round_number)
    .maybeSingle()

  const phase = game.current_phase

  if (phase === 'NIGHT_ACTIONS_OPEN') {
    if (round) {
      await resolveNight(supabase, gameId, round.id, hasGuestColumns)
      return true
    }
    // Recovery: phase advanced but the round row was never created (crash
    // between the phase claim and the round insert). Create it and re-arm
    // the deadline so players can actually act.
    const { data: room } = await supabase
      .from('rooms')
      .select('night_timer_seconds')
      .eq('id', game.room_id)
      .single()
    await supabase
      .from('rounds')
      .insert({ game_id: gameId, round_number: game.current_round_number, phase: 'NIGHT_ACTIONS_OPEN' })
    await supabase
      .from('games')
      .update({ phase_deadline: futureDeadline(room?.night_timer_seconds ?? 60) })
      .eq('id', gameId)
      .eq('current_phase', 'NIGHT_ACTIONS_OPEN')
    return true
  }

  // Recovery: resolveNight crashed after claiming NIGHT_RESOLUTION (its 20s
  // safety deadline expired). Run the win check and finish the transition.
  if (phase === 'NIGHT_RESOLUTION') {
    const winner = await checkWinCondition(supabase, gameId)
    if (winner) {
      if (round) await endGame(supabase, gameId, round.id, winner)
      return true
    }
    const { data: room } = await supabase
      .from('rooms')
      .select('discussion_timer_seconds')
      .eq('id', game.room_id)
      .single()
    const { data: claim } = await supabase
      .from('games')
      .update({ current_phase: 'DISCUSSION', status: 'DISCUSSION', phase_deadline: futureDeadline(room?.discussion_timer_seconds ?? 180) })
      .eq('id', gameId)
      .eq('current_phase', 'NIGHT_RESOLUTION')
      .select('id')
    if (claim?.length) {
      if (round) {
        await addEvent(supabase, gameId, round.id, 'DISCUSSION_STARTED', 'PUBLIC', null,
          'The village wakes up. Discussion has begun.')
      }
      await broadcastGameUpdate(gameId, 'phase_changed', { phase: 'DISCUSSION' })
    }
    return true
  }

  if (phase === 'DISCUSSION') {
    const { data: room } = await supabase
      .from('rooms')
      .select('voting_timer_seconds')
      .eq('id', game.room_id)
      .single()
    // Atomic claim: zero rows updated = another request already advanced.
    const { data: claim } = await supabase
      .from('games')
      .update({ current_phase: 'VOTING', status: 'VOTING', phase_deadline: futureDeadline(room?.voting_timer_seconds ?? 60) })
      .eq('id', gameId)
      .eq('current_phase', 'DISCUSSION')
      .select('id')
    if (!claim?.length) return false
    if (round) {
      await addEvent(supabase, gameId, round.id, 'VOTING_STARTED', 'PUBLIC', null,
        'Voting has started. Cast your vote before time runs out.')
    }
    await broadcastGameUpdate(gameId, 'phase_changed', { phase: 'VOTING' })
    return true
  }
  if (phase === 'VOTING') {
    if (round) await resolveVote(supabase, gameId, round.id, hasGuestColumns)
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

    // Claim the phase FIRST — only the winner inserts the new round, so
    // concurrent pollers can never create duplicate rounds.
    const { data: claim } = await supabase
      .from('games')
      .update({
        current_phase: 'NIGHT_ACTIONS_OPEN',
        status: 'NIGHT_ACTIONS_OPEN',
        current_round_number: nextRound,
        phase_deadline: futureDeadline(room?.night_timer_seconds ?? 60),
      })
      .eq('id', gameId)
      .eq('current_phase', 'VOTE_RESOLUTION')
      .select('id')
    if (!claim?.length) return false

    const { data: newRound } = await supabase
      .from('rounds')
      .insert({ game_id: gameId, round_number: nextRound, phase: 'NIGHT_ACTIONS_OPEN' })
      .select('id')
      .single()

    if (newRound) {
      await addEvent(supabase, gameId, newRound.id, 'NIGHT_STARTED', 'PUBLIC', null,
        `Night ${nextRound} begins. The village falls asleep.`)
    }
    await broadcastGameUpdate(gameId, 'phase_changed', { phase: 'NIGHT_ACTIONS_OPEN' })
    return true
  }

  return false
}

// ─── Internal resolvers ───────────────────────────────────────────────────────

async function resolveNight(
  supabase: ReturnType<typeof createServiceClient>,
  gameId: string,
  roundId: string,
  hasGuestColumns: boolean,
) {
  // Atomic claim: a zero-row update returns NO error from supabase-js, so the
  // only reliable race signal is the returned row count. The 20s deadline is a
  // safety net — maybeAdvancePhase recovers if this invocation dies mid-way.
  const { data: claim } = await supabase
    .from('games')
    .update({ current_phase: 'NIGHT_RESOLUTION', status: 'NIGHT_RESOLUTION', phase_deadline: futureDeadline(20) })
    .eq('id', gameId)
    .eq('current_phase', 'NIGHT_ACTIONS_OPEN')
    .select('id')

  if (!claim?.length) return // already resolved by another request

  // Fetch all night actions for this round
  const { data: actions } = await supabase
    .from('night_actions')
    .select(nightActionsResolutionSelect(hasGuestColumns))
    .eq('round_id', roundId)
    .order('submitted_at', { ascending: false })
  const nightActions = (actions ?? []) as unknown as {
    action_type: string
    actor_user_id: string | null
    actor_guest_id?: string | null
    target_user_id: string | null
    submitted_at: string
  }[]

  // Pick kill target: last submitted MAFIA_KILL
  const killAction = nightActions.find((a) => a.action_type === 'MAFIA_KILL')
  const killTargetId = killAction?.target_user_id ?? null

  // Pick save target: any DOCTOR_SAVE
  const saveAction = nightActions.find((a) => a.action_type === 'DOCTOR_SAVE')
  const saveTargetId = saveAction?.target_user_id ?? null

  // Detective check
  const detectiveAction = nightActions.find((a) => a.action_type === 'DETECTIVE_CHECK')

  if (killTargetId) {
    if (killTargetId === saveTargetId) {
      await addEvent(supabase, gameId, roundId, 'PLAYER_SAVED_BY_DOCTOR', 'PUBLIC', null,
        doctorSaveStory())
    } else {
      const name = await getDisplayNameForStableId(supabase, gameId, killTargetId, hasGuestColumns)

      await supabase
        .from('game_players')
        .update({ is_alive: false, death_round_number: (await getRoundNumber(supabase, roundId)), death_cause: 'MAFIA_KILL' })
        .eq('game_id', gameId)
        .or(stablePlayerOrFilter(killTargetId, hasGuestColumns))

      await addEvent(supabase, gameId, roundId, 'PLAYER_KILLED_BY_MAFIA', 'PUBLIC', killTargetId,
        mafiaKillStory(name))
    }
  } else {
    // Distinct event type: PLAYER_SAVED_BY_DOCTOR is reserved for a real
    // blocked kill — scoring counts doctor saves from it.
    await addEvent(supabase, gameId, roundId, 'NIGHT_QUIET', 'PUBLIC', null,
      'The night passed quietly. No one was eliminated.')
  }

  // Detective result (private)
  if (detectiveAction?.target_user_id) {
    const suspect = await getGamePlayerByStableId(
      supabase,
      gameId,
      detectiveAction.target_user_id,
      hasGuestColumns,
      hasGuestColumns ? 'role, user_id, guest_id' : 'role, user_id',
    )

    const isMafia = suspect?.role === 'MAFIA'

    const name = await getDisplayNameForStableId(supabase, gameId, detectiveAction.target_user_id, hasGuestColumns)
    const detectiveRecipientId =
      detectiveAction.actor_user_id ?? (detectiveAction as { actor_guest_id?: string | null }).actor_guest_id ?? null

    await addEvent(
      supabase, gameId, roundId, 'DETECTIVE_INVESTIGATION',
      'PRIVATE_TO_PLAYER', detectiveAction.target_user_id,
      isMafia ? `${name} is MAFIA.` : `${name} is NOT Mafia.`,
      detectiveRecipientId ?? undefined,
    )
  }

  // Check win condition
  const winner = await checkWinCondition(supabase, gameId)
  if (winner) {
    await endGame(supabase, gameId, roundId, winner)
    return
  }

  // Advance to DISCUSSION — guarded so a stale resolver can't regress an
  // already-advanced game.
  const { data: room } = await supabase
    .from('rooms')
    .select('discussion_timer_seconds')
    .eq('id', (await supabase.from('games').select('room_id').eq('id', gameId).single()).data?.room_id)
    .maybeSingle()

  await supabase
    .from('games')
    .update({ current_phase: 'DISCUSSION', status: 'DISCUSSION', phase_deadline: futureDeadline(room?.discussion_timer_seconds ?? 180) })
    .eq('id', gameId)
    .eq('current_phase', 'NIGHT_RESOLUTION')

  await addEvent(supabase, gameId, roundId, 'DISCUSSION_STARTED', 'PUBLIC', null,
    'The village wakes up. Discussion has begun.')

  await broadcastGameUpdate(gameId, 'phase_changed', { phase: 'DISCUSSION' })
}

async function resolveVote(
  supabase: ReturnType<typeof createServiceClient>,
  gameId: string,
  roundId: string,
  hasGuestColumns: boolean,
) {
  // Atomic claim (rowcount check — see resolveNight). The 20s deadline lets
  // maybeAdvancePhase recover if this invocation dies before the 5s window
  // below is armed.
  const { data: claim } = await supabase
    .from('games')
    .update({ current_phase: 'VOTE_RESOLUTION', status: 'VOTE_RESOLUTION', phase_deadline: futureDeadline(20) })
    .eq('id', gameId)
    .eq('current_phase', 'VOTING')
    .select('id')

  if (!claim?.length) return

  const { data: allVotes } = await supabase
    .from('votes')
    .select('target_user_id')
    .eq('round_id', roundId)

  // Count votes
  const counts = new Map<string, number>()
  for (const v of allVotes ?? []) {
    if (!v.target_user_id) continue
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
      const name = await getDisplayNameForStableId(supabase, gameId, eliminated, hasGuestColumns)

      const roundNum = await getRoundNumber(supabase, roundId)
      await supabase
        .from('game_players')
        .update({ is_alive: false, death_round_number: roundNum, death_cause: 'VOTE' })
        .eq('game_id', gameId)
        .or(stablePlayerOrFilter(eliminated, hasGuestColumns))

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
    .eq('current_phase', 'VOTE_RESOLUTION')

  await broadcastGameUpdate(gameId, 'phase_changed', { phase: 'VOTE_RESOLUTION' })
}

// Called from game page after VOTE_RESOLUTION deadline — advances to next night
export async function beginNextNight(gameId: string): Promise<void> {
  const identity = await getPlayerIdentity()
  if (!identity) redirect('/')
  const supabase = createServiceClient()

  const { data: game } = await supabase
    .from('games')
    .select('room_id, current_phase, current_round_number')
    .eq('id', gameId)
    .maybeSingle()

  if (!game || game.current_phase !== 'VOTE_RESOLUTION') return

  const { data: room } = await supabase
    .from('rooms')
    .select('host_user_id, host_guest_id, night_timer_seconds')
    .eq('id', game.room_id)
    .single()

  const isHost =
    (identity.userId  && room?.host_user_id  === identity.userId) ||
    (identity.guestId && room?.host_guest_id === identity.guestId)
  if (!isHost) return

  const nextRound = game.current_round_number + 1

  // Claim the phase first — beats the race against maybeAdvancePhase's
  // 5s auto-advance; only the winner inserts the round.
  const { data: claim } = await supabase
    .from('games')
    .update({
      current_phase: 'NIGHT_ACTIONS_OPEN',
      status: 'NIGHT_ACTIONS_OPEN',
      current_round_number: nextRound,
      phase_deadline: futureDeadline(room?.night_timer_seconds ?? 60),
    })
    .eq('id', gameId)
    .eq('current_phase', 'VOTE_RESOLUTION')
    .select('id')
  if (!claim?.length) return

  const { data: round } = await supabase
    .from('rounds')
    .insert({ game_id: gameId, round_number: nextRound, phase: 'NIGHT_ACTIONS_OPEN' })
    .select('id')
    .single()

  if (round) {
    await addEvent(supabase, gameId, round.id, 'NIGHT_STARTED', 'PUBLIC', null,
      `Night ${nextRound} begins. The village falls asleep again.`)
  }

  await broadcastGameUpdate(gameId, 'phase_changed', { phase: 'NIGHT_ACTIONS_OPEN' })
  revalidatePath(`/game/${gameId}`)
}

// ─── Host: end discussion early ───────────────────────────────────────────────

export async function endDiscussionEarly(
  gameId: string,
): Promise<{ error?: string }> {
  const identity = await getPlayerIdentity()
  if (!identity) return { error: 'Not authenticated.' }

  const supabase = createServiceClient()

  const { data: game } = await supabase
    .from('games')
    .select('id, room_id, current_phase, current_round_number')
    .eq('id', gameId)
    .maybeSingle()

  if (!game) return { error: 'Game not found.' }
  if (game.current_phase !== 'DISCUSSION') return { error: 'Not in discussion phase.' }

  const { data: room } = await supabase
    .from('rooms')
    .select('host_user_id, host_guest_id, voting_timer_seconds')
    .eq('id', game.room_id)
    .single()

  const isHost =
    (identity.userId  && room?.host_user_id  === identity.userId) ||
    (identity.guestId && room?.host_guest_id === identity.guestId)
  if (!room || !isHost) {
    return { error: 'Only the host can end discussion.' }
  }

  const { data: round } = await supabase
    .from('rounds')
    .select('id')
    .eq('game_id', gameId)
    .eq('round_number', game.current_round_number)
    .maybeSingle()

  // Atomic claim (rowcount, not error — zero-row updates don't error)
  const { data: claim } = await supabase
    .from('games')
    .update({
      current_phase: 'VOTING',
      status: 'VOTING',
      phase_deadline: futureDeadline(room.voting_timer_seconds ?? 60),
    })
    .eq('id', gameId)
    .eq('current_phase', 'DISCUSSION')
    .select('id')

  if (!claim?.length) return { error: 'Discussion already ended.' }

  if (round) {
    await addEvent(supabase, gameId, round.id, 'VOTING_STARTED', 'PUBLIC', null,
      'The host ended discussion early. Voting has started — cast your vote.')
  }

  await broadcastGameUpdate(gameId, 'phase_changed', { phase: 'VOTING' })
  revalidatePath(`/game/${gameId}`)
  return {}
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

  // Return the room to LOBBY so the same group can play again with the same
  // code (players stay in room_players; the GAME_OVER screen links back).
  const { data: g } = await supabase.from('games').select('room_id').eq('id', gameId).single()
  if (g?.room_id) {
    await supabase.from('rooms').update({ status: 'LOBBY' }).eq('id', g.room_id).eq('status', 'ACTIVE')
  }

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

  await broadcastGameUpdate(gameId, 'phase_changed', { phase: 'GAME_OVER', winner })
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
