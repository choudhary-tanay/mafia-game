/**
 * Lightweight inline SVG illustrations for the Mafia portal.
 * All draw with `currentColor` so they tint via Tailwind text-* classes.
 * Keep these tiny — they render inline, no network requests.
 */

type IllustrationProps = {
  className?: string
  /** Pixel size (width = height). Default 48. */
  size?: number
}

/** Domino mask — Mafia */
export function MafiaMask({ className = '', size = 48 }: IllustrationProps) {
  return (
    <svg viewBox="0 0 64 40" width={size} height={size * 0.625} className={className} fill="none" aria-hidden="true">
      <path
        d="M2 14C2 8 8 4 16 4c6 0 10 2 16 2s10-2 16-2c8 0 14 4 14 10 0 10-8 22-18 22-5 0-8-4-12-4s-7 4-12 4C12 36 2 24 2 14Z"
        fill="currentColor" opacity="0.9"
      />
      <ellipse cx="20" cy="17" rx="7" ry="5" fill="var(--background, #080810)" />
      <ellipse cx="44" cy="17" rx="7" ry="5" fill="var(--background, #080810)" />
    </svg>
  )
}

/** Shield with cross — Doctor */
export function DoctorShield({ className = '', size = 48 }: IllustrationProps) {
  return (
    <svg viewBox="0 0 48 56" width={size * 0.857} height={size} className={className} fill="none" aria-hidden="true">
      <path
        d="M24 2 44 10v16c0 13-8.5 22.5-20 26C12.5 48.5 4 39 4 26V10L24 2Z"
        fill="currentColor" opacity="0.25" stroke="currentColor" strokeWidth="2.5"
      />
      <path d="M24 14v20M14 24h20" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    </svg>
  )
}

/** Magnifying glass — Detective */
export function DetectiveGlass({ className = '', size = 48 }: IllustrationProps) {
  return (
    <svg viewBox="0 0 56 56" width={size} height={size} className={className} fill="none" aria-hidden="true">
      <circle cx="22" cy="22" r="15" stroke="currentColor" strokeWidth="4" fill="currentColor" fillOpacity="0.12" />
      <circle cx="22" cy="22" r="8" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      <path d="m34 34 16 16" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    </svg>
  )
}

/** Group of villagers */
export function VillagerGroup({ className = '', size = 48 }: IllustrationProps) {
  return (
    <svg viewBox="0 0 64 44" width={size} height={size * 0.6875} className={className} fill="currentColor" aria-hidden="true">
      <circle cx="32" cy="10" r="8" />
      <path d="M18 44c0-9 6-15 14-15s14 6 14 15H18Z" />
      <circle cx="12" cy="15" r="6" opacity="0.55" />
      <path d="M1 44c0-7.5 4.5-12 11-12 2 0 3.8.4 5.3 1.2A19.6 19.6 0 0 0 13 44H1Z" opacity="0.55" />
      <circle cx="52" cy="15" r="6" opacity="0.55" />
      <path d="M63 44c0-7.5-4.5-12-11-12-2 0-3.8.4-5.3 1.2A19.6 19.6 0 0 1 51 44h12Z" opacity="0.55" />
    </svg>
  )
}

/** Crescent moon with stars — night */
export function MoonScene({ className = '', size = 48 }: IllustrationProps) {
  return (
    <svg viewBox="0 0 56 56" width={size} height={size} className={className} fill="currentColor" aria-hidden="true">
      <path d="M38 4a24 24 0 1 0 14 38A26 26 0 0 1 38 4Z" opacity="0.9" />
      <circle cx="44" cy="12" r="1.6" opacity="0.7" />
      <circle cx="50" cy="22" r="1.1" opacity="0.5" />
      <circle cx="46" cy="30" r="1.3" opacity="0.6" />
    </svg>
  )
}

/** Village rooftop silhouette — horizontal scene divider */
export function VillageSilhouette({ className = '', size = 120 }: IllustrationProps) {
  return (
    <svg viewBox="0 0 240 48" width={size} height={size * 0.2} className={className} fill="currentColor" aria-hidden="true" preserveAspectRatio="xMidYMax meet">
      <path d="M0 48V36h8l6-9 6 9h6V22l10-10 10 10v14h8V20h4v-6l8-8 8 8v6h4v16h10l8-12 8 12h6V26l9-9 9 9v10h8V18h5v-7l7-7 7 7v7h5v18h10l5-8 5 8h9v12H0Z" opacity="0.85" />
      <rect x="34" y="30" width="3" height="4" fill="var(--gold, #d97706)" opacity="0.9" />
      <rect x="118" y="28" width="3" height="4" fill="var(--gold, #d97706)" opacity="0.7" />
      <rect x="196" y="26" width="3" height="4" fill="var(--gold, #d97706)" opacity="0.8" />
    </svg>
  )
}

/** Ballot box with paper — voting */
export function BallotBox({ className = '', size = 48 }: IllustrationProps) {
  return (
    <svg viewBox="0 0 52 52" width={size} height={size} className={className} fill="none" aria-hidden="true">
      <path d="M16 14 26 3l11 8-10 11-11-8Z" fill="currentColor" opacity="0.55" />
      <rect x="4" y="22" width="44" height="26" rx="3" stroke="currentColor" strokeWidth="3" fill="currentColor" fillOpacity="0.15" />
      <rect x="17" y="19" width="18" height="5" rx="2" fill="currentColor" />
    </svg>
  )
}

/** Trophy — winner */
export function TrophyIcon({ className = '', size = 48 }: IllustrationProps) {
  return (
    <svg viewBox="0 0 52 52" width={size} height={size} className={className} fill="none" aria-hidden="true">
      <path d="M14 6h24v12a12 12 0 0 1-24 0V6Z" fill="currentColor" opacity="0.85" />
      <path d="M14 9H6a8 8 0 0 0 9 9M38 9h8a8 8 0 0 1-9 9" stroke="currentColor" strokeWidth="3" />
      <path d="M23 30h6v8h-6z" fill="currentColor" opacity="0.7" />
      <rect x="16" y="38" width="20" height="6" rx="2" fill="currentColor" />
    </svg>
  )
}

/** Skull — eliminated */
export function SkullMark({ className = '', size = 48 }: IllustrationProps) {
  return (
    <svg viewBox="0 0 48 52" width={size * 0.92} height={size} className={className} fill="currentColor" aria-hidden="true">
      <path d="M24 2C12 2 4 11 4 22c0 7 3.4 12 8 15v8a3 3 0 0 0 3 3h2v-5h3v5h8v-5h3v5h2a3 3 0 0 0 3-3v-8c4.6-3 8-8 8-15C44 11 36 2 24 2Z" opacity="0.9" />
      <circle cx="16" cy="22" r="5" fill="var(--background, #080810)" />
      <circle cx="32" cy="22" r="5" fill="var(--background, #080810)" />
      <path d="M24 28l-3 6h6l-3-6Z" fill="var(--background, #080810)" />
    </svg>
  )
}

/** Hourglass — timers / waiting */
export function HourglassIcon({ className = '', size = 48 }: IllustrationProps) {
  return (
    <svg viewBox="0 0 40 52" width={size * 0.77} height={size} className={className} fill="none" aria-hidden="true">
      <path d="M6 4h28M6 48h28" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M10 6c0 10 4 14 10 20-6 6-10 10-10 20M30 6c0 10-4 14-10 20 6 6 10 10 10 20" stroke="currentColor" strokeWidth="3" />
      <path d="M15 42c1-5 3-7 5-9 2 2 4 4 5 9H15Z" fill="currentColor" opacity="0.7" />
    </svg>
  )
}

/** Keyhole in a door — secret room / invite */
export function SecretDoor({ className = '', size = 48 }: IllustrationProps) {
  return (
    <svg viewBox="0 0 44 56" width={size * 0.785} height={size} className={className} fill="none" aria-hidden="true">
      <rect x="3" y="3" width="38" height="50" rx="4" stroke="currentColor" strokeWidth="3" fill="currentColor" fillOpacity="0.12" />
      <circle cx="22" cy="24" r="6" fill="currentColor" />
      <path d="M19 28h6l2 12h-10l2-12Z" fill="currentColor" />
    </svg>
  )
}
