// Cookie-clearing escape hatch. Server Components can't modify cookies, so
// pages that detect a stale session (valid JWT but no users row) redirect
// here to break the /dashboard <-> /login redirect loop.
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(req: Request) {
  const cookieStore = await cookies()
  cookieStore.delete('session')
  cookieStore.delete('guest_session')
  return NextResponse.redirect(new URL('/login', req.url))
}
