// Pure JWT helpers — no next/headers dependency.
// Safe to import in Edge Runtime (proxy.ts) and server contexts alike.
import { SignJWT, jwtVerify } from 'jose'

export type SessionPayload = {
  userId: string
  expiresAt: Date
}

// Lazy: evaluated on first call so process.env is fully loaded in all runtimes.
function getKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET is not set')
  return new TextEncoder().encode(secret)
}

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT({ userId: payload.userId, expiresAt: payload.expiresAt.toISOString() })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getKey())
}

export async function decrypt(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getKey(), { algorithms: ['HS256'] })
    return {
      userId: payload.userId as string,
      expiresAt: new Date(payload.expiresAt as string),
    }
  } catch {
    return null
  }
}

// ─── Guest session JWT (Edge-Runtime safe) ────────────────────────────────────

export type GuestPayload = {
  guestId: string
  displayName: string
  roomId: string
}

export async function encryptGuest(payload: GuestPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getKey())
}

export async function decryptGuest(token: string | undefined): Promise<GuestPayload | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getKey(), { algorithms: ['HS256'] })
    return {
      guestId: payload.guestId as string,
      displayName: payload.displayName as string,
      roomId: payload.roomId as string,
    }
  } catch {
    return null
  }
}
