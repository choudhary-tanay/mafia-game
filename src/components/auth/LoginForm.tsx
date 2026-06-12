'use client'

import { useActionState } from 'react'
import { login, type AuthState } from '@/app/actions/auth'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { LogIn } from 'lucide-react'

export default function LoginForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(login, undefined)

  return (
    <form action={action} className="flex flex-col gap-5">
      {state?.generalError && (
        <div className="rounded-xl border border-red-700/40 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          ⚠ {state.generalError}
        </div>
      )}

      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        defaultValue={state?.values?.email}
        error={state?.errors?.email?.[0]}
      />

      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="Your password"
        error={state?.errors?.password?.[0]}
      />

      <Button type="submit" loading={pending} className="mt-1 w-full py-3 text-base">
        <LogIn size={17} />
        Sign in
      </Button>
    </form>
  )
}
