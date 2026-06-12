import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { getGuestSession } from '@/lib/guest-session'
import { createServiceClient } from '@/lib/supabase/server'
import { gamePlayersSelect, hasGuestPlayerColumns } from '@/lib/guest-schema'
import { maybeAdvancePhase } from '@/app/actions/game'
import { getMyNightQuestionAnswer, getNightThoughts } from '@/app/actions/night-question'
import { computeBollywoodEvents, type AnnExt } from '@/lib/bollywood-reactions'
import RoleRevealCard from '@/components/game/RoleRevealCard'
import GameView, { type GameViewProps } from '@/components/game/GameView'
import type { GameRow, Role, PublicPlayer, Announcement, GameHistoryRound, GameHistory } from '@/types/database'

export const metadata = { title: 'Game — Mafia' }

// Build full game history for post-game recap (called only when GAME_OVER).
// Queries night_actions and votes to reveal everything.
async function buildGameHistory(
  supabase: ReturnType<typeof createServiceClient>,
  gameId: string,
  players: PublicPlayer[],
  hasGuestColumns: boolean,
  winningTeam: string | null,
  allAnnouncements: Announcement[],
): Promise<GameHistory> {
  const playerNameMap = new Map(players.map((p) => [p.user_id, p.display_name]))

  // All rounds in order
  const { data: roundsData } = await supabase
    .from('rounds')
    .select('id, round_number')
    .eq('game_id', gameId)
    .order('round_number', { ascending: true })

  const rounds = (roundsData ?? []) as { id: string; round_number: number }[]

  // All night actions
  const { data: allNightActionsRaw } = await supabase
    .from('night_actions')
    .select(
      hasGuestColumns
        ? 'round_id, action_type, actor_user_id, actor_guest_id, target_user_id'
        : 'round_id, action_type, actor_user_id, target_user_id',
    )
    .eq('game_id', gameId)
  const allNightActions = (allNightActionsRaw ?? []) as unknown as {
    round_id: string
    action_type: string
    actor_user_id: string | null
    actor_guest_id?: string | null
    target_user_id: string | null
  }[]

  // All votes
  const { data: allVotesRaw } = await supabase
    .from('votes')
    .select(
      hasGuestColumns
        ? 'round_id, voter_user_id, voter_guest_id, target_user_id'
        : 'round_id, voter_user_id, target_user_id',
    )
    .eq('game_id', gameId)
  const allVotes = (allVotesRaw ?? []) as unknown as {
    round_id: string
    voter_user_id: string | null
    voter_guest_id?: string | null
    target_user_id: string | null
  }[]

  // Detective check results: gather from private events
  const { data: detectiveEventsRaw } = await supabase
    .from('game_events')
    .select('round_id, target_player_id, message')
    .eq('game_id', gameId)
    .eq('event_type', 'DETECTIVE_INVESTIGATION')
  const detectiveEvents = (detectiveEventsRaw ?? []) as {
    round_id: string | null
    target_player_id: string | null
    message: string
  }[]

  // Public game events for night/vote result messages
  const eventMsgByType = new Map<string, { round_id: string | null; message: string; target_player_id: string | null }[]>()
  for (const ann of allAnnouncements) {
    const evType = (ann as unknown as { event_type: string }).event_type
    if (!eventMsgByType.has(evType)) eventMsgByType.set(evType, [])
    eventMsgByType.get(evType)!.push({
      round_id: (ann as unknown as { round_id?: string | null }).round_id ?? null,
      message: ann.message,
      target_player_id: (ann as unknown as { target_player_id?: string | null }).target_player_id ?? null,
    })
  }

  function getActorName(a: { actor_user_id: string | null; actor_guest_id?: string | null }): string {
    const id = a.actor_user_id ?? a.actor_guest_id
    return id ? (playerNameMap.get(id) ?? 'Unknown') : 'Unknown'
  }

  function getTargetName(targetId: string | null): string {
    return targetId ? (playerNameMap.get(targetId) ?? 'Unknown') : 'Unknown'
  }

  const historyRounds: GameHistoryRound[] = rounds.map((r) => {
    const roundId = r.id
    const roundNum = r.round_number

    // Night actions for this round
    const roundNightActions = allNightActions.filter((a) => a.round_id === roundId)

    const killAction = roundNightActions.find((a) => a.action_type === 'MAFIA_KILL')
    const saveAction = roundNightActions.find((a) => a.action_type === 'DOCTOR_SAVE')
    const detectiveAction = roundNightActions.find((a) => a.action_type === 'DETECTIVE_CHECK')
    const detectiveEvent = detectiveEvents.find((e) => e.round_id === roundId)

    const nightActionsOut: GameHistoryRound['nightActions'] = []
    if (killAction) {
      nightActionsOut.push({
        type: 'MAFIA_KILL',
        actorName: getActorName(killAction),
        targetName: getTargetName(killAction.target_user_id),
      })
    }
    if (saveAction) {
      nightActionsOut.push({
        type: 'DOCTOR_SAVE',
        actorName: getActorName(saveAction),
        targetName: getTargetName(saveAction.target_user_id),
      })
    }
    if (detectiveAction) {
      const isMafia = !!(detectiveEvent?.message && detectiveEvent.message.includes('is MAFIA'))
      nightActionsOut.push({
        type: 'DETECTIVE_CHECK',
        actorName: getActorName(detectiveAction),
        targetName: getTargetName(detectiveAction.target_user_id),
        isMafia,
      })
    }

    // Find kill/save result from public events
    const killed = (eventMsgByType.get('PLAYER_KILLED_BY_MAFIA') ?? []).find((e) => e.round_id === roundId)
    const saved  = (eventMsgByType.get('PLAYER_SAVED_BY_DOCTOR')  ?? []).find((e) => e.round_id === roundId)
    const quiet  = (eventMsgByType.get('NIGHT_QUIET') ?? []).find((e) => e.round_id === roundId)

    const diedName = killed?.target_player_id ? (playerNameMap.get(killed.target_player_id) ?? null) : null
    const wasSaved = !!saved

    const nightResultMsg =
      killed?.message ??
      saved?.message ??
      quiet?.message ??
      'Night passed.'

    // Votes for this round
    const roundVotes = allVotes.filter((v) => v.round_id === roundId)
    const voteDetails: GameHistoryRound['votes'] = roundVotes.map((v) => ({
      voterName: getTargetName(v.voter_user_id ?? v.voter_guest_id ?? null),
      targetName: v.target_user_id ? (playerNameMap.get(v.target_user_id) ?? v.target_user_id) : null,
    }))

    // Vote result
    const eliminated = (eventMsgByType.get('PLAYER_ELIMINATED_BY_VOTE') ?? []).find((e) => e.round_id === roundId)
    const tie        = (eventMsgByType.get('NO_ELIMINATION_TIE')         ?? []).find((e) => e.round_id === roundId)
    const abstain    = (eventMsgByType.get('NO_ELIMINATION_ABSTAIN')      ?? []).find((e) => e.round_id === roundId)

    const eliminatedPlayerId = eliminated?.target_player_id ?? null
    const eliminatedPlayer = eliminatedPlayerId
      ? players.find((p) => p.user_id === eliminatedPlayerId)
      : null
    const eliminatedName = eliminatedPlayer?.display_name ?? null
    const eliminatedRole = eliminatedPlayer?.role ?? null

    const voteResultMsg =
      eliminated?.message ??
      tie?.message ??
      abstain?.message ??
      (roundVotes.length > 0 ? 'Votes cast.' : '')

    return {
      roundNumber: roundNum,
      nightActions: nightActionsOut,
      died: diedName,
      saved: wasSaved,
      nightResultMsg,
      votes: voteDetails,
      eliminated: eliminatedName,
      eliminatedRole: eliminatedRole as Role | null,
      voteResultMsg,
    }
  })

  // Final roles
  const finalRoles = players.map((p) => ({
    name: p.display_name,
    role: (p.role ?? 'VILLAGER') as Role,
    survived: p.is_alive,
  }))

  return {
    rounds: historyRounds,
    finalRoles,
    winner: winningTeam ?? '',
  }
}

export default async function GamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params

  // Resolve identity — authenticated user or guest. The user session takes
  // precedence everywhere (matching getPlayerIdentity), so a leftover guest
  // cookie is ignored when logged in.
  const [userSession, guestSession] = await Promise.all([getSession(), getGuestSession()])
  const currentUserId  = userSession?.userId ?? null
  const currentGuestId = currentUserId ? null : (guestSession?.guestId ?? null)
  if (!currentUserId && !currentGuestId) redirect('/')

  // Lazy phase advancement (deadline enforcement)
  await maybeAdvancePhase(gameId)

  const supabase = createServiceClient()
  const hasGuestColumns = await hasGuestPlayerColumns(supabase)

  // ── Game record ──────────────────────────────────────────────────────────
  const { data: gameRaw } = await supabase
    .from('games')
    .select('id,room_id,current_phase,current_round_number,winning_team,phase_deadline,started_at')
    .eq('id', gameId)
    .maybeSingle()

  if (!gameRaw) notFound()
  const game = gameRaw as GameRow

  // ── Pause state (separate query — gracefully handles missing columns) ─────
  const { data: pauseData, error: pauseErr } = await supabase
    .from('games')
    .select('is_paused, paused_by_player_id, remaining_phase_seconds')
    .eq('id', gameId)
    .maybeSingle()

  const isPaused = !pauseErr && (pauseData as { is_paused?: boolean | null } | null)?.is_paused === true
  const pausedByPlayerId = !pauseErr
    ? (pauseData as { paused_by_player_id?: string | null } | null)?.paused_by_player_id ?? null
    : null
  const remainingPausedSecs = !pauseErr
    ? (pauseData as { remaining_phase_seconds?: number | null } | null)?.remaining_phase_seconds ?? null
    : null

  // ── My player ─────────────────────────────────────────────────────────────
  let myPlayerQuery = supabase
    .from('game_players')
    .select(hasGuestColumns ? 'role, is_alive, user_id, guest_id' : 'role, is_alive, user_id')
    .eq('game_id', gameId)
  if (currentUserId) myPlayerQuery = myPlayerQuery.eq('user_id', currentUserId) as typeof myPlayerQuery
  else               myPlayerQuery = myPlayerQuery.eq(hasGuestColumns ? 'guest_id' : 'user_id', currentGuestId!) as typeof myPlayerQuery

  const { data: myPlayerRaw } = await myPlayerQuery.maybeSingle()

  if (!myPlayerRaw) redirect(currentUserId ? '/dashboard' : '/')
  const myPlayer = myPlayerRaw as unknown as { role: Role; is_alive: boolean }
  const myRole    = myPlayer.role
  const myIsAlive = myPlayer.is_alive

  // ── Room settings ─────────────────────────────────────────────────────────
  const { data: room } = await supabase
    .from('rooms')
    .select('code, host_user_id, host_guest_id, reveal_role_on_death, night_timer_seconds, discussion_timer_seconds, voting_timer_seconds, bollywood_mode')
    .eq('id', game.room_id)
    .single()

  const isHost =
    (!!currentUserId  && room?.host_user_id  === currentUserId) ||
    (!!currentGuestId && (room as { host_guest_id?: string | null })?.host_guest_id === currentGuestId)
  const revealRoleOnDeath = room?.reveal_role_on_death ?? false

  // ── Public player list (no roles unless dead + revealRoleOnDeath) ─────────
  const { data: gamePlayers } = await supabase
    .from('game_players')
    .select(gamePlayersSelect(hasGuestColumns))
    .eq('game_id', gameId)

  const { data: roomPlayers } = await supabase
    .from('room_players')
    .select(hasGuestColumns ? 'user_id, guest_id, display_name' : 'user_id, display_name')
    .eq('room_id', game.room_id)

  const roomPlayerRows = (roomPlayers ?? []) as unknown as {
    user_id: string | null
    guest_id?: string | null
    display_name: string
  }[]

  const userDisplayMap  = new Map(roomPlayerRows.map((p) => [p.user_id,  p.display_name]))
  const guestDisplayMap = new Map(
    hasGuestColumns
      ? roomPlayerRows.map((p) => [p.guest_id, p.display_name])
      : [],
  )

  const myStableId = currentUserId ?? currentGuestId ?? ''

  const gamePlayerRows = (gamePlayers ?? []) as unknown as {
    user_id: string | null
    guest_id?: string | null
    display_name?: string | null
    role: Role
    is_alive: boolean
  }[]

  const players: PublicPlayer[] = gamePlayerRows.map((gp) => {
    const stableId = gp.user_id ?? gp.guest_id ?? ''
    const displayName =
      gp.display_name ??
      (gp.user_id  ? userDisplayMap.get(gp.user_id)   : null) ??
      (gp.guest_id ? guestDisplayMap.get(gp.guest_id) : null) ??
      'Player'
    return {
      user_id: stableId ?? '',
      display_name: displayName,
      is_alive: gp.is_alive,
      role:
        (!gp.is_alive && revealRoleOnDeath) || game.current_phase === 'GAME_OVER'
          ? (gp.role as Role)
          : undefined,
    }
  })
  const playerDisplayMap = new Map(players.map((p) => [p.user_id, p.display_name]))

  // ── Mafia teammates (only for Mafia players) ──────────────────────────────
  let mafiaTeammates: string[] = []
  let mafiaTeamNames: string[] = []
  if (myRole === 'MAFIA') {
    const { data: mafiaRows } = await supabase
      .from('game_players')
      .select(hasGuestColumns ? 'user_id, guest_id, display_name' : 'user_id')
      .eq('game_id', gameId)
      .eq('role', 'MAFIA')

    const mafiaPlayerRows = (mafiaRows ?? []) as unknown as {
      user_id: string | null
      guest_id?: string | null
      display_name?: string | null
    }[]

    mafiaTeammates = mafiaPlayerRows.filter((r) => {
      const stableId = r.user_id ?? r.guest_id
      return stableId && stableId !== myStableId
    }).map((r) => {
      if (r.display_name) return r.display_name
      const name = r.user_id
        ? (userDisplayMap.get(r.user_id) ?? r.user_id)
        : (guestDisplayMap.get(r.guest_id) ?? r.guest_id ?? 'Unknown')
      return name as string
    })

    mafiaTeamNames = mafiaTeammates
  }

  // Resolve who paused (display name for the overlay)
  let pausedByName: string | null = null
  if (pausedByPlayerId) {
    pausedByName = playerDisplayMap.get(pausedByPlayerId) ?? null
  }

  // ── Current round ─────────────────────────────────────────────────────────
  const { data: round } = await supabase
    .from('rounds')
    .select('id')
    .eq('game_id', gameId)
    .eq('round_number', game.current_round_number)
    .maybeSingle()

  // ── Public announcements ──────────────────────────────────────────────────
  const { data: publicEvents } = await supabase
    .from('game_events')
    .select('id, message, event_type, created_at, target_player_id, round_id')
    .eq('game_id', gameId)
    .eq('visibility', 'PUBLIC')
    .order('created_at', { ascending: true })

  const announcements: Announcement[] = (publicEvents ?? []) as Announcement[]
  const annExt: AnnExt[] = (publicEvents ?? []) as unknown as AnnExt[]

  // ── Detective private result (only for Detective) ─────────────────────────
  let detectiveResult: string | null = null
  if (myRole === 'DETECTIVE' && round) {
    const { data: privEvents } = await supabase
      .from('game_events')
      .select('message')
      .eq('game_id', gameId)
      .eq('visibility', 'PRIVATE_TO_PLAYER')
      .eq('recipient_user_id', currentUserId ?? currentGuestId ?? '')
      .eq('round_id', round.id)
      .order('created_at', { ascending: false })
      .limit(1)
    detectiveResult = (privEvents?.[0] as { message: string } | undefined)?.message ?? null
  }

  // ── My night action for this round ────────────────────────────────────────
  let myNightActionTargetId: string | null | undefined = undefined
  let mafiaCurrentTarget: string | null = null
  if (round && ['NIGHT_ACTIONS_OPEN', 'NIGHT_RESOLUTION'].includes(game.current_phase)) {
    const actionType =
      myRole === 'MAFIA' ? 'MAFIA_KILL' : myRole === 'DOCTOR' ? 'DOCTOR_SAVE' : 'DETECTIVE_CHECK'
    const { data: myAction } = await supabase
      .from('night_actions')
      .select('target_user_id')
      .eq('round_id', round.id)
      .eq(currentUserId ? 'actor_user_id' : hasGuestColumns ? 'actor_guest_id' : 'actor_user_id', currentUserId ?? currentGuestId ?? '')
      .eq('action_type', actionType)
      .maybeSingle()
    myNightActionTargetId = myAction ? myAction.target_user_id : null

    if (myRole === 'MAFIA') {
      const { data: teamKill } = await supabase
        .from('night_actions')
        .select('target_user_id')
        .eq('round_id', round.id)
        .eq('action_type', 'MAFIA_KILL')
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      mafiaCurrentTarget = (teamKill as { target_user_id: string } | null)?.target_user_id ?? null
    }
  }

  // ── My vote ───────────────────────────────────────────────────────────────
  let myVoteTargetId: string | null | undefined = undefined
  let voteCounts: { user_id: string; display_name: string; count: number }[] | undefined
  if (round && ['VOTING', 'VOTE_RESOLUTION'].includes(game.current_phase)) {
    const { data: myVote } = await supabase
      .from('votes')
      .select('target_user_id')
      .eq('round_id', round.id)
      .eq(currentUserId ? 'voter_user_id' : hasGuestColumns ? 'voter_guest_id' : 'voter_user_id', currentUserId ?? currentGuestId ?? '')
      .maybeSingle()
    myVoteTargetId = myVote ? myVote.target_user_id : undefined

    if (game.current_phase === 'VOTE_RESOLUTION') {
      const { data: allVotes } = await supabase
        .from('votes')
        .select('target_user_id')
        .eq('round_id', round.id)
      const counts = new Map<string, number>()
      for (const v of allVotes ?? []) {
        if (v.target_user_id) counts.set(v.target_user_id, (counts.get(v.target_user_id) ?? 0) + 1)
      }
      voteCounts = [...counts.entries()].map(([uid, count]) => ({
        user_id: uid,
        display_name: playerDisplayMap.get(uid) ?? uid,
        count,
      }))
    }
  }

  // ── Bollywood events ──────────────────────────────────────────────────────
  const bollywoodMode = !!(room as { bollywood_mode?: boolean | null } | null)?.bollywood_mode
  const bollywoodEvents = bollywoodMode
    ? computeBollywoodEvents({
        roundId: round?.id ?? null,
        roundNumber: game.current_round_number,
        allAnnouncements: annExt,
        myRole,
        myIsAlive,
        myStableId,
        detectiveResult,
        players,
        voteCounts,
        revealRoleOnDeath,
        myNightActionTargetId,
        winningTeam: game.winning_team,
        phase: game.current_phase,
      })
    : []

  // ── Night Engagement ──────────────────────────────────────────────────────
  let myNightQuestionAnswer = null
  let nightThoughts: string[] = []

  if (round) {
    const nightPhases = ['NIGHT_ACTIONS_OPEN', 'NIGHT_RESOLUTION']
    const dayPhases   = ['DISCUSSION', 'DAY_ANNOUNCEMENT', 'VOTING', 'VOTE_RESOLUTION', 'GAME_OVER']

    if (nightPhases.includes(game.current_phase)) {
      myNightQuestionAnswer = await getMyNightQuestionAnswer(round.id)
    }
    if (dayPhases.includes(game.current_phase)) {
      nightThoughts = await getNightThoughts(gameId, round.id)
    }
  }

  // ── Game history (only at GAME_OVER — full reveal) ────────────────────────
  let gameHistory: GameHistory | null = null
  if (game.current_phase === 'GAME_OVER') {
    gameHistory = await buildGameHistory(
      supabase,
      gameId,
      // Pass players with full role reveal (already set for GAME_OVER above)
      players,
      hasGuestColumns,
      game.winning_team,
      announcements,
    )
  }

  // ── Initial ROLE_REVEAL screen ────────────────────────────────────────────
  if (game.current_phase === 'ROLE_REVEAL') {
    return (
      <RoleRevealCard
        role={myRole}
        mafiaTeammates={mafiaTeammates}
        players={players.map((p) => ({ userId: p.user_id, name: p.display_name, isMe: p.user_id === myStableId }))}
        gameId={gameId}
        isHost={isHost}
      />
    )
  }

  const viewProps: GameViewProps = {
    gameId,
    roomCode: (room as { code?: string } | null)?.code,
    phase: game.current_phase,
    roundNumber: game.current_round_number,
    phaseDeadline: game.phase_deadline,
    winningTeam: game.winning_team,
    myRole,
    myIsAlive,
    isHost,
    currentUserId: myStableId,
    players,
    announcements,
    detectiveResult,
    myNightActionTargetId,
    mafiaCurrentTarget,
    mafiaTeamNames,
    myVoteTargetId,
    voteCounts,
    revealRoleOnDeath,
    isGuest: !!currentGuestId,
    bollywoodMode,
    bollywoodEvents,
    roundId: round?.id ?? null,
    myNightQuestionAnswer,
    nightThoughts,
    timers: {
      night: room?.night_timer_seconds ?? 60,
      discussion: room?.discussion_timer_seconds ?? 180,
      voting: room?.voting_timer_seconds ?? 60,
    },
    // Phase 11 — Pause / resume
    isPaused,
    pausedByName,
    remainingPausedSecs,
    // Phase 11 — Game history
    gameHistory,
  }

  return <GameView {...viewProps} />
}
