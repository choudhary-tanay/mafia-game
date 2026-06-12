import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { getGuestSession } from '@/lib/guest-session'
import { createServiceClient } from '@/lib/supabase/server'
import { gamePlayersSelect, hasGuestPlayerColumns } from '@/lib/guest-schema'
import GameHistoryTimeline from '@/components/game/GameHistoryTimeline'
import { TrophyIcon, MafiaMask } from '@/components/ui/illustrations'
import type { Role, PublicPlayer, Announcement, GameHistory } from '@/types/database'
import { ArrowLeft, RotateCcw } from 'lucide-react'

export const metadata = { title: 'Game Recap — Mafia' }

export default async function GameHistoryPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params

  const [userSession, guestSession] = await Promise.all([getSession(), getGuestSession()])
  const currentUserId  = userSession?.userId ?? null
  const currentGuestId = currentUserId ? null : (guestSession?.guestId ?? null)
  if (!currentUserId && !currentGuestId) redirect('/')

  const supabase = createServiceClient()
  const hasGuestColumns = await hasGuestPlayerColumns(supabase)

  // Game must exist and be GAME_OVER
  const { data: gameRaw } = await supabase
    .from('games')
    .select('id, room_id, current_phase, winning_team')
    .eq('id', gameId)
    .maybeSingle()

  if (!gameRaw) notFound()
  if (gameRaw.current_phase !== 'GAME_OVER') {
    redirect(`/game/${gameId}`)
  }

  // Verify player was in this game
  let myPlayerQuery = supabase
    .from('game_players')
    .select('role, is_alive')
    .eq('game_id', gameId)
  if (currentUserId)
    myPlayerQuery = myPlayerQuery.eq('user_id', currentUserId) as typeof myPlayerQuery
  else
    myPlayerQuery = myPlayerQuery.eq(hasGuestColumns ? 'guest_id' : 'user_id', currentGuestId!) as typeof myPlayerQuery

  const { data: myPlayer } = await myPlayerQuery.maybeSingle()
  if (!myPlayer) redirect(currentUserId ? '/dashboard' : '/')

  // Room code for back link
  const { data: room } = await supabase
    .from('rooms')
    .select('code')
    .eq('id', gameRaw.room_id)
    .single()

  // Full player list with roles (GAME_OVER — all roles visible)
  const { data: gamePlayers } = await supabase
    .from('game_players')
    .select(gamePlayersSelect(hasGuestColumns))
    .eq('game_id', gameId)

  const { data: roomPlayers } = await supabase
    .from('room_players')
    .select(hasGuestColumns ? 'user_id, guest_id, display_name' : 'user_id, display_name')
    .eq('room_id', gameRaw.room_id)

  const roomPlayerRows = (roomPlayers ?? []) as unknown as {
    user_id: string | null; guest_id?: string | null; display_name: string
  }[]
  const userDisplayMap  = new Map(roomPlayerRows.map((p) => [p.user_id, p.display_name]))
  const guestDisplayMap = new Map(
    hasGuestColumns ? roomPlayerRows.map((p) => [p.guest_id, p.display_name]) : [],
  )

  const gamePlayerRows = (gamePlayers ?? []) as unknown as {
    user_id: string | null; guest_id?: string | null; display_name?: string | null; role: Role; is_alive: boolean
  }[]

  const players: PublicPlayer[] = gamePlayerRows.map((gp) => {
    const stableId = gp.user_id ?? gp.guest_id ?? ''
    const displayName =
      gp.display_name ??
      (gp.user_id  ? userDisplayMap.get(gp.user_id)   : null) ??
      (gp.guest_id ? guestDisplayMap.get(gp.guest_id) : null) ??
      'Player'
    return {
      user_id: stableId,
      display_name: displayName,
      is_alive: gp.is_alive,
      role: gp.role as Role,
    }
  })

  const playerNameMap = new Map(players.map((p) => [p.user_id, p.display_name]))

  // All rounds
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
    round_id: string; action_type: string
    actor_user_id: string | null; actor_guest_id?: string | null; target_user_id: string | null
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
    round_id: string; voter_user_id: string | null; voter_guest_id?: string | null; target_user_id: string | null
  }[]

  // Detective events
  const { data: detectiveEventsRaw } = await supabase
    .from('game_events')
    .select('round_id, target_player_id, message')
    .eq('game_id', gameId)
    .eq('event_type', 'DETECTIVE_INVESTIGATION')
  const detectiveEvents = (detectiveEventsRaw ?? []) as {
    round_id: string | null; target_player_id: string | null; message: string
  }[]

  // Public events for result messages
  const { data: publicEventsRaw } = await supabase
    .from('game_events')
    .select('id, message, event_type, created_at, target_player_id, round_id')
    .eq('game_id', gameId)
    .eq('visibility', 'PUBLIC')
    .order('created_at', { ascending: true })
  const announcements = (publicEventsRaw ?? []) as Announcement[]

  const eventMsgByType = new Map<string, { round_id: string | null; message: string; target_player_id: string | null }[]>()
  for (const ann of announcements) {
    const evType = (ann as unknown as { event_type: string }).event_type
    if (!eventMsgByType.has(evType)) eventMsgByType.set(evType, [])
    eventMsgByType.get(evType)!.push({
      round_id: (ann as unknown as { round_id?: string | null }).round_id ?? null,
      message: ann.message,
      target_player_id: (ann as unknown as { target_player_id?: string | null }).target_player_id ?? null,
    })
  }

  function getName(id: string | null): string {
    return id ? (playerNameMap.get(id) ?? 'Unknown') : 'Unknown'
  }

  const historyRounds = rounds.map((r) => {
    const rId = r.id

    const roundNA = allNightActions.filter((a) => a.round_id === rId)
    const killA = roundNA.find((a) => a.action_type === 'MAFIA_KILL')
    const saveA = roundNA.find((a) => a.action_type === 'DOCTOR_SAVE')
    const checkA = roundNA.find((a) => a.action_type === 'DETECTIVE_CHECK')
    const detEv = detectiveEvents.find((e) => e.round_id === rId)

    const nightActionsOut: GameHistory['rounds'][number]['nightActions'] = []
    if (killA) nightActionsOut.push({ type: 'MAFIA_KILL', actorName: getName(killA.actor_user_id ?? killA.actor_guest_id ?? null), targetName: getName(killA.target_user_id) })
    if (saveA) nightActionsOut.push({ type: 'DOCTOR_SAVE', actorName: getName(saveA.actor_user_id ?? saveA.actor_guest_id ?? null), targetName: getName(saveA.target_user_id) })
    if (checkA) {
      const isMafia = !!(detEv?.message && detEv.message.includes('is MAFIA'))
      nightActionsOut.push({ type: 'DETECTIVE_CHECK', actorName: getName(checkA.actor_user_id ?? checkA.actor_guest_id ?? null), targetName: getName(checkA.target_user_id), isMafia })
    }

    const killed = (eventMsgByType.get('PLAYER_KILLED_BY_MAFIA') ?? []).find((e) => e.round_id === rId)
    const saved  = (eventMsgByType.get('PLAYER_SAVED_BY_DOCTOR')  ?? []).find((e) => e.round_id === rId)
    const quiet  = (eventMsgByType.get('NIGHT_QUIET') ?? []).find((e) => e.round_id === rId)

    const roundVotes = allVotes.filter((v) => v.round_id === rId)
    const voteDetails = roundVotes.map((v) => ({
      voterName: getName(v.voter_user_id ?? v.voter_guest_id ?? null),
      targetName: v.target_user_id ? (playerNameMap.get(v.target_user_id) ?? v.target_user_id) : null,
    }))

    const eliminated = (eventMsgByType.get('PLAYER_ELIMINATED_BY_VOTE') ?? []).find((e) => e.round_id === rId)
    const tie = (eventMsgByType.get('NO_ELIMINATION_TIE') ?? []).find((e) => e.round_id === rId)
    const abstain = (eventMsgByType.get('NO_ELIMINATION_ABSTAIN') ?? []).find((e) => e.round_id === rId)

    const eliminatedPlayerId = eliminated?.target_player_id ?? null
    const eliminatedPlayer = eliminatedPlayerId ? players.find((p) => p.user_id === eliminatedPlayerId) : null

    return {
      roundNumber: r.round_number,
      nightActions: nightActionsOut,
      died: killed?.target_player_id ? (playerNameMap.get(killed.target_player_id) ?? null) : null,
      saved: !!saved,
      nightResultMsg: killed?.message ?? saved?.message ?? quiet?.message ?? 'Night passed.',
      votes: voteDetails,
      eliminated: eliminatedPlayer?.display_name ?? null,
      eliminatedRole: (eliminatedPlayer?.role ?? null) as Role | null,
      voteResultMsg: eliminated?.message ?? tie?.message ?? abstain?.message ?? (roundVotes.length > 0 ? 'Votes cast.' : ''),
    }
  })

  const history: GameHistory = {
    rounds: historyRounds,
    finalRoles: players.map((p) => ({ name: p.display_name, role: p.role as Role, survived: p.is_alive })),
    winner: gameRaw.winning_team ?? '',
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Back links */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <Link
            href={`/game/${gameId}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-3.5 py-2 text-xs font-semibold text-text-muted hover:text-text-primary hover:border-border-bright transition-colors"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Back to game
          </Link>
          {room?.code && (
            <Link
              href={`/lobby/${room.code}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-3.5 py-2 text-xs font-semibold text-text-muted hover:text-text-primary hover:border-border-bright transition-colors"
            >
              <RotateCcw size={14} aria-hidden="true" />
              Play again
            </Link>
          )}
        </div>

        {/* Winner banner */}
        <div className={`relative overflow-hidden vignette rounded-2xl border mb-6 p-8 text-center animate-fade-up ${
          history.winner === 'VILLAGE'
            ? 'border-emerald-900/40 bg-gradient-to-b from-emerald-950/30 to-surface'
            : 'border-red-900/40 bg-gradient-to-b from-red-950/30 to-surface'
        }`}>
          <div className="fog-layer" aria-hidden="true" />
          <div className="relative">
            <div className="mb-3 flex justify-center">
              {history.winner === 'VILLAGE' ? (
                <TrophyIcon size={56} className="text-gold animate-float" />
              ) : (
                <MafiaMask size={64} className="text-red-400 animate-float" />
              )}
            </div>
            <h1 className={`font-display text-5xl tracking-wider mb-2 ${
              history.winner === 'VILLAGE'
                ? 'text-emerald-300 text-glow-gold'
                : 'text-red-300 text-glow-red'
            }`}>
              {history.winner === 'VILLAGE' ? 'Village Won' : 'Mafia Won'}
            </h1>
            <p className="text-sm text-text-muted tracking-wide">
              The full story of the night — every move, every vote.
            </p>
          </div>
        </div>

        <GameHistoryTimeline history={history} />
      </div>
    </main>
  )
}
