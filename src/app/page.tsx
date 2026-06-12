import Link from 'next/link'
import { Zap, Shield, MessageCircle } from 'lucide-react'
import CreateRoomForm from '@/components/home/CreateRoomForm'
import GuestJoinForm from '@/components/join/GuestJoinForm'
import {
  MafiaMask,
  DoctorShield,
  DetectiveGlass,
  VillagerGroup,
  MoonScene,
  VillageSilhouette,
  BallotBox,
  TrophyIcon,
  SkullMark,
  SecretDoor,
} from '@/components/ui/illustrations'

const ROLES = [
  {
    art: MafiaMask,
    name: 'Mafia',
    tagline: 'Eliminate the village. Stay hidden.',
    description: 'Each night you secretly choose who dies. During the day, deflect suspicion and survive.',
    color: 'text-red-400',
    border: 'border-red-900/60',
    bg: 'bg-red-950/20',
    glow: 'role-glow-mafia',
  },
  {
    art: DoctorShield,
    name: 'Doctor',
    tagline: 'Protect one player each night.',
    description: 'Your protection can save a life. Choose wisely — the Mafia may change targets.',
    color: 'text-cyan-400',
    border: 'border-cyan-900/60',
    bg: 'bg-cyan-950/20',
    glow: 'role-glow-doctor',
  },
  {
    art: DetectiveGlass,
    name: 'Detective',
    tagline: 'Investigate and expose the enemy.',
    description: 'Each night you inspect one player and learn the truth. Use it carefully.',
    color: 'text-purple-400',
    border: 'border-purple-900/60',
    bg: 'bg-purple-950/20',
    glow: 'role-glow-detective',
  },
  {
    art: VillagerGroup,
    name: 'Villager',
    tagline: 'Your vote is your only weapon.',
    description: 'No special powers — just sharp eyes, bold claims, and the courage to act.',
    color: 'text-emerald-400',
    border: 'border-emerald-900/60',
    bg: 'bg-emerald-950/20',
    glow: 'role-glow-villager',
  },
]

const HOW_TO = [
  {
    art: <SecretDoor size={22} />,
    tint: 'text-red-300/80',
    step: '1',
    text: 'Roles are secretly assigned. Only you see yours.',
  },
  {
    art: <MoonScene size={22} />,
    tint: 'text-amber-200/80',
    step: '2',
    text: 'Night falls — Mafia strikes, Doctor protects, Detective investigates.',
  },
  {
    art: <SkullMark size={22} />,
    tint: 'text-red-400/80',
    step: '3',
    text: 'Morning arrives. The village learns who, if anyone, was eliminated.',
  },
  {
    art: <MessageCircle size={20} />,
    tint: 'text-text-muted',
    step: '4',
    text: 'Discussion — debate, accuse, defend. Find the Mafia.',
  },
  {
    art: <BallotBox size={22} />,
    tint: 'text-purple-300/80',
    step: '5',
    text: 'Vote to eliminate a suspect. Choose carefully.',
  },
  {
    art: <TrophyIcon size={22} />,
    tint: 'text-gold',
    step: '6',
    text: 'Repeat until all Mafia are gone — or the Mafia takes control.',
  },
]

export default function LandingPage() {
  return (
    <main className="flex flex-col">
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-20 overflow-hidden vignette">
        {/* Background gradient layers */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,12,12,0.25),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_60%,rgba(60,0,80,0.15),transparent)]" />

        {/* Drifting fog */}
        <div className="fog-layer" />

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />

        {/* Moon in the upper sky */}
        <MoonScene
          size={96}
          className="absolute top-14 right-[8%] sm:top-20 sm:right-[14%] w-16 sm:w-24 h-auto text-amber-100/20 animate-float pointer-events-none"
        />

        {/* Floating embers */}
        <div className="absolute top-32 left-1/4 w-2 h-2 rounded-full bg-red-500/40 animate-float" style={{ animationDelay: '0s' }} />
        <div className="absolute top-48 right-1/3 w-1.5 h-1.5 rounded-full bg-red-400/30 animate-float" style={{ animationDelay: '1.5s' }} />
        <div className="absolute bottom-40 left-1/3 w-1 h-1 rounded-full bg-purple-400/30 animate-float" style={{ animationDelay: '0.8s' }} />
        <div className="absolute bottom-60 right-1/4 w-2 h-2 rounded-full bg-red-600/20 animate-float" style={{ animationDelay: '2s' }} />

        {/* Village rooftops along the bottom edge */}
        <div
          className="absolute bottom-0 inset-x-0 flex justify-center items-end text-black/60 pointer-events-none"
          aria-hidden="true"
        >
          <VillageSilhouette className="w-[480px] flex-shrink-0 h-auto" />
          <VillageSilhouette className="w-[480px] flex-shrink-0 h-auto hidden sm:block" />
          <VillageSilhouette className="w-[480px] flex-shrink-0 h-auto hidden lg:block" />
          <VillageSilhouette className="w-[480px] flex-shrink-0 h-auto hidden min-[1450px]:block" />
        </div>

        <div className="relative z-10 w-full max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-red-900/50 bg-red-950/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-red-400 mb-8 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            Online Party Game · No Account Required
          </div>

          {/* Title */}
          <h1 className="mb-5 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <span className="block font-display uppercase tracking-wide text-[clamp(5rem,18vw,10.5rem)] leading-[0.85] text-transparent bg-clip-text bg-gradient-to-b from-white via-red-100 to-red-500/80 text-glow-red">
              Mafia
            </span>
            <span className="block mt-4 text-base sm:text-lg font-light text-text-muted uppercase tracking-[0.3em]">
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
            {/* Create a room — primary CTA */}
            <div className="sm:col-span-2 lg:col-span-1 relative rounded-2xl p-px bg-gradient-to-b from-red-600/70 via-red-900/40 to-red-950/40 shadow-[0_0_60px_-15px_rgba(220,38,38,0.5)] text-left transition-shadow duration-300 hover:shadow-[0_0_70px_-12px_rgba(220,38,38,0.65)]">
              <div className="relative h-full rounded-[15px] bg-gradient-to-b from-red-950/40 to-surface p-6 overflow-hidden">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-900/40 text-red-400">
                    <SecretDoor size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-text-primary text-sm">Create your secret room</p>
                    <p className="text-xs text-text-muted">Invite friends. Assign roles. Let the village decide.</p>
                  </div>
                </div>
                <CreateRoomForm />
              </div>
            </div>

            {/* Join with code */}
            <div className="rounded-2xl border border-border bg-surface p-6 text-left shadow-lg hover:border-border-bright transition-all duration-300">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-raised text-text-muted">
                  <VillagerGroup size={20} />
                </div>
                <div>
                  <p className="font-bold text-text-primary text-sm">Join the village</p>
                  <p className="text-xs text-text-muted">Got an invite code?</p>
                </div>
              </div>
              <GuestJoinForm />
            </div>

            {/* Sign in — quieter */}
            <div className="rounded-2xl border border-border/70 bg-surface/60 p-6 text-left flex flex-col">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-raised text-text-faint">
                  <Shield size={18} />
                </div>
                <div>
                  <p className="font-semibold text-text-primary text-sm">Save your progress</p>
                  <p className="text-xs text-text-faint">Optional — scores &amp; history</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 mt-auto">
                <Link
                  href="/login"
                  className="rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm font-semibold text-text-primary text-center hover:bg-surface-high hover:border-border-bright transition-all"
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
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-text-faint animate-bounce">
          <span className="text-xs uppercase tracking-widest">Roles</span>
          <svg width="16" height="10" viewBox="0 0 16 10" fill="none" aria-hidden="true">
            <path d="M1 1l7 8 7-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

      {/* ── Role cards ──────────────────────────────────────────────────────── */}
      <section className="px-4 py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(60,0,0,0.12),transparent)]" />
        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-red-400 mb-3">Four Roles</p>
            <h2 className="font-display uppercase tracking-wide text-4xl sm:text-5xl text-text-primary">
              Every player has a secret
            </h2>
            <p className="mt-3 text-text-muted max-w-md mx-auto">
              Trust no one. Every conversation hides a motive.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ROLES.map((role, i) => {
              const Art = role.art
              return (
                <div
                  key={role.name}
                  className={`group relative rounded-2xl border ${role.border} ${role.bg} p-6 transition-all duration-300 hover:-translate-y-1 animate-fade-up stagger-${i + 1} cursor-default`}
                >
                  {/* Hover glow */}
                  <div
                    className={`pointer-events-none absolute inset-0 rounded-2xl ${role.glow} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                    aria-hidden="true"
                  />
                  <div className={`relative mb-4 h-12 flex items-center ${role.color} transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-0.5`}>
                    <Art size={44} />
                  </div>
                  <h3 className={`relative font-display uppercase tracking-wider text-2xl mb-1 ${role.color}`}>{role.name}</h3>
                  <p className="relative text-text-primary text-sm font-medium mb-3">{role.tagline}</p>
                  <p className="relative text-text-muted text-xs leading-relaxed">{role.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── How to play ──────────────────────────────────────────────────────── */}
      <section className="px-4 py-20 border-t border-border relative overflow-hidden">
        <div className="fog-layer" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3">Simple rules</p>
            <h2 className="font-display uppercase tracking-wide text-4xl sm:text-5xl text-text-primary">How the game works</h2>
          </div>

          <div className="space-y-3">
            {HOW_TO.map((item, i) => (
              <div
                key={item.step}
                className={`flex items-start gap-4 p-4 rounded-xl border border-border ${
                  i % 2 === 0 ? 'bg-surface' : 'bg-surface-raised/40'
                } hover:bg-surface-raised hover:border-border-bright transition-colors animate-fade-up stagger-${Math.min(i + 1, 8)}`}
              >
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-surface-raised ${item.tint}`}>
                  {item.art}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">Step {item.step}</p>
                  <p className="text-text-primary text-sm leading-relaxed mt-0.5">{item.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <p className="text-text-muted text-sm mb-5">Ready to play?</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-8 py-3.5 text-sm font-bold text-white hover:bg-accent-hover shadow-lg shadow-red-900/30 transition-all hover:shadow-red-900/50"
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
      <footer className="relative border-t border-border py-8 px-4 text-center overflow-hidden">
        <div
          className="absolute bottom-0 inset-x-0 flex justify-center items-end text-black/40 pointer-events-none"
          aria-hidden="true"
        >
          <VillageSilhouette className="w-[480px] flex-shrink-0 h-auto" />
        </div>
        <p className="relative z-10 text-xs text-text-faint tracking-wide">
          Mafia · Online party game · No violence, no real harm · <span className="text-gold/70">Just strategy and deception</span>
        </p>
      </footer>
    </main>
  )
}
