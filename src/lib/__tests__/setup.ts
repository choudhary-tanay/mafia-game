import { vi } from 'vitest'

// Prevent "server-only" from throwing in unit test environments
vi.mock('server-only', () => ({}))

// Prevent next/headers from throwing in unit test environments
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), delete: vi.fn() })),
}))
