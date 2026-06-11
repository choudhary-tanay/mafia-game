import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div className="max-w-xl w-full animate-fade-up">

        {/* Logo / brand */}
        <div className="mb-8 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 text-3xl">
          🔴
        </div>

        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">
          Online Party Game
        </p>
        <h1 className="mb-4 text-5xl sm:text-6xl font-bold tracking-tight text-text-primary">
          Mafia
        </h1>
        <p className="mb-10 text-lg text-text-muted max-w-md mx-auto leading-relaxed">
          Deceive. Deduce. Survive. Play the classic hidden-role game with friends — no moderator needed.
        </p>

        {/* Role teaser */}
        <div className="mb-10 flex justify-center gap-3 flex-wrap text-sm">
          {[
            { label: 'Mafia',      color: 'border-red-600/40 text-red-400 bg-red-950/20' },
            { label: 'Doctor',     color: 'border-cyan-600/40 text-cyan-400 bg-cyan-950/20' },
            { label: 'Detective',  color: 'border-purple-600/40 text-purple-400 bg-purple-950/20' },
            { label: 'Villager',   color: 'border-green-600/40 text-green-400 bg-green-950/20' },
          ].map((r) => (
            <span key={r.label} className={`rounded-full border px-3 py-1 font-medium ${r.color}`}>
              {r.label}
            </span>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/signup"
            className="rounded-lg bg-accent px-8 py-3 text-sm font-semibold text-white hover:bg-accent-hover transition-colors shadow-lg"
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

        {/* Feature bullets */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          {[
            { icon: '🔐', title: 'Secret roles', desc: 'Backend-assigned — no one can cheat.' },
            { icon: '⏱️', title: 'Timed phases', desc: 'Night actions, discussion, voting.' },
            { icon: '🏆', title: 'Win detection', desc: 'Auto win condition every round.' },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-surface p-4">
              <p className="text-xl mb-2">{f.icon}</p>
              <p className="text-sm font-semibold text-text-primary">{f.title}</p>
              <p className="text-xs text-text-muted mt-0.5">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
