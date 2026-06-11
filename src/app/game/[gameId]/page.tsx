import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { createServiceClient } from '@/lib/supabase/server'
import RoleRevealCard from '@/components/game/RoleRevealCard'
import type { GameRow, Role } from '@/types/database'

export async function generateMetadata() {
  return { title: 'Your Role — Mafia' }
}

export default async function GamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const supabase = createServiceClient()

  // ── 1. Fetch game record ──────────────────────────────────────────────────
  const { data: game } = await supabase
    .from('games')
    .select('id, room_id, status, current_phase, current_round_number')
    .eq('id', gameId)
    .maybeSingle()

  if (!game) notFound()

  const typedGame = game as GameRow

  // ── 2. Fetch ONLY this player's own row — never the full role list ─────────
  // SECURITY: .eq('user_id', session.userId) ensures the server returns only
  // the current player's role. The full role map never leaves the backend.
  const { data: myPlayer } = await supabase
    .from('game_players')
    .select('id, role, is_alive')
    .eq('game_id', gameId)
    .eq('user_id', session.userId)
    .maybeSingle()

  // Not a participant in this game
  if (!myPlayer) redirect('/dashboard')

  const myRole = myPlayer.role as Role

  // ── 3. Mafia teammates — display names only, sent ONLY to Mafia players ───
  // SECURITY: only fetched when the verified player's own role is MAFIA.
  // Non-Mafia players receive an empty array — no teammate data at all.
  let mafiaTeammates: string[] = []
  if (myRole === 'MAFIA') {
    const { data: mafiaRows } = await supabase
      .from('game_players')
      .select('user_id')
      .eq('game_id', gameId)
      .eq('role', 'MAFIA')
      .neq('user_id', session.userId)

    if (mafiaRows?.length) {
      const ids = mafiaRows.map((r) => r.user_id)
      const { data: names } = await supabase
        .from('room_players')
        .select('display_name')
        .eq('room_id', typedGame.room_id)
        .in('user_id', ids)

      mafiaTeammates = (names ?? []).map((n) => n.display_name)
    }
  }

  // ── 4. All player names (no roles) for the post-reveal waiting screen ──────
  const { data: allPlayers } = await supabase
    .from('room_players')
    .select('display_name, user_id')
    .eq('room_id', typedGame.room_id)
    .order('joined_at', { ascending: true })

  const playerNames = (allPlayers ?? []).map((p) => ({
    name: p.display_name,
    isMe: p.user_id === session.userId,
  }))

  return (
    <RoleRevealCard
      role={myRole}
      mafiaTeammates={mafiaTeammates}
      players={playerNames}
      phase={typedGame.current_phase}
    />
  )
}
