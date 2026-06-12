import type { Metadata } from 'next'
import { Geist, Bebas_Neue } from 'next/font/google'
import './globals.css'

const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
// Display font for cinematic poster-style headings (role names, phase titles, hero)
const bebas = Bebas_Neue({ variable: '--font-bebas', weight: '400', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Mafia — The Party Game',
  description: 'Online Mafia/Werewolf party game. Deceive. Deduce. Survive.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${bebas.variable} h-full`}>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  )
}
