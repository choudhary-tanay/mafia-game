import LoginForm from '@/components/auth/LoginForm'

export const metadata = { title: 'Sign in — Mafia' }

export default function LoginPage() {
  return (
    <div className="w-full max-w-md">
      <div className="rounded-xl border border-border bg-surface p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-text-primary">Welcome back</h1>
          <p className="mt-1 text-sm text-text-muted">Sign in to your account</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
