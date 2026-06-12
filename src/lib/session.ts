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

  // An invalid cookie is simply "not logged in" — deleting it here would
  // throw during Server Component render (cookies can only be modified in
  // Server Actions / Route Handlers). The /logout route clears stale cookies.
  return decrypt(token)
}
