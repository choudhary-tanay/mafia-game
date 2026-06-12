'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, LogOut, Play, Settings, Users, Crown, AlertTriangle } from 'lucide-react'
import type { RoomRow, RoomPlayerRow } from '@/types/database'
import { validateLobby, recommendedMafiaCount, formatTimer } from '@/lib/lobby'
import { leaveRoom, updateSettings } from '@/app/actions/room'
import { leaveRoomAsGuest } from '@/app/actions/guest'
import { startGame } from '@/app/actions/game'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import RulesButton from '@/components/rules/RulesModal'

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
  const validation = validateLobby(players.length, room.mafia_count)
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

  useEffect(() => {
    if (settingsState?.success) router.refresh()
  }, [settingsState, router])

  async function copyInvite() {
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Header */}
      <header className="border-b border-border bg-surface/90 backdrop-blur-sm px-4 sm:px-6 py-4 flex-shrink-0">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-black text-text-primary text-lg hidden sm:block tracking-tight">Mafia</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted hidden sm:block">Room</span>
              <span className="rounded-xl border border-accent/30 bg-accent/10 px-3 py-1.5 font-mono text-base font-black tracking-widest text-accent">
                {room.code}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RulesButton />
            <button
              onClick={copyInvite}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-text-muted hover:text-text-primary hover:border-border-bright hover:bg-surface-raised transition-all"
            >
              {copied ? <><Check size={13} className="text-emerald-400" /> Copied!</> : <><Copy size={13} /> Copy invite</>}
            </button>
            <form action={leaveAction}>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-text-muted hover:text-red-400 hover:border-red-900/60 hover:bg-red-950/20 transition-all"
              >
                <LogOut size={13} />
                Leave
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">

            {/* LEFT: Players + validation + start */}
            <div className="space-y-5">

              {/* Validation warnings */}
              {!validation.canStart && (
                <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 px-4 py-3 flex items-start gap-3">
                  <AlertTriangle size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    {validation.warnings.map((w) => (
                      <p key={w} className="text-sm text-amber-300">{w}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Player count header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-text-muted" />
                  <span className="text-sm font-semibold text-text-primary">
                    Players
                  </span>
                  <span className="rounded-full bg-surface-raised px-2 py-0.5 text-xs font-mono text-text-muted">
                    {players.length}
                  </span>
                </div>
                {players.length < 4 && (
                  <p className="text-xs text-text-muted">Need {4 - players.length} more</p>
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
                      className={`relative rounded-xl border p-4 text-center transition-all ${
                        me
                          ? 'border-accent/40 bg-accent/5 ring-1 ring-accent/20'
                          : 'border-border bg-surface-raised hover:border-border-bright'
                      }`}
                    >
                      {/* Host crown */}
                      {isPlayerHost && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 shadow-lg">
                            <Crown size={11} className="text-white" />
                          </div>
                        </div>
                      )}

                      {/* Avatar */}
                      <div className={`mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full text-base font-bold ${avatarColor}`}>
                        {p.display_name.charAt(0).toUpperCase()}
                      </div>

                      {/* Name */}
                      <p className={`text-xs font-semibold truncate ${me ? 'text-text-primary' : 'text-text-primary'}`}>
                        {p.display_name}
                      </p>

                      {/* Badges */}
                      <div className="flex flex-wrap justify-center gap-1 mt-1.5">
                        {me && (
                          <span className="text-xs text-accent font-medium">(you)</span>
                        )}
                        {isGuest && !isPlayerHost && (
                          <span className="rounded-full border border-text-faint/40 px-1.5 py-0.5 text-[10px] text-text-faint">
                            Guest
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Empty slots */}
                {players.length < 4 && Array.from({ length: Math.max(0, 4 - players.length) }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="rounded-xl border border-dashed border-border/50 p-4 flex flex-col items-center justify-center opacity-40"
                  >
                    <div className="h-11 w-11 rounded-full border-2 border-dashed border-border mb-2" />
                    <p className="text-xs text-text-faint">Waiting…</p>
                  </div>
                ))}
              </div>

              {/* Start game */}
              {isHost ? (
                <div className="rounded-xl border border-border bg-surface p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="font-bold text-text-primary">Start the game</h2>
                      <p className="text-xs text-text-muted mt-1">
                        {validation.canStart
                          ? 'Lobby is ready. Roles will be assigned secretly when you start.'
                          : 'Fix the warnings above before starting.'}
                      </p>
                    </div>
                    {validation.canStart && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-900/40 text-emerald-400 flex-shrink-0">
                        <Check size={16} />
                      </div>
                    )}
                  </div>
                  <form action={startGameAction}>
                    <Button
                      type="submit"
                      disabled={!validation.canStart}
                      className="w-full py-3 text-base font-bold"
                    >
                      <Play size={17} />
                      Start game
                    </Button>
                  </form>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-surface p-5 text-center">
                  <div className="flex items-center justify-center gap-2 text-text-muted">
                    <div className="w-2 h-2 rounded-full bg-amber-400/60 animate-pulse" />
                    <p className="text-sm">Waiting for the host to start…</p>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: Settings */}
            <div className="rounded-xl border border-border bg-surface">
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

                    <div>
                      <Input
                        label="Mafia players"
                        name="mafiaCount"
                        type="number"
                        min={1}
                        max={10}
                        defaultValue={room.mafia_count}
                        error={settingsState?.errors?.mafiaCount?.[0]}
                        hint={`Recommended for ${players.length} players: ${recommended}`}
                      />
                    </div>

                    <Select
                      label="Discussion timer"
                      name="discussionTimerSeconds"
                      defaultValue={String(room.discussion_timer_seconds)}
                      options={DISCUSSION_OPTIONS}
                      error={settingsState?.errors?.discussionTimerSeconds?.[0]}
                    />

                    <Select
                      label="Voting timer"
                      name="votingTimerSeconds"
                      defaultValue={String(room.voting_timer_seconds)}
                      options={VOTE_OPTIONS}
                      error={settingsState?.errors?.votingTimerSeconds?.[0]}
                    />

                    <Select
                      label="Night action timer"
                      name="nightTimerSeconds"
                      defaultValue={String(room.night_timer_seconds)}
                      options={NIGHT_OPTIONS}
                      error={settingsState?.errors?.nightTimerSeconds?.[0]}
                    />

                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-surface-raised transition-colors">
                      <input
                        type="checkbox"
                        name="revealRoleOnDeath"
                        defaultChecked={room.reveal_role_on_death}
                        className="h-4 w-4 accent-accent rounded"
                      />
                      <span className="text-sm text-text-primary">Reveal role on death</span>
                    </label>

                    <div className="rounded-lg border border-border bg-surface-raised px-3 py-2.5">
                      <p className="text-xs text-text-muted">Tie rule</p>
                      <p className="text-sm text-text-primary font-medium">No elimination on tie</p>
                    </div>

                    <Button type="submit" loading={settingsPending} className="w-full">
                      Save settings
                    </Button>

                    {settingsState?.success && !settingsPending && (
                      <p className="text-center text-xs text-emerald-400 flex items-center justify-center gap-1">
                        <Check size={12} /> Settings saved
                      </p>
                    )}
                  </form>
                ) : (
                  <div className="space-y-2.5 text-sm">
                    <SettingRow label="Mafia players" value={String(room.mafia_count)} />
                    <SettingRow label="Discussion" value={formatTimer(room.discussion_timer_seconds)} />
                    <SettingRow label="Voting" value={formatTimer(room.voting_timer_seconds)} />
                    <SettingRow label="Night actions" value={formatTimer(room.night_timer_seconds)} />
                    <SettingRow label="Reveal on death" value={room.reveal_role_on_death ? 'Yes' : 'No'} />
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

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-surface-raised px-3 py-2.5">
      <span className="text-text-muted text-xs uppercase tracking-wide">{label}</span>
      <span className="font-semibold text-text-primary text-sm">{value}</span>
    </div>
  )
}
