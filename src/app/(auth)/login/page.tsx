import Link from 'next/link'
import LoginForm from '@/components/auth/LoginForm'

export const metadata = { title: 'Sign in — Mafia' }

export default function LoginPage() {
  return (
    <div className="animate-fade-up">
      {/* Card header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-black tracking-tight text-text-primary mb-2">
          Welcome back
        </h1>
        <p className="text-text-muted text-sm">
          Return to the village and continue your record.
        </p>
      </div>

      {/* Form card */}
      <div className="rounded-2xl border border-border bg-surface p-8 shadow-2xl">
        <LoginForm />
      </div>

      {/* Footer links */}
      <div className="mt-5 text-center space-y-3">
        <p className="text-xs text-text-muted">
          No account?{' '}
          <Link href="/signup" className="text-text-primary font-semibold hover:text-accent transition-colors">
            Create one free
          </Link>
        </p>
        <p className="text-xs text-text-faint">
          Just want to play?{' '}
          <Link href="/" className="text-text-muted hover:text-text-primary transition-colors">
            Join as guest →
          </Link>
        </p>
      </div>
    </div>
  )
}
