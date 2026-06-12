// Server-side Supabase Realtime broadcast helper.
// Uses the HTTP broadcast API — no persistent WebSocket connection needed,
// safe in serverless/edge contexts.
// Failures are non-fatal: the polling fallbacks in GameView/LobbyRefresh catch misses.
import 'server-only'

async function broadcast(topic: string, event: string, payload: object): Promise<void> {
  try {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`
    await fetch(url, {
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
  } catch {
    // Non-fatal — polling fallback handles stale UI
  }
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
