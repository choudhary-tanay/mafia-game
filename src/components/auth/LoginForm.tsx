'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { login, type AuthState } from '@/app/actions/auth'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function LoginForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(login, undefined)

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.generalError && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {state.generalError}
        </p>
      )}

      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
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

      <Button type="submit" loading={pending} className="mt-2 w-full py-3">
        Sign in
      </Button>

      <p className="text-center text-sm text-text-muted">
        No account yet?{' '}
        <Link href="/signup" className="text-accent hover:text-accent-hover transition-colors">
          Create one
        </Link>
      </p>
    </form>
  )
}
