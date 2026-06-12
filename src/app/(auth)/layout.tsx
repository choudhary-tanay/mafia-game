import Link from 'next/link'
import { MoonScene } from '@/components/ui/illustrations'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      {/* Minimal header */}
      <header className="relative z-20 px-6 py-5 flex items-center justify-between border-b border-border/50">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="w-7 h-7 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center text-sm">
            🔴
          </div>
          <span className="font-bold text-text-primary tracking-tight">Mafia</span>
        </Link>
        <Link href="/" className="text-xs text-text-muted hover:text-text-primary transition-colors">
          ← Play as guest
        </Link>
      </header>

      {/* Night stage — fog, moonlight, vignette */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12 vignette">
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(120,12,12,0.18),transparent)]"
          aria-hidden="true"
        />
        <div className="fog-layer" aria-hidden="true" />
        <div
          className="pointer-events-none absolute right-6 top-8 sm:right-16 sm:top-12 text-gold opacity-40 animate-float"
          aria-hidden="true"
        >
          <MoonScene size={72} />
        </div>

        <div className="relative z-10 w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  )
}
