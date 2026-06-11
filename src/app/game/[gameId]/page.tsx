import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { getGuestSession } from '@/lib/guest-session'
import { createServiceClient } from '@/lib/supabase/server'
import { maybeAdvancePhase } from '@/app/actions/game'
import RoleRevealCard from '@/components/game/RoleRevealCard'
import GameView, { type GameViewProps } from '@/components/game/GameView'
import type { GameRow, Role, PublicPlayer, Announcement } from '@/types/database'

export const metadata = { title: 'Game — Mafia' }

export default async function GamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params

  // Resolve identity — authenticated user or guest
  const [userSession, guestSession] = await Promise.all([getSession(), getGuestSession()])
  const currentUserId  = userSession?.userId ?? null
  const currentGuestId = guestSession?.guestId ?? null
  if (!currentUserId && !currentGuestId) redirect('/')

  // Lazy phase advancement (deadline enforcement)
  await maybeAdvancePhase(gameId)

  const supabase = createServiceClient()

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
    .select('role, is_alive, user_id, guest_id')
    .eq('game_id', gameId)
  if (currentUserId) myPlayerQuery = myPlayerQuery.eq('user_id', currentUserId) as typeof myPlayerQuery
  else               myPlayerQuery = myPlayerQuery.eq('guest_id', currentGuestId!) as typeof myPlayerQuery

  const { data: myPlayerRaw } = await myPlayerQuery.maybeSingle()

  if (!myPlayerRaw) redirect(currentUserId ? '/dashboard' : '/')
  const myRole    = myPlayerRaw.role as Role
  const myIsAlive = myPlayerRaw.is_alive as boolean

  // ── Room settings ─────────────────────────────────────────────────────────
  const { data: room } = await supabase
    .from('rooms')
    .select('host_user_id, reveal_role_on_death')
    .eq('id', game.room_id)
    .single()

  // Guests are never host (only auth users can create rooms)
  const isHost           = !!currentUserId && room?.host_user_id === currentUserId
  const revealRoleOnDeath = room?.reveal_role_on_death ?? false

  // ── Public player list (no roles unless dead + revealRoleOnDeath) ─────────
  const { data: gamePlayers } = await supabase
    .from('game_players')
    .select('user_id, guest_id, role, is_alive, display_name')
    .eq('game_id', gameId)

  // Build display names: prefer game_players.display_name (guests), else room_players lookup
  const { data: roomPlayers } = await supabase
    .from('room_players')
    .select('user_id, guest_id, display_name')
    .eq('room_id', game.room_id)

  const userDisplayMap  = new Map(roomPlayers?.map((p) => [p.user_id,  p.display_name]) ?? [])
  const guestDisplayMap = new Map(roomPlayers?.map((p) => [p.guest_id, p.display_name]) ?? [])

  // Current player's stable ID for UI highlighting
  const myStableId = currentUserId ?? currentGuestId ?? ''

  const players: PublicPlayer[] = (gamePlayers ?? []).map((gp) => {
    const stableId = gp.user_id ?? gp.guest_id ?? gp.user_id
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

  // ── Mafia teammates (only for Mafia players) ──────────────────────────────
  let mafiaTeammates: string[] = []
  if (myRole === 'MAFIA') {
    // Fetch other Mafia members — exclude self by user_id or guest_id
    let mafiaQ = supabase.from('game_players').select('user_id, guest_id, display_name').eq('game_id', gameId).eq('role', 'MAFIA')
    if (currentUserId)  mafiaQ = mafiaQ.neq('user_id', currentUserId) as typeof mafiaQ
    if (currentGuestId) mafiaQ = mafiaQ.neq('guest_id', currentGuestId) as typeof mafiaQ
    const { data: mafiaRows } = await mafiaQ
    mafiaTeammates = (mafiaRows ?? []).map((r) => {
      if (r.display_name) return r.display_name as string
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
    const { data: privEvent } = await supabase
      .from('game_events')
      .select('message')
      .eq('game_id', gameId)
      .eq('visibility', 'PRIVATE_TO_PLAYER')
      .eq('recipient_user_id', currentUserId ?? currentGuestId ?? '')
      .eq('round_id', round.id)
      .maybeSingle()
    detectiveResult = (privEvent as { message: string } | null)?.message ?? null
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
      .eq(currentUserId ? 'actor_user_id' : 'actor_guest_id', currentUserId ?? currentGuestId ?? '')
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
      .eq(currentUserId ? 'voter_user_id' : 'voter_guest_id', currentUserId ?? currentGuestId ?? '')
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
        display_name: userDisplayMap.get(uid) ?? uid,
        count,
      }))
    }
  }

  // ── Initial ROLE_REVEAL screen ────────────────────────────────────────────
  if (game.current_phase === 'ROLE_REVEAL') {
    return (
      <RoleRevealCard
        role={myRole}
        mafiaTeammates={mafiaTeammates}
        players={players.map((p) => ({ userId: p.user_id, name: p.display_name, isMe: p.user_id === myStableId }))}
        phase={game.current_phase}
        gameId={gameId}
        isHost={isHost}
      />
    )
  }

  const viewProps: GameViewProps = {
    gameId,
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
  }

  return <GameView {...viewProps} />
}
