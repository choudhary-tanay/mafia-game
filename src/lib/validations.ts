import { z } from 'zod'

export const signupSchema = z
  .object({
    fullName: z.string().min(1, 'Please enter your name.'),
    email: z.string().email('Please enter a valid email.'),
    sex: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'], {
      error: 'Please select your sex.',
    }),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
      .regex(/[0-9]/, 'Password must contain at least one number.'),
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email.'),
  password: z.string().min(1, 'Please enter your password.'),
})

export type SignupInput = z.infer<typeof signupSchema>
export type LoginInput = z.infer<typeof loginSchema>

// ─── Phase 2: Room schemas ────────────────────────────────────────────────────

export const joinRoomSchema = z.object({
  code: z
    .string()
    .min(1, 'Please enter a room code.')
    .length(6, 'Room code must be 6 characters.'),
})

export const updateSettingsSchema = z.object({
  mafiaCount: z.coerce
    .number()
    .int()
    .min(1, 'At least 1 Mafia required.')
    .max(10, 'Max 10 Mafia.'),
  discussionTimerSeconds: z.coerce
    .number()
    .int()
    .min(60, 'Minimum 60 seconds.')
    .max(600, 'Maximum 600 seconds.'),
  votingTimerSeconds: z.coerce
    .number()
    .int()
    .min(30, 'Minimum 30 seconds.')
    .max(300, 'Maximum 300 seconds.'),
  nightTimerSeconds: z.coerce
    .number()
    .int()
    .min(30, 'Minimum 30 seconds.')
    .max(300, 'Maximum 300 seconds.'),
})

export type JoinRoomInput = z.infer<typeof joinRoomSchema>
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>
