'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { joinAsGuest, type GuestActionState } from '@/app/actions/guest'
import { LogIn, Loader2 } from 'lucide-react'

export default function GuestJoinForm({
  roomCode,
  prefillName = '',
}: {
  roomCode?: string
  prefillName?: string
}) {
  const [state, action, pending] = useActionState<GuestActionState, FormData>(
    joinAsGuest,
    undefined,
  )

  return (
    <form action={action} className="flex flex-col gap-3">
      {state?.generalError && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400 animate-shake">
          {state.generalError}
        </p>
      )}

      {!roomCode && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="join-code" className="text-xs font-medium text-text-muted uppercase tracking-wider">
            Room code
          </label>
          <input
            id="join-code"
            name="code"
            type="text"
            placeholder="ABCD12"
            maxLength={6}
            autoComplete="off"
            className="rounded-xl border border-border bg-surface-raised px-4 py-3.5 text-lg font-mono uppercase tracking-widest text-center text-text-primary placeholder:text-text-faint focus:outline-none focus:border-border-bright focus:ring-1 focus:ring-border-bright transition-all"
          />
          {state?.errors?.code?.[0] && (
            <p className="text-xs text-red-400">{state.errors.code[0]}</p>
          )}
        </div>
      )}

      {roomCode && <input type="hidden" name="code" value={roomCode} />}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="join-displayName" className="text-xs font-medium text-text-muted uppercase tracking-wider">
          Your name
        </label>
        <input
          id="join-displayName"
          name="displayName"
          type="text"
          placeholder="Enter your name…"
          defaultValue={prefillName}
          maxLength={24}
          autoComplete="off"
          className="rounded-xl border border-border bg-surface-raised px-4 py-3.5 text-base text-text-primary placeholder:text-text-faint focus:outline-none focus:border-border-bright focus:ring-1 focus:ring-border-bright transition-all"
        />
        {state?.errors?.displayName?.[0] && (
          <p className="text-xs text-red-400">{state.errors.displayName[0]}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-surface-raised px-4 py-3.5 text-sm font-semibold text-text-primary hover:bg-surface-high hover:border-border-bright disabled:opacity-60 disabled:cursor-not-allowed transition-all"
      >
        {pending ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Opening the village gates…
          </>
        ) : (
          <>
            <LogIn size={16} />
            Join game
          </>
        )}
      </button>

      <p className="text-center text-xs text-text-faint">
        No account needed.{' '}
        <Link href="/login" className="text-text-muted hover:text-text-primary transition-colors">
          Sign in
        </Link>{' '}
        to save your score.
      </p>
    </form>
  )
}
