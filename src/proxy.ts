import { NextRequest, NextResponse } from 'next/server'
import { decrypt, decryptGuest } from '@/lib/jwt'

// Routes that require authenticated user (no guests)
const userOnlyRoutes = ['/dashboard', '/profile']

// Routes that require any auth (user OR guest)
const anyAuthRoutes = ['/game']

// Routes that bounce authenticated users away to dashboard
const publicAuthRoutes = ['/login', '/signup']

// /lobby/* and /join/* are left open — their pages handle auth internally

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname

  const isUserOnly = userOnlyRoutes.some((r) => path.startsWith(r))
  const isAnyAuth  = anyAuthRoutes.some((r) => path.startsWith(r))
  const isPublicAuth = publicAuthRoutes.includes(path)

  const [userSession, guestSession] = await Promise.all([
    decrypt(req.cookies.get('session')?.value),
    decryptGuest(req.cookies.get('guest_session')?.value),
  ])

  const hasUserAuth  = !!userSession?.userId
  const hasAnyAuth   = hasUserAuth || !!guestSession?.guestId

  if (isUserOnly && !hasUserAuth) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  if (isAnyAuth && !hasAnyAuth) {
    return NextResponse.redirect(new URL('/', req.nextUrl))
  }

  // Authenticated users bounced from login/signup → dashboard
  if (isPublicAuth && hasUserAuth) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
