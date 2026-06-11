import 'server-only'
import { cookies } from 'next/headers'
import { encrypt, decrypt } from '@/lib/jwt'
import type { SessionPayload } from '@/lib/jwt'

export type { SessionPayload }
export { encrypt, decrypt }

export async function createSession(userId: string): Promise<void> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const token = await encrypt({ userId, expiresAt })
  const cookieStore = await cookies()
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
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

  const session = await decrypt(token)

  // Cookie exists but is invalid (stale, wrong key, expired) — clear it
  // so the user isn't stuck in a redirect loop.
  if (!session) {
    cookieStore.delete('session')
    return null
  }

  return session
}
