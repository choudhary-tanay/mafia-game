import Link from 'next/link'
import { Users, Zap, Shield, Eye } from 'lucide-react'
import CreateRoomForm from '@/components/home/CreateRoomForm'
import GuestJoinForm from '@/components/join/GuestJoinForm'

const ROLES = [
  {
    icon: '🔴',
    name: 'Mafia',
    tagline: 'Eliminate the village. Stay hidden.',
    description: 'Each night you secretly choose who dies. During the day, deflect suspicion and survive.',
    color: 'text-red-400',
    border: 'border-red-900/60',
    bg: 'bg-red-950/20',
    glow: 'hover:shadow-red-900/40',
  },
  {
    icon: '💊',
    name: 'Doctor',
    tagline: 'Protect one player each night.',
    description: 'Your protection can save a life. Choose wisely — the Mafia may change targets.',
    color: 'text-cyan-400',
    border: 'border-cyan-900/60',
    bg: 'bg-cyan-950/20',
    glow: 'hover:shadow-cyan-900/40',
  },
  {
    icon: '🔍',
    name: 'Detective',
    tagline: 'Investigate and expose the enemy.',
    description: 'Each night you inspect one player and learn the truth. Use it carefully.',
    color: 'text-purple-400',
    border: 'border-purple-900/60',
    bg: 'bg-purple-950/20',
    glow: 'hover:shadow-purple-900/40',
  },
  {
    icon: '👥',
    name: 'Villager',
    tagline: 'Your vote is your only weapon.',
    description: 'No special powers — just sharp eyes, bold claims, and the courage to act.',
    color: 'text-emerald-400',
    border: 'border-emerald-900/60',
    bg: 'bg-emerald-950/20',
    glow: 'hover:shadow-emerald-900/40',
  },
]

const HOW_TO = [
  { icon: <Eye size={16} />, step: '1', text: 'Roles are secretly assigned. Only you see yours.' },
  { icon: '🌙', step: '2', text: 'Night falls — Mafia strikes, Doctor protects, Detective investigates.' },
  { icon: '☀️', step: '3', text: 'Morning arrives. The village learns who, if anyone, was eliminated.' },
  { icon: '💬', step: '4', text: 'Discussion — debate, accuse, defend. Find the Mafia.' },
  { icon: '🗳️', step: '5', text: 'Vote to eliminate a suspect. Choose carefully.' },
  { icon: '🏆', step: '6', text: 'Repeat until all Mafia are gone — or the Mafia takes control.' },
]

export default function LandingPage() {
  return (
    <main className="flex flex-col">
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-20 overflow-hidden">
        {/* Background gradient layers */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,12,12,0.25),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_60%,rgba(60,0,80,0.15),transparent)]" />

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />

        {/* Floating orbs */}
        <div className="absolute top-32 left-1/4 w-2 h-2 rounded-full bg-red-500/40 animate-float" style={{ animationDelay: '0s' }} />
        <div className="absolute top-48 right-1/3 w-1.5 h-1.5 rounded-full bg-red-400/30 animate-float" style={{ animationDelay: '1.5s' }} />
        <div className="absolute bottom-40 left-1/3 w-1 h-1 rounded-full bg-purple-400/30 animate-float" style={{ animationDelay: '0.8s' }} />
        <div className="absolute bottom-60 right-1/4 w-2 h-2 rounded-full bg-red-600/20 animate-float" style={{ animationDelay: '2s' }} />

        <div className="relative z-10 w-full max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-red-900/50 bg-red-950/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-red-400 mb-8 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            Online Party Game · No Account Required
          </div>

          {/* Title */}
          <h1 className="mb-5 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <span className="block text-6xl sm:text-7xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-red-100 to-red-400/70 leading-none">
              Mafia
            </span>
            <span className="block mt-3 text-xl sm:text-2xl font-light text-text-muted tracking-wide">
              The Online Party Game
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mb-12 text-lg sm:text-xl text-text-muted max-w-lg mx-auto leading-relaxed animate-fade-up" style={{ animationDelay: '0.2s' }}>
            Enter the village. Hide your role.{' '}
            <span className="text-text-primary font-medium">Find the Mafia before it&apos;s too late.</span>
          </p>

          {/* Action cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-16 animate-fade-up" style={{ animationDelay: '0.3s' }}>
            {/* Create a room */}
            <div className="sm:col-span-2 lg:col-span-1 rounded-2xl border border-red-900/40 bg-gradient-to-b from-red-950/30 to-surface p-6 text-left shadow-xl shadow-red-950/20 hover:border-red-800/60 transition-all duration-300">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-900/40 text-red-400">
                  <Zap size={18} />
                </div>
                <div>
                  <p className="font-bold text-text-primary text-sm">Create a room</p>
                  <p className="text-xs text-text-muted">No account needed</p>
                </div>
              </div>
              <CreateRoomForm />
            </div>

            {/* Join with code */}
            <div className="rounded-2xl border border-border bg-surface p-6 text-left shadow-lg hover:border-border-bright transition-all duration-300">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-raised text-text-muted">
                  <Users size={18} />
                </div>
                <div>
                  <p className="font-bold text-text-primary text-sm">Join with a code</p>
                  <p className="text-xs text-text-muted">Got an invite?</p>
                </div>
              </div>
              <GuestJoinForm />
            </div>

            {/* Sign in */}
            <div className="rounded-2xl border border-border bg-surface p-6 text-left flex flex-col shadow-lg">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-raised text-text-muted">
                  <Shield size={18} />
                </div>
                <div>
                  <p className="font-bold text-text-primary text-sm">Save your progress</p>
                  <p className="text-xs text-text-muted">Optional — scores &amp; history</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 mt-auto">
                <Link
                  href="/login"
                  className="rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm font-semibold text-text-primary text-center hover:bg-surface-high hover:border-border-bright transition-all"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-xl px-4 py-2.5 text-sm text-text-muted text-center hover:text-text-primary transition-colors"
                >
                  Create account →
                </Link>
              </div>
            </div>
          </div>

          {/* Features strip */}
          <div className="flex flex-wrap justify-center gap-4 text-xs text-text-muted animate-fade-up" style={{ animationDelay: '0.4s' }}>
            {['Secret roles', 'Timed phases', 'Auto win detection', 'Mobile friendly', 'No account required'].map((f) => (
              <span key={f} className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-red-700/70" />
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-text-faint animate-bounce">
          <span className="text-xs uppercase tracking-widest">Roles</span>
          <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
            <path d="M1 1l7 8 7-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

      {/* ── Role cards ──────────────────────────────────────────────────────── */}
      <section className="px-4 py-20 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(60,0,0,0.12),transparent)]" />
        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-red-400 mb-3">Four Roles</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-text-primary">
              Every player has a secret
            </h2>
            <p className="mt-3 text-text-muted max-w-md mx-auto">
              Trust no one. Every conversation hides a motive.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ROLES.map((role, i) => (
              <div
                key={role.name}
                className={`group rounded-2xl border ${role.border} ${role.bg} p-6 hover:shadow-lg ${role.glow} transition-all duration-300 animate-fade-up cursor-default`}
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className="text-4xl mb-4 group-hover:animate-float">{role.icon}</div>
                <h3 className={`text-xl font-bold mb-1 ${role.color}`}>{role.name}</h3>
                <p className="text-text-primary text-sm font-medium mb-3">{role.tagline}</p>
                <p className="text-text-muted text-xs leading-relaxed">{role.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How to play ──────────────────────────────────────────────────────── */}
      <section className="px-4 py-20 border-t border-border">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3">Simple rules</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-text-primary">How the game works</h2>
          </div>

          <div className="space-y-3">
            {HOW_TO.map((item, i) => (
              <div
                key={item.step}
                className="flex items-start gap-4 p-4 rounded-xl border border-border bg-surface hover:bg-surface-raised transition-colors animate-fade-up"
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-surface-raised text-text-muted font-bold text-sm">
                  {item.step}
                </div>
                <p className="text-text-primary text-sm leading-relaxed pt-1">{item.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <p className="text-text-muted text-sm mb-5">Ready to play?</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-8 py-3 text-sm font-bold text-white hover:bg-accent-hover shadow-lg shadow-red-900/30 transition-all hover:shadow-red-900/50"
              >
                <Zap size={16} />
                Create account
              </Link>
              <span className="text-text-faint text-xs">or just enter a name above to play as guest</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border py-6 px-4 text-center">
        <p className="text-xs text-text-faint">
          Mafia · Online party game · No violence, no real harm · Just strategy and deception
        </p>
      </footer>
    </main>
  )
}
