'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createRoomAsGuest } from '@/app/actions/room'
import type { GuestActionState } from '@/app/actions/guest'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function CreateRoomForm() {
  const router = useRouter()
  const [state, action, pending] = useActionState<GuestActionState, FormData>(
    createRoomAsGuest,
    undefined,
  )

  useEffect(() => {
    if (state?.redirectTo) router.replace(state.redirectTo)
  }, [router, state?.redirectTo])

  return (
    <form action={action} className="flex flex-col gap-3">
      {state?.generalError && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {state.generalError}
        </p>
      )}
      <Input
        label="Your display name"
        name="displayName"
        type="text"
        placeholder="Enter your name"
        maxLength={24}
        error={state?.errors?.displayName?.[0]}
      />
      <Button type="submit" loading={pending || !!state?.redirectTo} className="w-full py-3">
        Create a room
      </Button>
    </form>
  )
}
