'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { joinAsGuest, type GuestActionState } from '@/app/actions/guest'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function GuestJoinForm({
  roomCode,
  prefillName = '',
}: {
  roomCode?: string
  prefillName?: string
}) {
  // On success the server action redirects (303) straight into the lobby.
  const [state, action, pending] = useActionState<GuestActionState, FormData>(
    joinAsGuest,
    undefined,
  )

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.generalError && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {state.generalError}
        </p>
      )}

      {!roomCode && (
        <Input
          label="Room code"
          name="code"
          type="text"
          placeholder="ABCD12"
          maxLength={6}
          className="uppercase tracking-widest font-mono"
          error={state?.errors?.code?.[0]}
        />
      )}

      {roomCode && <input type="hidden" name="code" value={roomCode} />}

      <Input
        label="Your display name"
        name="displayName"
        type="text"
        placeholder="Enter your name"
        defaultValue={prefillName}
        maxLength={24}
        error={state?.errors?.displayName?.[0]}
      />

      <Button type="submit" loading={pending} className="w-full py-3">
        Join game
      </Button>

      <p className="text-center text-xs text-text-muted">
        No account needed.{' '}
        <Link href="/login" className="text-accent hover:text-accent-hover transition-colors">
          Sign in
        </Link>{' '}
        to save your score.
      </p>
    </form>
  )
}
