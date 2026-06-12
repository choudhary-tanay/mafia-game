'use client'

import { useActionState } from 'react'
import { createRoomAsGuest } from '@/app/actions/room'
import type { GuestActionState } from '@/app/actions/guest'
import { Zap, Loader2 } from 'lucide-react'

export default function CreateRoomForm() {
  const [state, action, pending] = useActionState<GuestActionState, FormData>(
    createRoomAsGuest,
    undefined,
  )

  return (
    <form action={action} className="flex flex-col gap-3">
      {state?.generalError && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {state.generalError}
        </p>
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="create-displayName" className="text-xs font-medium text-text-muted uppercase tracking-wider">
          Your name
        </label>
        <input
          id="create-displayName"
          name="displayName"
          type="text"
          placeholder="Enter your name…"
          maxLength={24}
          autoComplete="off"
          className="rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-text-primary placeholder:text-text-faint focus:outline-none focus:border-red-700/60 focus:ring-1 focus:ring-red-700/30 transition-all"
        />
        {state?.errors?.displayName?.[0] && (
          <p className="text-xs text-red-400">{state.errors.displayName[0]}</p>
        )}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-bold text-white hover:bg-accent-hover disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-red-900/20 hover:shadow-red-900/40 transition-all"
      >
        {pending ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Creating room…
          </>
        ) : (
          <>
            <Zap size={16} />
            Create room
          </>
        )}
      </button>
    </form>
  )
}
