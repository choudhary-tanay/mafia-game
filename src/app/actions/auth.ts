'use server'

import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { createServiceClient } from '@/lib/supabase/server'
import { createSession, deleteSession } from '@/lib/session'
import { signupSchema, loginSchema } from '@/lib/validations'

export type AuthState = {
  errors?: Record<string, string[]>
  generalError?: string
} | undefined

export async function signup(state: AuthState, formData: FormData): Promise<AuthState> {
  const raw = {
    fullName: formData.get('fullName') as string,
    email: formData.get('email') as string,
    sex: formData.get('sex') as string,
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
  }

  const result = signupSchema.safeParse(raw)
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const { fullName, email, sex, password } = result.data
  const supabase = createServiceClient()

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existing) {
    return { errors: { email: ['This email is already registered.'] } }
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const { data: user, error } = await supabase
    .from('users')
    .insert({ full_name: fullName, email, sex, password_hash: passwordHash })
    .select('id')
    .single()

  if (error || !user) {
    return { generalError: 'Something went wrong. Please try again.' }
  }

  await createSession(user.id)
  redirect('/dashboard')
}

export async function login(state: AuthState, formData: FormData): Promise<AuthState> {
  const raw = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const result = loginSchema.safeParse(raw)
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const { email, password } = result.data
  const supabase = createServiceClient()

  const { data: user } = await supabase
    .from('users')
    .select('id, password_hash')
    .eq('email', email)
    .maybeSingle()

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return { generalError: 'Invalid email or password.' }
  }

  await createSession(user.id)
  redirect('/dashboard')
}

export async function logout(): Promise<void> {
  await deleteSession()
  redirect('/login')
}
