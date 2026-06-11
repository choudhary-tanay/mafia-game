'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { RoomRow, RoomPlayerRow } from '@/types/database'
import { validateLobby, recommendedMafiaCount, formatTimer } from '@/lib/lobby'
import { leaveRoom, updateSettings } from '@/app/actions/room'
import { leaveRoomAsGuest } from '@/app/actions/guest'
import { startGame } from '@/app/actions/game'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'

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

export default function LobbyView({ room, players, currentUserId, currentGuestId }: Props) {
  const router = useRouter()
  // Determine if the current player is the host (only authenticated users can be host)
  const isHost = !!currentUserId && (players.find((p) => p.user_id === currentUserId)?.is_host ?? false)
  const isMe = (p: RoomPlayerRow) =>
    (currentUserId  && p.user_id  === currentUserId) ||
    (currentGuestId && (p as RoomPlayerRow & { guest_id?: string }).guest_id === currentGuestId)
  const validation = validateLobby(players.length, room.mafia_count)
  const recommended = recommendedMafiaCount(players.length)
  const inviteUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/lobby/${room.code}`
      : `/lobby/${room.code}`

  // Guests use a different leave action
  const leaveAction = currentGuestId
    ? leaveRoomAsGuest.bind(null, room.code)
    : leaveRoom.bind(null, room.code)
  const startGameAction = startGame.bind(null, room.code)
  const [settingsState, settingsAction, settingsPending] = useActionState(
    updateSettings,
    undefined,
  )
  const copied = useRef(false)

  // Clear success flash after save
  useEffect(() => {
    if (settingsState === undefined && settingsPending === false) {
      router.refresh()
    }
  }, [settingsState, settingsPending, router])

  async function copyInvite() {
    await navigator.clipboard.writeText(inviteUrl)
    copied.current = true
    router.refresh()
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <header className="border-b border-border bg-surface px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-text-primary">Mafia</span>
            <span className="rounded-md bg-surface-raised px-2.5 py-1 font-mono text-sm font-semibold tracking-widest text-accent">
              {room.code}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyInvite}
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-muted hover:text-text-primary hover:border-text-muted transition-colors"
            >
              Copy invite link
            </button>
            <form action={leaveAction}>
              <Button type="submit" variant="ghost" className="text-xs px-3 py-1.5">
                Leave room
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-8">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_340px]">

          {/* Left: players + validation + start */}
          <div className="space-y-6">
            {/* Validation warnings */}
            {!validation.canStart && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 space-y-1">
                {validation.warnings.map((w) => (
                  <p key={w} className="text-sm text-amber-400">⚠ {w}</p>
                ))}
              </div>
            )}

            {/* Player list */}
            <div className="rounded-xl border border-border bg-surface p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-text-muted">
                Players ({players.length})
              </h2>
              <ul className="space-y-2">
                {players.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 rounded-lg bg-surface-raised px-3 py-2.5"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-sm font-bold text-accent">
                      {p.display_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="flex-1 text-sm text-text-primary">{p.display_name}</span>
                    {isMe(p) && <span className="text-xs text-text-muted">(you)</span>}
                    {(p as RoomPlayerRow & { is_guest?: boolean }).is_guest && (
                      <span className="rounded-full border border-text-muted/30 px-2 py-0.5 text-xs text-text-muted">
                        Guest
                      </span>
                    )}
                    {p.is_host && (
                      <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-semibold text-accent">
                        Host
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Start game (host only) */}
            {isHost ? (
              <div className="rounded-xl border border-border bg-surface p-5">
                <h2 className="mb-1 font-semibold text-text-primary">Start the game</h2>
                <p className="mb-4 text-sm text-text-muted">
                  {validation.canStart
                    ? 'Lobby is ready. Roles will be assigned secretly when you start.'
                    : 'Fix the warnings above before starting.'}
                </p>
                <form action={startGameAction}>
                  <Button
                    type="submit"
                    disabled={!validation.canStart}
                    className="w-full"
                  >
                    Start game
                  </Button>
                </form>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-surface p-5 text-center">
                <p className="text-sm text-text-muted">
                  Waiting for the host to start the game…
                </p>
              </div>
            )}
          </div>

          {/* Right: room settings */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-text-muted">
              Room settings
            </h2>

            {isHost ? (
              <form action={settingsAction} className="space-y-4">
                <input type="hidden" name="roomCode" value={room.code} />

                {settingsState?.generalError && (
                  <p className="text-xs text-red-400">{settingsState.generalError}</p>
                )}

                {/* Mafia count */}
                <div>
                  <Input
                    label="Mafia players"
                    name="mafiaCount"
                    type="number"
                    min={1}
                    max={10}
                    defaultValue={room.mafia_count}
                    error={settingsState?.errors?.mafiaCount?.[0]}
                  />
                  <p className="mt-1 text-xs text-text-muted">
                    Recommended for {players.length} players: {recommended}
                  </p>
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

                {/* Reveal role on death */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="revealRoleOnDeath"
                    defaultChecked={room.reveal_role_on_death}
                    className="h-4 w-4 accent-accent"
                  />
                  <span className="text-sm text-text-primary">Reveal role on death</span>
                </label>

                {/* Tie rule — fixed for Phase 2 */}
                <div className="rounded-lg border border-border bg-surface-raised px-3 py-2.5">
                  <p className="text-xs text-text-muted">Tie rule</p>
                  <p className="text-sm text-text-primary">No elimination on tie</p>
                </div>

                <Button type="submit" loading={settingsPending} className="w-full">
                  Save settings
                </Button>

                {settingsState === undefined && !settingsPending && (
                  <p className="text-center text-xs text-green-400">Settings saved ✓</p>
                )}
              </form>
            ) : (
              // Non-host: read-only view
              <div className="space-y-3 text-sm">
                <SettingRow label="Mafia players" value={String(room.mafia_count)} />
                <SettingRow
                  label="Discussion"
                  value={formatTimer(room.discussion_timer_seconds)}
                />
                <SettingRow label="Voting" value={formatTimer(room.voting_timer_seconds)} />
                <SettingRow label="Night actions" value={formatTimer(room.night_timer_seconds)} />
                <SettingRow
                  label="Reveal role on death"
                  value={room.reveal_role_on_death ? 'Yes' : 'No'}
                />
                <SettingRow label="Tie rule" value="No elimination" />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-surface-raised px-3 py-2">
      <span className="text-text-muted">{label}</span>
      <span className="font-medium text-text-primary">{value}</span>
    </div>
  )
}
