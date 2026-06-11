import SignupForm from '@/components/auth/SignupForm'

export const metadata = { title: 'Create account — Mafia' }

export default function SignupPage() {
  return (
    <div className="w-full max-w-md">
      <div className="rounded-xl border border-border bg-surface p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-text-primary">Join the village</h1>
          <p className="mt-1 text-sm text-text-muted">Create your Mafia account</p>
        </div>
        <SignupForm />
      </div>
    </div>
  )
}
