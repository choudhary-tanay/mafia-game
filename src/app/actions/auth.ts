'use server'

import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { createServiceClient } from '@/lib/supabase/server'
import { createSession, deleteSession } from '@/lib/session'
import { getGuestSession, deleteGuestSession } from '@/lib/guest-session'
import { signupSchema, loginSchema } from '@/lib/validations'

export type AuthState = {
  errors?: Record<string, string[]>
  generalError?: string
  // Echoed back so a validation failure doesn't wipe the form
  // (React 19 resets uncontrolled inputs after every action).
  values?: { fullName?: string; email?: string; sex?: string }
} | undefined

/** If the person was playing as a guest, hand their lobby seats and any
 *  hosted rooms to the new user identity, then clear the guest cookie so the
 *  two identities can never diverge. Best-effort: auth never fails on this. */
async function migrateGuestToUser(userId: string): Promise<void> {
  const guest = await getGuestSession()
  if (!guest?.guestId) return

  const supabase = createServiceClient()
  await supabase
    .from('room_players')
    .update({ user_id: userId, guest_id: null, is_guest: false })
    .eq('guest_id', guest.guestId)
  await supabase
    .from('rooms')
    .update({ host_user_id: userId, host_guest_id: null })
    .eq('host_guest_id', guest.guestId)

  await deleteGuestSession()
}

export async function signup(state: AuthState, formData: FormData): Promise<AuthState> {
  const raw = {
    fullName: ((formData.get('fullName') as string) ?? '').trim(),
    email: ((formData.get('email') as string) ?? '').trim().toLowerCase(),
    sex: formData.get('sex') as string,
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
  }
  const echo = { fullName: raw.fullName, email: raw.email, sex: raw.sex ?? '' }

  const result = signupSchema.safeParse(raw)
  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors as Record<string, string[]>,
      values: echo,
    }
  }

  const { fullName, email, sex, password } = result.data
  const supabase = createServiceClient()

  const passwordHash = await bcrypt.hash(password, 12)

  const { data: user, error } = await supabase
    .from('users')
    .insert({ full_name: fullName, email, sex, password_hash: passwordHash })
    .select('id')
    .single()

  if (error?.code === '23505') {
    return { errors: { email: ['This email is already registered.'] }, values: echo }
  }
  if (error || !user) {
    return { generalError: 'Something went wrong. Please try again.', values: echo }
  }

  await createSession(user.id)
  await migrateGuestToUser(user.id)
  redirect('/dashboard')
}

export async function login(state: AuthState, formData: FormData): Promise<AuthState> {
  const raw = {
    email: ((formData.get('email') as string) ?? '').trim().toLowerCase(),
    password: formData.get('password') as string,
  }
  const echo = { email: raw.email }

  const result = loginSchema.safeParse(raw)
  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors as Record<string, string[]>,
      values: echo,
    }
  }

  const { email, password } = result.data
  const supabase = createServiceClient()

  // limit(1) instead of maybeSingle(): legacy duplicate emails degrade to
  // "first row wins" rather than erroring out both accounts.
  const { data: users } = await supabase
    .from('users')
    .select('id, password_hash')
    .eq('email', email)
    .order('created_at', { ascending: true })
    .limit(1)
  const user = users?.[0]

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return { generalError: 'Invalid email or password.', values: echo }
  }

  await createSession(user.id)
  await migrateGuestToUser(user.id)
  redirect('/dashboard')
}

export async function logout(): Promise<void> {
  // Clear BOTH identities — a surviving guest cookie would silently
  // re-authenticate this browser as the old guest.
  await deleteSession()
  await deleteGuestSession()
  redirect('/login')
}
