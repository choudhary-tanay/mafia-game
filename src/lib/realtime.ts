// Server-side Supabase Realtime broadcast helper.
// Uses the HTTP broadcast API — no persistent WebSocket connection needed,
// safe in serverless/edge contexts.
// Failures are non-fatal: the 5-second polling fallback in GameView catches misses.
import 'server-only'

export async function broadcastGameUpdate(
  gameId: string,
  event: string,
  payload?: object,
): Promise<void> {
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
        messages: [{ topic: `game:${gameId}`, event, payload: payload ?? {} }],
      }),
    })
  } catch {
    // Non-fatal — polling fallback handles stale UI
  }
}
