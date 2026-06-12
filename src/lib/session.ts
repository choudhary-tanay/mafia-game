import 'server-only'
import { cookies, headers } from 'next/headers'
import { encrypt, decrypt } from '@/lib/jwt'
import type { SessionPayload } from '@/lib/jwt'

export type { SessionPayload }
export { encrypt, decrypt }

/**
 * Secure-cookie flag derived from the ACTUAL request protocol, not NODE_ENV.
 * `secure: true` on a plain-http LAN origin (http://192.168.x.x:3000 — how
 * phones join a locally hosted game) makes browsers silently DROP the cookie:
 * no session ever persists and every action bounces. Browsers exempt
 * localhost, which is why this only breaks for non-host devices.
 * Real HTTPS deployments send x-forwarded-proto: https and keep Secure.
 */
export async function isSecureRequest(): Promise<boolean> {
  // Explicit deployment override for HTTPS setups whose TLS terminator does
  // not forward x-forwarded-proto (direct TLS to Node, TCP-passthrough LB) —
  // without it the Secure flag would silently drop there.
  if (process.env.FORCE_SECURE_COOKIES === '1') return true
  const h = await headers()
  const proto = h.get('x-forwarded-proto') ?? ''
  if (!proto) return false
  // Every hop must be https: in append-style proxy chains the leftmost entry
  // is client-controlled, so trusting any single position is spoofable.
  return proto.split(',').every((p) => p.trim() === 'https')
}

export async function createSession(userId: string): Promise<void> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const token = await encrypt({ userId, expiresAt })
  const cookieStore = await cookies()
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: await isSecureRequest(),
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  })
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('session')
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return null

  // An invalid cookie is simply "not logged in" — deleting it here would
  // throw during Server Component render (cookies can only be modified in
  // Server Actions / Route Handlers). The /logout route clears stale cookies.
  return decrypt(token)
}
