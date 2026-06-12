'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, LogOut, Play, Settings, Users, AlertTriangle, ChevronDown } from 'lucide-react'
import type { RoomRow, RoomPlayerRow } from '@/types/database'
import { validateLobby, recommendedMafiaCount, formatTimer } from '@/lib/lobby'
import { leaveRoom, updateSettings, type SavedSettings } from '@/app/actions/room'
import { leaveRoomAsGuest } from '@/app/actions/guest'
import { startGame } from '@/app/actions/game'
import { useRealtimeSync } from '@/lib/useRealtimeSync'
import Button from '@/components/ui/Button'
import RulesButton from '@/components/rules/RulesModal'
import HostBadge from '@/components/ui/HostBadge'
import { SecretDoor, VillagerGroup, HourglassIcon, MoonScene } from '@/components/ui/illustrations'

type Props = {
  room: RoomRow
  players: RoomPlayerRow[]
  currentUserId: string | null
  currentGuestId?: string | null
}

const DISCUSSION_OPTIONS = [
  { value: '60', label: '1 minute' },
  { value: '120', label: '2 minutes' },
  { value: '180', label: '3 minutes (default)' },
  { value: '300', label: '5 minutes' },
  { value: '600', label: '10 minutes' },
]
const VOTE_OPTIONS = [
  { value: '30', label: '30 seconds' },
  { value: '60', label: '1 minute (default)' },
  { value: '120', label: '2 minutes' },
]
const NIGHT_OPTIONS = [
  { value: '30', label: '30 seconds' },
  { value: '60', label: '1 minute (default)' },
  { value: '120', label: '2 minutes' },
]

const AVATAR_COLORS = [
  'bg-red-900/60 text-red-300',
  'bg-purple-900/60 text-purple-300',
  'bg-cyan-900/60 text-cyan-300',
  'bg-emerald-900/60 text-emerald-300',
  'bg-amber-900/60 text-amber-300',
  'bg-blue-900/60 text-blue-300',
  'bg-pink-900/60 text-pink-300',
  'bg-indigo-900/60 text-indigo-300',
]

const STAGGERS = [
  'stagger-1', 'stagger-2', 'stagger-3', 'stagger-4',
  'stagger-5', 'stagger-6', 'stagger-7', 'stagger-8',
]

export default function LobbyView({ room, players, currentUserId, currentGuestId }: Props) {
  const router = useRouter()
  const roomTyped = room as typeof room & { host_guest_id?: string | null }
  const isHost =
    (!!currentUserId && room.host_user_id === currentUserId) ||
    (!!currentGuestId && roomTyped.host_guest_id === currentGuestId)
  const isMe = (p: RoomPlayerRow) =>
    (currentUserId && p.user_id === currentUserId) ||
    (currentGuestId &&
      ((p as RoomPlayerRow & { guest_id?: string | null }).guest_id === currentGuestId ||
        p.user_id === currentGuestId))

  // ── Controlled settings state ───────────────────────────────────────────────
  // Using controlled state (not defaultValue) so the form always reflects the
  // latest saved values — both after the host saves AND when a realtime event
  // arrives from another host session.
  const [settings, setSettings] = useState<SavedSettings>({
    mafiaCount:             room.mafia_count,
    discussionTimerSeconds: room.discussion_timer_seconds,
    votingTimerSeconds:     room.voting_timer_seconds,
    nightTimerSeconds:      room.night_timer_seconds,
    revealRoleOnDeath:      room.reveal_role_on_death,
    bollywoodMode:          !!(room as { bollywood_mode?: boolean | null }).bollywood_mode,
  })

  const [, startTransition] = useTransition()

  // Sync local state if the server passes fresh room props (e.g. after router.refresh()).
  // Wrapped in startTransition to satisfy React's concurrent-mode rules about
  // state updates in effects.
  useEffect(() => {
    startTransition(() => {
      setSettings({
        mafiaCount:             room.mafia_count,
        discussionTimerSeconds: room.discussion_timer_seconds,
        votingTimerSeconds:     room.voting_timer_seconds,
        nightTimerSeconds:      room.night_timer_seconds,
        revealRoleOnDeath:      room.reveal_role_on_death,
        bollywoodMode:          !!(room as { bollywood_mode?: boolean | null }).bollywood_mode,
      })
    })
  }, [
    room.mafia_count,
    room.discussion_timer_seconds,
    room.voting_timer_seconds,
    room.night_timer_seconds,
    room.reveal_role_on_death,
  ])

  const validation = validateLobby(players.length, settings.mafiaCount)
  const recommended = recommendedMafiaCount(players.length)
  const inviteUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/lobby/${room.code}`
      : `/lobby/${room.code}`

  const leaveAction = currentUserId
    ? leaveRoom.bind(null, room.code)
    : leaveRoomAsGuest.bind(null, room.code)
  const startGameAction = startGame.bind(null, room.code)
  const [settingsState, settingsAction, settingsPending] = useActionState(updateSettings, undefined)
  const [copied, setCopied] = useState(false)

  // ── React to successful save ────────────────────────────────────────────────
  useEffect(() => {
    if (!settingsState?.success) return
    startTransition(() => {
      // 1. Apply the saved values to local state immediately (no flicker, no stale form)
      if (settingsState.savedValues) {
        setSettings(settingsState.savedValues)
      }
    })
    // 2. Refresh the server component so the authoritative room prop is also updated,
    //    keeping things consistent after a page reload.
    router.refresh()
  }, [settingsState, router])

  // ── Realtime: keep all players in sync (Ably → Supabase backup) ────────────
  // LobbyRefresh polling is the guaranteed baseline; the hook never throws.
  // settings_updated carries the saved values so the form updates instantly;
  // lobby_state_updated (join/leave) just triggers a refetch.
  useRealtimeSync({
    channel: `lobby:${room.code}`,
    events: ['settings_updated', 'lobby_state_updated'],
    onEvent: (event, payload) => {
      if (event === 'settings_updated') {
        const s = payload as SavedSettings | undefined
        if (s && typeof s.mafiaCount === 'number') {
          startTransition(() => setSettings(s))
        }
      }
      router.refresh()
    },
  })

  // ── Copy invite ─────────────────────────────────────────────────────────────
  // navigator.clipboard only exists in secure contexts (https / localhost) —
  // players joining over a LAN IP (http://192.168.x.x:3000) need the fallback.
  async function copyInvite() {
    let ok = false
    try {
      await navigator.clipboard.writeText(inviteUrl)
      ok = true
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = inviteUrl
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        ok = document.execCommand('copy')
        document.body.removeChild(ta)
      } catch { /* leave ok=false */ }
    }
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } else {
      // Last resort: show the URL so the host can copy it manually.
      window.prompt('Copy the invite link:', inviteUrl)
    }
  }

  return (
    <div className="relative flex flex-1 flex-col min-h-0 overflow-hidden vignette">
      {/* Drifting midnight fog behind everything */}
      <div className="fog-layer" aria-hidden="true" />

      {/* Header — the room code is the hero */}
      <header className="relative border-b border-border bg-surface/90 backdrop-blur-sm px-4 sm:px-6 py-3.5 flex-shrink-0">
        <h1 className="sr-only">Mafia lobby — room {room.code}</h1>
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-display text-2xl tracking-wider text-text-primary hidden sm:block">
              Mafia
            </span>
            <div className="flex items-center gap-2.5 rounded-xl border border-accent/40 bg-accent/10 px-3 py-1.5 shadow-lg shadow-red-950/40">
              <SecretDoor size={20} className="text-accent/90 flex-shrink-0" aria-hidden="true" />
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-text-faint">
                  Secret room
                </span>
                <span className="font-mono text-base sm:text-lg font-black tracking-widest text-accent text-glow-red">
                  {room.code}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RulesButton />
            <button
              onClick={copyInvite}
              aria-label="Copy invite link"
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 min-h-9 text-xs text-text-muted hover:text-text-primary hover:border-border-bright hover:bg-surface-raised transition-all"
            >
              {copied ? (
                <>
                  <Check size={13} className="text-emerald-400 animate-pop-in" />
                  <span className="text-emerald-400 font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span className="hidden sm:inline">Copy invite</span>
                  <span className="sm:hidden">Copy</span>
                </>
              )}
            </button>
            <form action={leaveAction}>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 min-h-9 text-xs text-text-muted hover:text-red-400 hover:border-red-900/60 hover:bg-red-950/20 transition-all"
              >
                <LogOut size={13} />
                Leave
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="relative flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">

            {/* LEFT: Players + validation + start */}
            <div className="space-y-5">

              {/* Validation warnings */}
              {!validation.canStart && (
                <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 px-4 py-3 flex items-start gap-3 animate-fade-in">
                  <AlertTriangle size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    {validation.warnings.map((w) => (
                      <p key={w} className="text-sm text-amber-300">{w}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Player count header */}
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <div className="flex items-center gap-2 min-w-0">
                  <Users size={16} className="text-text-muted flex-shrink-0" />
                  <span className="text-sm font-semibold text-text-primary">The Village</span>
                  <span className="rounded-full border border-border bg-surface-raised px-2.5 py-0.5 text-xs font-mono text-text-muted whitespace-nowrap">
                    {players.length < 4
                      ? `${players.length} of 4+ gathered`
                      : `${players.length} gathered`}
                  </span>
                </div>
                {players.length < 4 && (
                  <p className="text-xs text-text-faint italic">Waiting for more players…</p>
                )}
              </div>

              {/* Player grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {players.map((p, i) => {
                  const me = isMe(p)
                  const isPlayerHost = p.is_host
                  const isGuest = (p as RoomPlayerRow & { is_guest?: boolean }).is_guest
                  const avatarColor = AVATAR_COLORS[i % AVATAR_COLORS.length]
                  return (
                    <div
                      key={p.id}
                      className={`relative rounded-xl border p-4 text-center transition-all animate-pop-in ${STAGGERS[Math.min(i, 7)]} ${
                        me
                          ? 'border-accent/40 bg-accent/5 ring-1 ring-accent/20'
                          : 'border-border bg-surface-raised hover:border-border-bright'
                      }`}
                    >
                      {isPlayerHost && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                          <HostBadge compact />
                        </div>
                      )}
                      <div className={`mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full text-base font-bold ring-1 ring-white/10 shadow-inner ${avatarColor}`}>
                        {p.display_name.charAt(0).toUpperCase()}
                      </div>
                      <p className="text-xs font-semibold truncate text-text-primary">{p.display_name}</p>
                      <div className="flex flex-wrap justify-center gap-1 mt-1.5">
                        {me && <span className="text-xs text-accent font-medium">(you)</span>}
                        {isGuest && !isPlayerHost && (
                          <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-muted">
                            Guest
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
                {players.length < 4 && Array.from({ length: Math.max(0, 4 - players.length) }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-surface/30 p-4 text-center animate-fade-in"
                  >
                    <VillagerGroup size={36} className="mb-2 text-text-faint opacity-30" aria-hidden="true" />
                    <p className="text-[11px] text-text-faint">Waiting for a player…</p>
                  </div>
                ))}
              </div>

              {/* Start game */}
              {isHost ? (
                <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-5">
                  <MoonScene
                    size={96}
                    className="pointer-events-none absolute -right-3 -top-5 text-text-faint opacity-10"
                    aria-hidden="true"
                  />
                  <div className="relative flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h2 className="font-display text-2xl tracking-wider text-text-primary">
                        Start The Night
                      </h2>
                      <p className="text-xs text-text-muted mt-1">
                        {validation.canStart
                          ? 'Roles will be assigned secretly. No one will know who is who.'
                          : 'Fix the warnings above before starting.'}
                      </p>
                    </div>
                    {validation.canStart && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-900/40 text-emerald-400 flex-shrink-0 animate-pop-in">
                        <Check size={16} />
                      </div>
                    )}
                  </div>
                  <form action={startGameAction}>
                    <Button
                      type="submit"
                      disabled={!validation.canStart}
                      className={`w-full py-3 text-base font-bold ${validation.canStart ? 'animate-breathe' : ''}`}
                    >
                      <Play size={17} />
                      Start The Night
                    </Button>
                  </form>
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-6 text-center">
                  <HourglassIcon size={30} className="mx-auto mb-3 text-gold/80 animate-float" aria-hidden="true" />
                  <div className="flex items-center justify-center gap-2 text-text-muted">
                    <span className="w-2 h-2 rounded-full bg-amber-400/60 animate-pulse" aria-hidden="true" />
                    <p className="text-sm">Waiting for the host to start the night…</p>
                  </div>
                  <p className="mt-1.5 text-xs text-text-faint">
                    Roles will be assigned secretly. No one will know who is who.
                  </p>
                </div>
              )}
            </div>

            {/* RIGHT: Settings */}
            <div className="rounded-xl border border-border bg-surface/90 backdrop-blur-sm h-fit">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
                <Settings size={15} className="text-text-muted" />
                <h2 className="text-sm font-semibold text-text-primary">Room settings</h2>
                {isHost && <span className="ml-auto text-xs text-text-faint">(host only)</span>}
              </div>

              <div className="p-5">
                {isHost ? (
                  <form action={settingsAction} className="space-y-4">
                    <input type="hidden" name="roomCode" value={room.code} />

                    {settingsState?.generalError && (
                      <p className="text-xs text-red-400">⚠ {settingsState.generalError}</p>
                    )}

                    <SectionLabel>Roles</SectionLabel>

                    {/* Mafia count — controlled */}
                    <div>
                      <label htmlFor="lobby-mafia-count" className="text-xs font-semibold uppercase tracking-wider text-text-muted block mb-1.5">
                        Mafia players
                      </label>
                      <input
                        id="lobby-mafia-count"
                        name="mafiaCount"
                        type="number"
                        min={1}
                        max={10}
                        value={settings.mafiaCount}
                        onChange={(e) => setSettings((s) => ({ ...s, mafiaCount: Number(e.target.value) }))}
                        className="w-full rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-border-bright focus:ring-1 focus:ring-border/50 transition-all"
                      />
                      {settingsState?.errors?.mafiaCount?.[0] && (
                        <p className="text-xs text-red-400 mt-1">⚠ {settingsState.errors.mafiaCount[0]}</p>
                      )}
                      <p className="text-xs text-text-faint mt-1">
                        Recommended for {players.length} players: {recommended}
                      </p>
                    </div>

                    <SectionLabel>Timers</SectionLabel>

                    {/* Discussion timer — controlled */}
                    <div>
                      <label htmlFor="lobby-discussion-timer" className="text-xs font-semibold uppercase tracking-wider text-text-muted block mb-1.5">
                        Discussion timer
                      </label>
                      <div className="relative">
                        <select
                          id="lobby-discussion-timer"
                          name="discussionTimerSeconds"
                          value={settings.discussionTimerSeconds}
                          onChange={(e) => setSettings((s) => ({ ...s, discussionTimerSeconds: Number(e.target.value) }))}
                          className="w-full appearance-none rounded-xl border border-border bg-surface-raised px-4 py-3 pr-10 text-sm text-text-primary focus:outline-none focus:border-border-bright focus:ring-1 focus:ring-border/50 transition-all"
                        >
                          {DISCUSSION_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value} style={{ background: 'var(--surface-raised)' }}>{o.label}</option>
                          ))}
                        </select>
                        <ChevronDown size={15} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-text-faint" aria-hidden="true" />
                      </div>
                      {settingsState?.errors?.discussionTimerSeconds?.[0] && (
                        <p className="text-xs text-red-400 mt-1">⚠ {settingsState.errors.discussionTimerSeconds[0]}</p>
                      )}
                    </div>

                    {/* Voting timer — controlled */}
                    <div>
                      <label htmlFor="lobby-voting-timer" className="text-xs font-semibold uppercase tracking-wider text-text-muted block mb-1.5">
                        Voting timer
                      </label>
                      <div className="relative">
                        <select
                          id="lobby-voting-timer"
                          name="votingTimerSeconds"
                          value={settings.votingTimerSeconds}
                          onChange={(e) => setSettings((s) => ({ ...s, votingTimerSeconds: Number(e.target.value) }))}
                          className="w-full appearance-none rounded-xl border border-border bg-surface-raised px-4 py-3 pr-10 text-sm text-text-primary focus:outline-none focus:border-border-bright focus:ring-1 focus:ring-border/50 transition-all"
                        >
                          {VOTE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value} style={{ background: 'var(--surface-raised)' }}>{o.label}</option>
                          ))}
                        </select>
                        <ChevronDown size={15} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-text-faint" aria-hidden="true" />
                      </div>
                      {settingsState?.errors?.votingTimerSeconds?.[0] && (
                        <p className="text-xs text-red-400 mt-1">⚠ {settingsState.errors.votingTimerSeconds[0]}</p>
                      )}
                    </div>

                    {/* Night timer — controlled */}
                    <div>
                      <label htmlFor="lobby-night-timer" className="text-xs font-semibold uppercase tracking-wider text-text-muted block mb-1.5">
                        Night action timer
                      </label>
                      <div className="relative">
                        <select
                          id="lobby-night-timer"
                          name="nightTimerSeconds"
                          value={settings.nightTimerSeconds}
                          onChange={(e) => setSettings((s) => ({ ...s, nightTimerSeconds: Number(e.target.value) }))}
                          className="w-full appearance-none rounded-xl border border-border bg-surface-raised px-4 py-3 pr-10 text-sm text-text-primary focus:outline-none focus:border-border-bright focus:ring-1 focus:ring-border/50 transition-all"
                        >
                          {NIGHT_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value} style={{ background: 'var(--surface-raised)' }}>{o.label}</option>
                          ))}
                        </select>
                        <ChevronDown size={15} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-text-faint" aria-hidden="true" />
                      </div>
                      {settingsState?.errors?.nightTimerSeconds?.[0] && (
                        <p className="text-xs text-red-400 mt-1">⚠ {settingsState.errors.nightTimerSeconds[0]}</p>
                      )}
                    </div>

                    <SectionLabel>House rules</SectionLabel>

                    {/* Reveal role on death — controlled */}
                    <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-border bg-surface-raised/50 p-3 hover:border-border-bright hover:bg-surface-raised transition-all">
                      <input
                        type="checkbox"
                        name="revealRoleOnDeath"
                        checked={settings.revealRoleOnDeath}
                        onChange={(e) => setSettings((s) => ({ ...s, revealRoleOnDeath: e.target.checked }))}
                        className="h-4 w-4 accent-accent rounded"
                      />
                      <span className="text-sm text-text-primary">Reveal role on death</span>
                    </label>

                    {/* Bollywood Style Mode — film-strip card */}
                    <label
                      className={`flex items-start gap-3 cursor-pointer rounded-xl border p-3 transition-all ${
                        settings.bollywoodMode
                          ? 'border-amber-600/50 bg-gradient-to-r from-amber-950/40 via-surface-raised to-red-950/30'
                          : 'border-border bg-surface-raised/50 hover:border-border-bright hover:bg-surface-raised'
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="bollywoodMode"
                        checked={settings.bollywoodMode}
                        onChange={(e) => setSettings((s) => ({ ...s, bollywoodMode: e.target.checked }))}
                        className="h-4 w-4 mt-0.5 accent-accent rounded"
                      />
                      <div className="min-w-0 flex-1">
                        <span className={`text-sm font-medium flex items-center gap-1.5 ${settings.bollywoodMode ? 'text-amber-200' : 'text-text-primary'}`}>
                          🎬 Bollywood Style Mode
                        </span>
                        <p className="text-xs text-text-muted mt-0.5">
                          {settings.bollywoodMode
                            ? 'Meme popups enabled 🎉'
                            : 'Show Bollywood meme reactions for key game events'}
                        </p>
                        {/* film-strip sprocket holes */}
                        <div className="mt-2 flex items-center gap-1" aria-hidden="true">
                          {Array.from({ length: 9 }).map((_, i) => (
                            <span
                              key={i}
                              className={`h-1.5 w-2 rounded-[2px] ${settings.bollywoodMode ? 'bg-amber-500/50' : 'bg-border'}`}
                            />
                          ))}
                        </div>
                      </div>
                    </label>

                    <div className="rounded-xl border border-border bg-surface-raised px-3 py-2.5">
                      <p className="text-xs text-text-muted uppercase tracking-wide">Tie rule</p>
                      <p className="text-sm text-text-primary font-medium">No elimination on tie</p>
                    </div>

                    <Button type="submit" loading={settingsPending} className="w-full min-h-11">
                      Save settings
                    </Button>

                    {settingsState?.success && !settingsPending && (
                      <p className="text-center text-xs text-emerald-400 flex items-center justify-center gap-1.5 animate-pop-in">
                        <Check size={13} />
                        Room settings saved successfully.
                      </p>
                    )}
                  </form>
                ) : (
                  // Non-host: read-only view driven by the same `settings` state so
                  // realtime updates are reflected here too without a page refresh.
                  <div className="space-y-2.5 text-sm">
                    <SettingRow label="Mafia players" value={String(settings.mafiaCount)} />
                    <SettingRow label="Discussion" value={formatTimer(settings.discussionTimerSeconds)} />
                    <SettingRow label="Voting" value={formatTimer(settings.votingTimerSeconds)} />
                    <SettingRow label="Night actions" value={formatTimer(settings.nightTimerSeconds)} />
                    <SettingRow label="Reveal on death" value={settings.revealRoleOnDeath ? 'Yes' : 'No'} />
                    <SettingRow label="Game mode" value={settings.bollywoodMode ? '🎬 Bollywood' : 'Normal'} />
                    <SettingRow label="Tie rule" value="No elimination" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-2.5 pt-1">
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-faint">{children}</span>
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
    </div>
  )
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-surface-raised px-3 py-2.5">
      <span className="text-text-muted text-xs uppercase tracking-wide">{label}</span>
      <span className="font-semibold text-text-primary text-sm text-right">{value}</span>
    </div>
  )
}
