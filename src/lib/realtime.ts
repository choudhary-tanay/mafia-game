// ─────────────────────────────────────────────────────────────────────────────
// Server-side realtime broadcast layer.
//
// FUTURE DEVELOPER RULE:
// Every room/game state change MUST broadcast through these shared helpers.
// Architecture: Ably is the primary realtime transport, Supabase Realtime is
// the fallback transport (both are published to in parallel — clients listen
// on exactly one), and client-side polling is the final safety net.
// No important game update may require a manual refresh. Do not update phase,
// votes, actions, room settings, player status, pause status, or game result
// without broadcasting a realtime update.
//
// SECURITY: broadcast payloads must stay data-free (reason + timestamp only).
// Channels are shared by every player in the game; any role-, target- or
// actor-specific detail would leak hidden information. Clients react to
// events by refetching, and the server-rendered page applies per-viewer
// filtering.
//
// Both publishes use plain HTTP (no persistent sockets) — safe in
// serverless/edge contexts. Failures are non-fatal by design: a game action
// must never fail because a realtime publish failed.
// ─────────────────────────────────────────────────────────────────────────────
import 'server-only'

/** Supabase Realtime HTTP broadcast (fallback transport). */
async function publishSupabase(topic: string, event: string, payload: object): Promise<boolean> {
  try {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      },
      body: JSON.stringify({
        messages: [{ topic, event, payload }],
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

/** Ably REST publish (primary transport). No-op when ABLY_API_KEY is absent. */
async function publishAbly(topic: string, event: string, payload: object): Promise<boolean> {
  const key = process.env.ABLY_API_KEY
  if (!key) return false
  try {
    const res = await fetch(
      `https://rest.ably.io/channels/${encodeURIComponent(topic)}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(key).toString('base64')}`,
        },
        body: JSON.stringify({ name: event, data: payload }),
      },
    )
    if (!res.ok && process.env.NODE_ENV !== 'production') {
      console.warn('[GAME_STATE_BROADCASTED] Ably publish failed:', res.status, topic, event)
    }
    return res.ok
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[GAME_STATE_BROADCASTED] Ably publish error — Supabase fallback carries:', e)
    }
    return false
  }
}

/**
 * Dual-publish to Ably (primary) and Supabase Realtime (fallback) in
 * parallel. Clients subscribe to exactly ONE transport (Ably when available,
 * Supabase otherwise), so dual publishing never causes double refreshes.
 * Returns per-transport status for debugging; never throws.
 */
async function broadcast(
  topic: string,
  event: string,
  payload: object,
): Promise<{ ably: boolean; supabase: boolean }> {
  const [ably, supabase] = await Promise.all([
    publishAbly(topic, event, payload),
    publishSupabase(topic, event, payload),
  ])
  return { ably, supabase }
}

export async function broadcastGameUpdate(
  gameId: string,
  event: string,
  payload?: object,
): Promise<void> {
  await broadcast(`game:${gameId}`, event, payload ?? {})
}

/** Broadcast a lobby-level event (e.g. settings_updated) to all players
 *  currently in the lobby page. Channel: `lobby:{roomCode}`. */
export async function broadcastLobbyUpdate(
  roomCode: string,
  event: string,
  payload?: object,
): Promise<void> {
  await broadcast(`lobby:${roomCode}`, event, payload ?? {})
}

/** Reasons for game_state_updated broadcasts — diagnostic only, never gameplay data. */
export type GameStateReason =
  | 'BEGIN_NIGHT'
  | 'NIGHT_ACTION_SUBMITTED'
  | 'NIGHT_RESOLVED'
  | 'DISCUSSION_ENDED'
  | 'VOTING_STARTED'
  | 'VOTE_SUBMITTED'
  | 'VOTE_RESOLVED'
  | 'TIMER_EXPIRED'
  | 'GAME_OVER'
  | 'GAME_PAUSED'
  | 'GAME_RESUMED'

/**
 * Canonical "something changed — refetch" event on the game channel.
 * Payload is reason + timestamp only — see the security rule at the top.
 */
export async function broadcastGameState(
  gameId: string,
  reason: GameStateReason,
): Promise<void> {
  await broadcast(`game:${gameId}`, 'game_state_updated', {
    reason,
    ts: new Date().toISOString(),
  })
}

/** Lobby counterpart: player joined/left — clients refetch the player list. */
export async function broadcastLobbyState(
  roomCode: string,
  reason: 'PLAYER_JOINED' | 'PLAYER_LEFT',
): Promise<void> {
  await broadcast(`lobby:${roomCode}`, 'lobby_state_updated', {
    reason,
    ts: new Date().toISOString(),
  })
}
