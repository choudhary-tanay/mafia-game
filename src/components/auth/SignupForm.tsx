'use client'

import { useActionState } from 'react'
import { signup, type AuthState } from '@/app/actions/auth'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { UserPlus } from 'lucide-react'

const SEX_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
]

export default function SignupForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signup, undefined)

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.generalError && (
        <div className="rounded-xl border border-red-700/40 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          ⚠ {state.generalError}
        </div>
      )}

      <Input
        label="Full name"
        name="fullName"
        type="text"
        autoComplete="name"
        placeholder="Your name"
        defaultValue={state?.values?.fullName}
        error={state?.errors?.fullName?.[0]}
      />

      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        defaultValue={state?.values?.email}
        error={state?.errors?.email?.[0]}
      />

      {/* key remounts the select when the echoed value changes */}
      <Select
        key={state?.values?.sex ?? 'unset'}
        label="Sex"
        name="sex"
        defaultValue={state?.values?.sex ?? ''}
        placeholder="Select one…"
        options={SEX_OPTIONS}
        error={state?.errors?.sex?.[0]}
      />

      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder="Min 8 chars, 1 uppercase, 1 number"
        error={state?.errors?.password?.[0]}
      />

      <Input
        label="Confirm password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        placeholder="Re-enter password"
        error={state?.errors?.confirmPassword?.[0]}
      />

      <Button type="submit" loading={pending} className="mt-2 w-full py-3 text-base">
        <UserPlus size={17} />
        Create account
      </Button>
    </form>
  )
}
