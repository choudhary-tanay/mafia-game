import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { getGuestSession } from '@/lib/guest-session'
import { createServiceClient } from '@/lib/supabase/server'
import { gamePlayersSelect, hasGuestPlayerColumns } from '@/lib/guest-schema'
import { maybeAdvancePhase } from '@/app/actions/game'
import { getMyNightQuestionAnswer, getNightThoughts } from '@/app/actions/night-question'
import RoleRevealCard from '@/components/game/RoleRevealCard'
import GameView, { type GameViewProps } from '@/components/game/GameView'
import type { GameRow, Role, PublicPlayer, Announcement } from '@/types/database'

export const metadata = { title: 'Game — Mafia' }

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

  // ── My player ─────────────────────────────────────────────────────────────
  // Support both authenticated (user_id) and guest (guest_id) players
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
    .select('code, host_user_id, host_guest_id, reveal_role_on_death, night_timer_seconds, discussion_timer_seconds, voting_timer_seconds')
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

  // Build display names: prefer game_players.display_name (guests), else room_players lookup
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

  // Current player's stable ID for UI highlighting
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
      // Only expose role if dead AND reveal_role_on_death is enabled, OR game is over
      role:
        (!gp.is_alive && revealRoleOnDeath) || game.current_phase === 'GAME_OVER'
          ? (gp.role as Role)
          : undefined,
    }
  })
  const playerDisplayMap = new Map(players.map((p) => [p.user_id, p.display_name]))

  // ── Mafia teammates (only for Mafia players) ──────────────────────────────
  let mafiaTeammates: string[] = []
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
    .select('id, message, event_type, created_at')
    .eq('game_id', gameId)
    .eq('visibility', 'PUBLIC')
    .order('created_at', { ascending: true })

  const announcements: Announcement[] = (publicEvents ?? []) as Announcement[]

  // ── Detective private result (only for Detective) ─────────────────────────
  let detectiveResult: string | null = null
  if (myRole === 'DETECTIVE' && round) {
    // limit(1) instead of maybeSingle: a historical duplicate event must not
    // error out and hide the result.
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

  // ── Night Engagement: question answer + night thoughts ───────────────────
  let myNightQuestionAnswer = null
  let nightThoughts: string[] = []

  if (round) {
    const nightPhases = ['NIGHT_ACTIONS_OPEN', 'NIGHT_RESOLUTION']
    const dayPhases   = ['DISCUSSION', 'DAY_ANNOUNCEMENT', 'VOTING', 'VOTE_RESOLUTION', 'GAME_OVER']

    if (nightPhases.includes(game.current_phase)) {
      // Fetch the player's existing answer (for refresh resilience)
      myNightQuestionAnswer = await getMyNightQuestionAnswer(round.id)
    }
    if (dayPhases.includes(game.current_phase)) {
      // Fetch anonymous answers from the most-recently-completed night round
      // (same round_id — round persists through day phases)
      nightThoughts = await getNightThoughts(gameId, round.id)
    }
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
    myVoteTargetId,
    voteCounts,
    revealRoleOnDeath,
    isGuest: !!currentGuestId,
    roundId: round?.id ?? null,
    myNightQuestionAnswer,
    nightThoughts,
    timers: {
      night: room?.night_timer_seconds ?? 60,
      discussion: room?.discussion_timer_seconds ?? 180,
      voting: room?.voting_timer_seconds ?? 60,
    },
  }

  return <GameView {...viewProps} />
}
