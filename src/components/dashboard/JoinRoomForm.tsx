'use client'

import { useActionState } from 'react'
import { joinRoom, type RoomActionState } from '@/app/actions/room'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function JoinRoomForm() {
  const [state, action, pending] = useActionState<RoomActionState, FormData>(joinRoom, undefined)

  return (
    <form action={action} className="flex flex-col gap-3">
      {state?.generalError && (
        <p className="text-xs text-red-400">{state.generalError}</p>
      )}
      <Input
        label="Room code"
        name="code"
        type="text"
        placeholder="ABCD12"
        maxLength={6}
        className="uppercase tracking-widest font-mono"
        error={state?.errors?.code?.[0]}
      />
      <Button type="submit" loading={pending} className="w-full">
        Join room
      </Button>
    </form>
  )
}
