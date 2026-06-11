'use server'

import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { validateLobby } from '@/lib/lobby'
import type { Role } from '@/types/database'

// ─── Role assignment ──────────────────────────────────────────────────────────

function buildRoleList(playerCount: number, mafiaCount: number): Role[] {
  const roles: Role[] = []

  for (let i = 0; i < mafiaCount; i++) roles.push('MAFIA')

  const nonMafia = playerCount - mafiaCount
  if (nonMafia >= 2) roles.push('DOCTOR')
  if (nonMafia >= 3) roles.push('DETECTIVE')

  while (roles.length < playerCount) roles.push('VILLAGER')

  // Fisher-Yates shuffle — cryptographically random enough for a party game
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[roles[i], roles[j]] = [roles[j], roles[i]]
  }

  return roles
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function startGame(roomCode: string): Promise<void> {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const supabase = createServiceClient()

  // Validate room
  const { data: room } = await supabase
    .from('rooms')
    .select('id, host_user_id, status, mafia_count')
    .eq('code', roomCode)
    .maybeSingle()

  if (!room || room.status !== 'LOBBY') redirect(`/lobby/${roomCode}`)
  if (room.host_user_id !== session.userId) redirect(`/lobby/${roomCode}`)

  // Fetch players
  const { data: players } = await supabase
    .from('room_players')
    .select('user_id')
    .eq('room_id', room.id)

  if (!players || players.length < 4) redirect(`/lobby/${roomCode}`)

  const { canStart } = validateLobby(players.length, room.mafia_count)
  if (!canStart) redirect(`/lobby/${roomCode}`)

  // Assign roles
  const roles = buildRoleList(players.length, room.mafia_count)

  // Create game record
  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({
      room_id: room.id,
      status: 'ROLE_REVEAL',
      current_phase: 'ROLE_REVEAL',
      current_round_number: 0,
    })
    .select('id')
    .single()

  if (gameError || !game) redirect(`/lobby/${roomCode}`)

  // Insert game_players — one row per player, role assigned randomly above.
  // SECURITY: roles are stored only on the backend. The frontend fetches
  // only the current user's row — never the full list.
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

  // Mark room as active
  await supabase.from('rooms').update({ status: 'ACTIVE' }).eq('id', room.id)

  redirect(`/game/${game.id}`)
}
