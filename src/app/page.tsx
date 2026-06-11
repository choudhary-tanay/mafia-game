import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div className="max-w-xl">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent">
          Online Party Game
        </p>
        <h1 className="mb-4 text-5xl font-bold tracking-tight text-text-primary">
          Mafia
        </h1>
        <p className="mb-10 text-lg text-text-muted">
          Deceive. Deduce. Survive. Play the classic hidden-role party game with
          friends — no moderator needed.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/signup"
            className="rounded-lg bg-accent px-8 py-3 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
          >
            Create account
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-border px-8 py-3 text-sm font-semibold text-text-muted hover:text-text-primary hover:border-text-muted transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  )
}
