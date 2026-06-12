import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      {/* Minimal header */}
      <header className="px-6 py-5 flex items-center justify-between border-b border-border/50">
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

      {/* Background gradient */}
      <div className="flex-1 relative flex items-center justify-center px-4 py-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(120,12,12,0.15),transparent)]" />
        <div className="relative z-10 w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  )
}
