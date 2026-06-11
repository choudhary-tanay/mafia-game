'use client'
// Phase 6: replace this polling with Supabase Realtime channel subscriptions.
// Subscribe to room:players_updated, room:settings_updated via supabase.channel().
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LobbyRefresh({ intervalMs = 4000 }: { intervalMs?: number }) {
  const router = useRouter()
  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs)
    return () => clearInterval(id)
  }, [router, intervalMs])
  return null
}
