import 'server-only'

import bcrypt from 'bcryptjs'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { PlayerIdentity } from '@/lib/identity'

type DbClient = SupabaseClient

let cachedGuestColumns: boolean | null = null

// true = columns exist; false = definitively missing (42703); null = probe
// failed for some other reason (network blip, rate limit) — NOT definitive.
async function canSelectColumns(
  supabase: DbClient,
  table: string,
  columns: string,
): Promise<boolean | null> {
  const { error } = await supabase.from(table).select(columns).limit(1)
  if (!error) return true
  if (error.code === '42703' || /column .* does not exist/i.test(error.message ?? '')) return false
  return null
}

export async function hasGuestPlayerColumns(supabase: DbClient): Promise<boolean> {
  if (cachedGuestColumns !== null) return cachedGuestColumns

  const checks = await Promise.all([
    canSelectColumns(supabase, 'room_players', 'guest_id,is_guest'),
    canSelectColumns(supabase, 'game_players', 'guest_id,is_guest,display_name'),
    canSelectColumns(supabase, 'night_actions', 'actor_guest_id'),
    canSelectColumns(supabase, 'votes', 'voter_guest_id'),
    canSelectColumns(supabase, 'player_game_stats', 'guest_id,is_guest'),
  ])

  // A transient probe failure must never pin this process in legacy mode —
  // assume the migrated schema (the deployed reality) and re-probe next call.
  if (checks.some((c) => c === null)) {
    return !checks.includes(false)
  }

  cachedGuestColumns = checks.every(Boolean)
  return cachedGuestColumns
}

export function stablePlayerId(row: {
  user_id?: string | null
  guest_id?: string | null
}): string | null {
  return row.user_id ?? row.guest_id ?? null
}

export function playerIdentityFilter(
  identity: PlayerIdentity,
  hasGuestColumns: boolean,
): Record<string, string> {
  if (identity.userId) return { user_id: identity.userId }
  return hasGuestColumns
    ? { guest_id: identity.guestId! }
    : { user_id: identity.guestId! }
}

export function stablePlayerOrFilter(playerId: string, hasGuestColumns: boolean): string {
  return hasGuestColumns
    ? `user_id.eq.${playerId},guest_id.eq.${playerId}`
    : `user_id.eq.${playerId}`
}

export function roomPlayersSelect(hasGuestColumns: boolean): string {
  return hasGuestColumns
    ? 'user_id, guest_id, is_guest, display_name'
    : 'user_id, display_name'
}

export function gamePlayersSelect(hasGuestColumns: boolean): string {
  return hasGuestColumns
    ? 'user_id, guest_id, role, is_alive, display_name'
    : 'user_id, role, is_alive'
}

export function nightActionsActorSelect(hasGuestColumns: boolean): string {
  return hasGuestColumns
    ? 'actor_user_id, actor_guest_id, action_type'
    : 'actor_user_id, action_type'
}

export function nightActionsResolutionSelect(hasGuestColumns: boolean): string {
  return hasGuestColumns
    ? 'action_type, actor_user_id, actor_guest_id, target_user_id, submitted_at'
    : 'action_type, actor_user_id, target_user_id, submitted_at'
}

export function votesActorSelect(hasGuestColumns: boolean): string {
  return hasGuestColumns
    ? 'voter_user_id, voter_guest_id, target_user_id'
    : 'voter_user_id, target_user_id'
}

export function roomPlayerInsertPayload({
  hasGuestColumns,
  roomId,
  userId,
  guestId,
  displayName,
  avatarUrl,
  isHost,
}: {
  hasGuestColumns: boolean
  roomId: string
  userId?: string | null
  guestId?: string | null
  displayName: string
  avatarUrl?: string | null
  isHost: boolean
}): Record<string, unknown> {
  if (guestId) {
    return hasGuestColumns
      ? {
          room_id: roomId,
          user_id: null,
          guest_id: guestId,
          is_guest: true,
          display_name: displayName,
          avatar_url: avatarUrl ?? null,
          is_host: isHost,
          is_connected: true,
        }
      : {
          room_id: roomId,
          user_id: guestId,
          display_name: displayName,
          avatar_url: avatarUrl ?? null,
          is_host: isHost,
          is_connected: true,
        }
  }

  return hasGuestColumns
    ? {
        room_id: roomId,
        user_id: userId,
        guest_id: null,
        is_guest: false,
        display_name: displayName,
        avatar_url: avatarUrl ?? null,
        is_host: isHost,
        is_connected: true,
      }
    : {
        room_id: roomId,
        user_id: userId,
        display_name: displayName,
        avatar_url: avatarUrl ?? null,
        is_host: isHost,
        is_connected: true,
      }
}

export function gamePlayerInsertPayload({
  hasGuestColumns,
  gameId,
  roomId,
  player,
  role,
}: {
  hasGuestColumns: boolean
  gameId: string
  roomId: string
  player: {
    user_id: string | null
    guest_id?: string | null
    is_guest?: boolean | null
    display_name?: string | null
  }
  role: string
}): Record<string, unknown> {
  const stableId = stablePlayerId(player)

  return hasGuestColumns
    ? {
        game_id: gameId,
        room_id: roomId,
        user_id: player.user_id ?? null,
        guest_id: player.guest_id ?? null,
        is_guest: !!player.is_guest,
        display_name: player.display_name ?? null,
        role,
        is_alive: true,
        survived_to_end: false,
      }
    : {
        game_id: gameId,
        room_id: roomId,
        user_id: stableId,
        role,
        is_alive: true,
        survived_to_end: false,
      }
}

export function legacyGuestEmail(guestId: string): string {
  return `guest-${guestId}@guest.local`
}

export function isLegacyGuestEmail(email: string | null | undefined): boolean {
  return /^guest-[0-9a-f-]+@guest\.local$/i.test(email ?? '')
}

export async function ensureLegacyGuestUser(
  supabase: DbClient,
  guestId: string,
  displayName: string,
): Promise<string | null> {
  const passwordHash = await bcrypt.hash(crypto.randomUUID(), 12)
  const { error } = await supabase.from('users').insert({
    id: guestId,
    full_name: displayName,
    email: legacyGuestEmail(guestId),
    sex: 'PREFER_NOT_TO_SAY',
    password_hash: passwordHash,
  })

  if (!error || error.code === '23505') return null
  return error.message
}

export async function legacyGuestIdsForUsers(
  supabase: DbClient,
  userIds: string[],
): Promise<Set<string>> {
  if (userIds.length === 0) return new Set()

  const { data } = await supabase
    .from('users')
    .select('id, email')
    .in('id', userIds)

  return new Set(
    (data ?? [])
      .filter((u) => isLegacyGuestEmail((u as { email?: string | null }).email))
      .map((u) => (u as { id: string }).id),
  )
}
