import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase/server'
import { maybeAdvancePhase } from '@/app/actions/game'
import RoleRevealCard from '@/components/game/RoleRevealCard'
import GameView, { type GameViewProps } from '@/components/game/GameView'
import type { GameRow, Role, PublicPlayer, Announcement } from '@/types/database'

export const metadata = { title: 'Game — Mafia' }

export default async function GamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params
  const session = await getSession()
  if (!session?.userId) redirect('/login')

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
  const { data: myPlayerRaw } = await supabase
    .from('game_players')
    .select('role, is_alive')
    .eq('game_id', gameId)
    .eq('user_id', session.userId)
    .maybeSingle()

  if (!myPlayerRaw) redirect('/dashboard')
  const myRole = myPlayerRaw.role as Role
  const myIsAlive = myPlayerRaw.is_alive as boolean

  // ── Room settings ─────────────────────────────────────────────────────────
  const { data: room } = await supabase
    .from('rooms')
    .select('host_user_id, reveal_role_on_death')
    .eq('id', game.room_id)
    .single()

  const isHost = room?.host_user_id === session.userId
  const revealRoleOnDeath = room?.reveal_role_on_death ?? false

  // ── Public player list (no roles unless dead + revealRoleOnDeath) ─────────
  const { data: gamePlayers } = await supabase
    .from('game_players')
    .select('user_id, role, is_alive')
    .eq('game_id', gameId)

  const { data: roomPlayers } = await supabase
    .from('room_players')
    .select('user_id, display_name')
    .eq('room_id', game.room_id)

  const displayMap = new Map(roomPlayers?.map((p) => [p.user_id, p.display_name]) ?? [])

  const players: PublicPlayer[] = (gamePlayers ?? []).map((gp) => ({
    user_id: gp.user_id,
    display_name: displayMap.get(gp.user_id) ?? gp.user_id,
    is_alive: gp.is_alive,
    // Only expose role if dead AND reveal_role_on_death is enabled, OR game is over
    role:
      (!gp.is_alive && revealRoleOnDeath) || game.current_phase === 'GAME_OVER'
        ? (gp.role as Role)
        : undefined,
  }))

  // ── Mafia teammates (only for Mafia players) ──────────────────────────────
  let mafiaTeammates: string[] = []
  if (myRole === 'MAFIA') {
    const { data: mafiaRows } = await supabase
      .from('game_players')
      .select('user_id')
      .eq('game_id', gameId)
      .eq('role', 'MAFIA')
      .neq('user_id', session.userId)
    mafiaTeammates = (mafiaRows ?? []).map((r) => displayMap.get(r.user_id) ?? r.user_id)
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
      .eq('recipient_user_id', session.userId)
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
      .eq('actor_user_id', session.userId)
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
      .eq('voter_user_id', session.userId)
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
        display_name: displayMap.get(uid) ?? uid,
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
        players={players.map((p) => ({ name: p.display_name, isMe: p.user_id === session.userId }))}
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
    currentUserId: session.userId,
    players,
    announcements,
    detectiveResult,
    myNightActionTargetId,
    mafiaCurrentTarget,
    myVoteTargetId,
    voteCounts,
    revealRoleOnDeath,
  }

  return <GameView {...viewProps} />
}
