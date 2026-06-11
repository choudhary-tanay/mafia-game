import Link from 'next/link'
import CreateRoomForm from '@/components/home/CreateRoomForm'
import GuestJoinForm from '@/components/join/GuestJoinForm'

export default function LandingPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 text-center">
      <div className="max-w-xl w-full animate-fade-up">

        {/* Brand */}
        <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 text-3xl">
          🔴
        </div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-accent">Online Party Game</p>
        <h1 className="mb-2 text-5xl sm:text-6xl font-bold tracking-tight text-text-primary">Mafia</h1>
        <p className="mb-8 text-base text-text-muted max-w-sm mx-auto leading-relaxed">
          Deceive. Deduce. Survive. No account required.
        </p>

        {/* ── Three-action layout ─────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 mb-6">

          {/* 1. Create a room (no login needed) */}
          <div className="rounded-2xl border border-border bg-surface p-5 text-left sm:col-span-2">
            <p className="mb-0.5 text-sm font-semibold text-text-primary">Create a room instantly</p>
            <p className="mb-4 text-xs text-text-muted">
              No account required. Just enter your name and invite friends.
            </p>
            <CreateRoomForm />
          </div>

          {/* 2. Join with code */}
          <div className="rounded-2xl border border-border bg-surface p-5 text-left">
            <p className="mb-0.5 text-sm font-semibold text-text-primary">Join with a code</p>
            <p className="mb-4 text-xs text-text-muted">Got a room code? Enter it below.</p>
            <GuestJoinForm />
          </div>

          {/* 3. Sign in / Sign up */}
          <div className="rounded-2xl border border-border bg-surface p-5 text-left flex flex-col justify-between">
            <div>
              <p className="mb-0.5 text-sm font-semibold text-text-primary">Save your progress</p>
              <p className="mb-4 text-xs text-text-muted">
                Sign in only if you want to save scores and game history.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Link
                href="/login"
                className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white text-center hover:bg-accent-hover transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg border border-border px-4 py-2.5 text-sm text-text-muted text-center hover:text-text-primary hover:border-text-muted transition-colors"
              >
                Create account
              </Link>
            </div>
          </div>
        </div>

        {/* Role teaser */}
        <div className="flex justify-center gap-2 flex-wrap text-xs mb-6">
          {[
            { label: 'Mafia',     color: 'border-red-600/40 text-red-400 bg-red-950/20' },
            { label: 'Doctor',    color: 'border-cyan-600/40 text-cyan-400 bg-cyan-950/20' },
            { label: 'Detective', color: 'border-purple-600/40 text-purple-400 bg-purple-950/20' },
            { label: 'Villager',  color: 'border-green-600/40 text-green-400 bg-green-950/20' },
          ].map((r) => (
            <span key={r.label} className={`rounded-full border px-3 py-1 font-medium ${r.color}`}>
              {r.label}
            </span>
          ))}
        </div>

        <p className="text-xs text-text-muted">
          Secret roles · Timed phases · Auto win detection · Mobile-friendly
        </p>
      </div>
    </main>
  )
}
