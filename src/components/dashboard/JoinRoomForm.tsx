'use client'

import { useActionState } from 'react'
import { joinRoom, type RoomActionState } from '@/app/actions/room'
import { LogIn, Loader2 } from 'lucide-react'

export default function JoinRoomForm() {
  const [state, action, pending] = useActionState<RoomActionState, FormData>(joinRoom, undefined)

  return (
    <form action={action} className="flex flex-col gap-3">
      {state?.generalError && (
        <p className="text-xs text-red-400">⚠ {state.generalError}</p>
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="dash-code" className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Room code
        </label>
        <input
          id="dash-code"
          name="code"
          type="text"
          placeholder="ABCD12"
          maxLength={6}
          autoComplete="off"
          className="rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm font-mono uppercase tracking-widest text-text-primary placeholder:text-text-faint focus:outline-none focus:border-border-bright focus:ring-1 focus:ring-border/50 transition-all"
        />
        {state?.errors?.code?.[0] && (
          <p className="text-xs text-red-400">{state.errors.code[0]}</p>
        )}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm font-semibold text-text-primary hover:bg-surface-high hover:border-border-bright disabled:opacity-60 disabled:cursor-not-allowed transition-all"
      >
        {pending ? (
          <><Loader2 size={15} className="animate-spin" /> Joining…</>
        ) : (
          <><LogIn size={15} /> Join room</>
        )}
      </button>
    </form>
  )
}
