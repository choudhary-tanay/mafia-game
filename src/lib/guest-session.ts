import 'server-only'
import { cookies } from 'next/headers'
import { encryptGuest, decryptGuest, type GuestPayload } from '@/lib/jwt'
import { isSecureRequest } from '@/lib/session'

export type { GuestPayload }

export async function createGuestSession(
  guestId: string,
  displayName: string,
  roomId: string,
): Promise<void> {
  const token = await encryptGuest({ guestId, displayName, roomId })
  const cookieStore = await cookies()
  cookieStore.set('guest_session', token, {
    httpOnly: true,
    // Protocol-derived, NOT NODE_ENV — see isSecureRequest: a Secure cookie
    // on http://192.168.x.x is silently dropped, breaking LAN guest play.
    secure: await isSecureRequest(),
    maxAge: 60 * 60 * 24, // 24 hours
    sameSite: 'lax',
    path: '/',
  })
}

export async function getGuestSession(): Promise<GuestPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('guest_session')?.value
  return decryptGuest(token)
}

export async function deleteGuestSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('guest_session')
}
