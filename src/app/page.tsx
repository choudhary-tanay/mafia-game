import Link from 'next/link'
import GuestJoinForm from '@/components/join/GuestJoinForm'

export default function LandingPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
      <div className="max-w-xl w-full animate-fade-up">

        {/* Brand */}
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 text-3xl">
          🔴
        </div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">Online Party Game</p>
        <h1 className="mb-3 text-5xl sm:text-6xl font-bold tracking-tight text-text-primary">Mafia</h1>
        <p className="mb-8 text-lg text-text-muted max-w-md mx-auto leading-relaxed">
          Deceive. Deduce. Survive.
        </p>

        {/* Guest join — primary CTA */}
        <div className="mb-6 rounded-2xl border border-border bg-surface p-6 text-left">
          <p className="mb-1 text-sm font-semibold text-text-primary">Join a game</p>
          <p className="mb-4 text-xs text-text-muted">Enter a room code to join. No account required.</p>
          <GuestJoinForm />
        </div>

        {/* Auth CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
          <Link
            href="/login"
            className="rounded-lg bg-accent px-8 py-3 text-sm font-semibold text-white hover:bg-accent-hover transition-colors shadow-lg"
          >
            Sign in to create a room
          </Link>
          <Link
            href="/signup"
            className="rounded-lg border border-border px-8 py-3 text-sm font-semibold text-text-muted hover:text-text-primary hover:border-text-muted transition-colors"
          >
            Create account
          </Link>
        </div>

        {/* Role teaser */}
        <div className="flex justify-center gap-2 flex-wrap text-sm mb-8">
          {[
            { label: 'Mafia',     color: 'border-red-600/40 text-red-400 bg-red-950/20' },
            { label: 'Doctor',    color: 'border-cyan-600/40 text-cyan-400 bg-cyan-950/20' },
            { label: 'Detective', color: 'border-purple-600/40 text-purple-400 bg-purple-950/20' },
            { label: 'Villager',  color: 'border-green-600/40 text-green-400 bg-green-950/20' },
          ].map((r) => (
            <span key={r.label} className={`rounded-full border px-3 py-1 font-medium text-xs ${r.color}`}>
              {r.label}
            </span>
          ))}
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          {[
            { icon: '🔐', title: 'Secret roles', desc: 'Assigned server-side. Nobody cheats.' },
            { icon: '⏱️', title: 'Timed phases', desc: 'Night, discussion, voting — auto-driven.' },
            { icon: '👤', title: 'No signup needed', desc: 'Just enter your name and join.' },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-surface p-4">
              <p className="text-xl mb-2">{f.icon}</p>
              <p className="text-sm font-semibold text-text-primary">{f.title}</p>
              <p className="text-xs text-text-muted mt-0.5">{f.desc}</p>
            </div>
          ))}
        </div>

        <p className="mt-6 text-xs text-text-muted">
          Sign in to save your score and game history.
        </p>
      </div>
    </main>
  )
}
