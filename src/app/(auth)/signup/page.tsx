import Link from 'next/link'
import SignupForm from '@/components/auth/SignupForm'

export const metadata = { title: 'Create account — Mafia' }

export default function SignupPage() {
  return (
    <div className="animate-fade-up">
      {/* Card header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-black tracking-tight text-text-primary mb-2">
          Join the village
        </h1>
        <p className="text-text-muted text-sm">
          Create a free account to save your scores, wins, and Mafia history.
        </p>
      </div>

      {/* Form card */}
      <div className="rounded-2xl border border-border bg-surface p-8 shadow-2xl">
        <SignupForm />
      </div>

      {/* Footer links */}
      <div className="mt-5 text-center space-y-3">
        <p className="text-xs text-text-muted">
          Already have an account?{' '}
          <Link href="/login" className="text-text-primary font-semibold hover:text-accent transition-colors">
            Sign in
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
