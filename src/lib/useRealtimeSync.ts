'use client'

// Client realtime sync hook — layered transports:
//   1. Ably (primary)            — token auth via /api/ably/token, auto-reconnect
//   2. Supabase Realtime (backup) — used when Ably is unconfigured/unavailable
//   3. Polling (safety net)       — owned by the calling components, never disabled
//
// The hook NEVER throws: realtime is an accelerator, polling is the guaranteed
// baseline. Subscribes to exactly one transport at a time, so server-side
// dual-publishing never causes double refreshes.

import { useEffect, useRef, useState } from 'react'
import { getBrowserClient } from '@/lib/supabase/client'

export type RealtimeStatus =
  | 'connecting'      // initial transport negotiation
  | 'live'            // Ably connected
  | 'live-backup'     // Supabase Realtime connected
  | 'reconnecting'    // transport dropped, SDK retrying
  | 'polling'         // no realtime transport — polling carries sync

type AblyRealtime = import('ably').Realtime

export function useRealtimeSync({
  channel,
  events,
  onEvent,
}: {
  /** Channel name, e.g. `game:{gameId}` or `lobby:{roomCode}`. Null disables. */
  channel: string | null
  /** Event names to listen for (Supabase needs explicit names; Ably gets all). */
  events: string[]
  /** Called on every received event AND on reconnect (event='reconnected'). */
  onEvent: (event: string, payload?: Record<string, unknown>) => void
}): RealtimeStatus {
  const [status, setStatus] = useState<RealtimeStatus>('connecting')

  // Ref so changing callbacks never tear down subscriptions (written in an
  // effect — React 19 forbids ref writes during render).
  const onEventRef = useRef(onEvent)
  useEffect(() => {
    onEventRef.current = onEvent
  })

  const eventsKey = events.join(',')

  useEffect(() => {
    if (!channel) return

    let cancelled = false
    let ably: AblyRealtime | null = null
    let supabaseChannel: ReturnType<NonNullable<ReturnType<typeof getBrowserClient>>['channel']> | null = null
    let fallbackStarted = false
    const supabase = getBrowserClient()
    const eventNames = eventsKey.split(',').filter(Boolean)
    const isDev = process.env.NODE_ENV !== 'production'

    const safeSetStatus = (s: RealtimeStatus) => { if (!cancelled) setStatus(s) }

    async function subscribeSupabaseFallback() {
      // At most once per effect instance — both the 'failed' handler and the
      // connect() catch can route here, and double-subscribing the same topic
      // attaches duplicate bindings on supabase-js's cached channel instance.
      if (cancelled || !supabase || fallbackStarted) { if (!supabase) safeSetStatus('polling'); return }
      fallbackStarted = true
      try {
        // supabase-js returns the EXISTING instance for a still-registered
        // topic (e.g. from the just-unmounted RoleRevealCard, or StrictMode's
        // first effect pass) — a dying instance whose subscription silently
        // never fires. Remove any stale same-topic channel first.
        const stale = supabase.getChannels().find((c) => c.topic === `realtime:${channel}`)
        if (stale) await supabase.removeChannel(stale)
        if (cancelled) return

        let ch = supabase.channel(channel!)
        for (const ev of eventNames) {
          ch = ch.on('broadcast', { event: ev }, (msg: { payload?: Record<string, unknown> }) => {
            if (isDev) console.debug('[REALTIME_EVENT_RECEIVED]', 'supabase', ev)
            onEventRef.current(ev, msg?.payload)
          })
        }
        supabaseChannel = ch.subscribe((s) => {
          if (isDev) console.debug('[REALTIME_SUBSCRIBED]', 'supabase', channel, s)
          if (s === 'SUBSCRIBED') safeSetStatus('live-backup')
          else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') safeSetStatus('polling')
        })
      } catch (e) {
        console.warn('[mafia] supabase realtime failed — polling only.', e)
        safeSetStatus('polling')
      }
    }

    async function connect() {
      // Probe the token endpoint once: 503 = Ably not configured → fallback
      // immediately without loading the SDK or spamming retries.
      let tokenOk = false
      try {
        const res = await fetch('/api/ably/token')
        tokenOk = res.ok
      } catch { /* network — fall through to fallback */ }

      if (cancelled) return

      if (!tokenOk) {
        subscribeSupabaseFallback()
        return
      }

      try {
        const Ably = (await import('ably')).default
        if (cancelled) return
        ably = new Ably.Realtime({ authUrl: '/api/ably/token', autoConnect: true })

        ably.connection.on('connected', () => {
          if (isDev) console.debug('[REALTIME_SUBSCRIBED]', 'ably', channel, 'connected')
          safeSetStatus('live')
          // Refetch after any (re)connect — events may have been missed offline.
          onEventRef.current('reconnected', { reason: 'RECONNECTED_SYNC' })
        })
        ably.connection.on('connecting', () => safeSetStatus('connecting'))
        ably.connection.on('disconnected', () => safeSetStatus('reconnecting'))
        ably.connection.on('suspended', () => safeSetStatus('reconnecting'))
        ably.connection.on('failed', () => {
          // Terminal Ably failure — switch to the Supabase backup transport.
          console.warn('[mafia] Ably connection failed — switching to Supabase fallback.')
          try { ably?.close() } catch { /* noop */ }
          ably = null
          subscribeSupabaseFallback()
        })

        const ch = ably.channels.get(channel!)
        await ch.subscribe((msg) => {
          if (isDev) console.debug('[REALTIME_EVENT_RECEIVED]', 'ably', msg.name)
          onEventRef.current(msg.name ?? 'game_state_updated', msg.data as Record<string, unknown>)
        })
      } catch (e) {
        console.warn('[mafia] Ably setup failed — switching to Supabase fallback.', e)
        try { ably?.close() } catch { /* noop */ }
        ably = null
        subscribeSupabaseFallback()
      }
    }

    connect()

    return () => {
      cancelled = true
      try { ably?.close() } catch { /* noop */ }
      try { if (supabaseChannel && supabase) supabase.removeChannel(supabaseChannel) } catch { /* noop */ }
    }
  }, [channel, eventsKey])

  // A null channel means realtime is intentionally off (e.g. game over) —
  // derived here instead of setState-in-effect to satisfy React 19 rules.
  return channel ? status : 'polling'
}

/** Human label + tone for the connection chip. */
export function statusLabel(status: RealtimeStatus): { label: string; tone: 'ok' | 'warn' | 'muted' } {
  switch (status) {
    case 'live':         return { label: 'Live', tone: 'ok' }
    case 'live-backup':  return { label: 'Live', tone: 'ok' }
    case 'connecting':   return { label: 'Connecting…', tone: 'muted' }
    case 'reconnecting': return { label: 'Reconnecting to the village…', tone: 'warn' }
    case 'polling':      return { label: 'Auto-sync', tone: 'muted' }
  }
}
