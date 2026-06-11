import SignupForm from '@/components/auth/SignupForm'

export const metadata = { title: 'Create account — Mafia' }

export default function SignupPage() {
  return (
    <div className="w-full max-w-md animate-fade-up">
      <div className="mb-6 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-xl mb-4">
          🔴
        </div>
        <h1 className="text-2xl font-bold text-text-primary">Join the village</h1>
        <p className="mt-1 text-sm text-text-muted">Create your Mafia account</p>
      </div>
      <div className="rounded-2xl border border-border bg-surface p-7 shadow-2xl">
        <SignupForm />
      </div>
    </div>
  )
}
