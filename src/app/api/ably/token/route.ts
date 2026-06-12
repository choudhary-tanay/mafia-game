import { NextResponse } from 'next/server'
import Ably from 'ably'
import { getPlayerIdentity } from '@/lib/identity'

/**
 * Ably token-auth endpoint. The browser never sees ABLY_API_KEY — it requests
 * a short-lived token here, scoped to SUBSCRIBE-ONLY on game/lobby channels so
 * clients can never forge realtime events (all publishing is server-side).
 *
 * Returns 503 when Ably is not configured — the client hook treats that as
 * "use the Supabase Realtime fallback".
 */
export async function GET(): Promise<NextResponse> {
  const key = process.env.ABLY_API_KEY
  if (!key) {
    return NextResponse.json({ error: 'Ably not configured' }, { status: 503 })
  }

  // Any player (guest or authenticated) may subscribe. Payloads are
  // deliberately data-free, so channel access reveals nothing hidden.
  const identity = await getPlayerIdentity()
  if (!identity) {
    return NextResponse.json({ error: 'No session' }, { status: 401 })
  }

  try {
    const rest = new Ably.Rest({ key })
    const tokenRequest = await rest.auth.createTokenRequest({
      clientId: identity.userId ?? identity.guestId ?? 'anonymous',
      capability: JSON.stringify({
        'game:*': ['subscribe'],
        'lobby:*': ['subscribe'],
      }),
      ttl: 60 * 60 * 1000, // 1 hour — SDK auto-renews via this endpoint
    })
    return NextResponse.json(tokenRequest)
  } catch (e) {
    console.warn('[ably/token] token request failed:', e)
    return NextResponse.json({ error: 'Token request failed' }, { status: 503 })
  }
}
