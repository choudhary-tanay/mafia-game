// Signup + signin end-to-end: validation, duplicate email, value retention,
// session persistence, room creation as an authenticated host, logout,
// protected routes, case-insensitive email.
import { BASE, launch, step, fail, expectText } from './helpers.mjs'

const browser = await launch()
try {
  const stamp = Date.now()
  const email = `e2e.${stamp}@test.local`
  const password = 'Password1'

  // ── Signup validation ─────────────────────────────────────────────────────
  const ctx1 = await browser.newContext()
  const p1 = await ctx1.newPage()
  await p1.goto(`${BASE}/signup`)
  await expectText(p1, 'Full name')
  await expectText(p1, 'Confirm password')
  step('signup page renders all required fields (name, email, sex, password ×2)')

  await p1.getByRole('button', { name: 'Create account' }).click()
  await expectText(p1, 'Please enter your name.', { label: 'empty-field validation' })
  step('required-field validation works')

  await p1.locator('input[name="fullName"]').fill('E2E Tester')
  await p1.locator('input[name="email"]').fill('bad@invalid')
  await p1.locator('select[name="sex"]').selectOption('PREFER_NOT_TO_SAY')
  await p1.locator('input[name="password"]').fill(password)
  await p1.locator('input[name="confirmPassword"]').fill(password)
  await p1.getByRole('button', { name: 'Create account' }).click()
  await expectText(p1, 'valid email', { label: 'invalid email validation' })
  const retainedName = await p1.locator('input[name="fullName"]').inputValue()
  if (retainedName !== 'E2E Tester') fail(`form wiped on validation error (fullName="${retainedName}")`)
  const retainedSex = await p1.locator('select[name="sex"]').inputValue()
  if (retainedSex !== 'PREFER_NOT_TO_SAY') fail(`sex select wiped on validation error (got "${retainedSex}")`)
  step('invalid email rejected — and the rest of the form (incl. select) is retained')

  // Let React finish committing the action result (form reset) before refilling,
  // otherwise the reset can race our fills and post stale values.
  await p1.waitForTimeout(750)
  await p1.locator('input[name="email"]').fill(email)
  await p1.locator('input[name="password"]').fill(password)
  await p1.locator('input[name="confirmPassword"]').fill('Password2')
  await p1.getByRole('button', { name: 'Create account' }).click()
  await expectText(p1, 'Passwords do not match.', { label: 'password mismatch validation' })
  step('password/confirm mismatch rejected')

  await p1.waitForTimeout(750)
  await p1.locator('input[name="password"]').fill(password)
  await p1.locator('input[name="confirmPassword"]').fill(password)
  await p1.getByRole('button', { name: 'Create account' }).click()
  await p1.waitForURL(/\/dashboard$/, { timeout: 30000 })
  await expectText(p1, 'E2E Tester')
  step(`signup succeeded → redirected to dashboard (${email})`)

  await p1.reload()
  await expectText(p1, 'E2E Tester', { label: 'session after refresh' })
  step('signed-up user stays logged in after refresh')

  // ── Duplicate email blocked ───────────────────────────────────────────────
  const ctx2 = await browser.newContext()
  const p2 = await ctx2.newPage()
  await p2.goto(`${BASE}/signup`)
  await p2.locator('input[name="fullName"]').fill('Imposter')
  await p2.locator('input[name="email"]').fill(email.toUpperCase()) // case-insensitive too
  await p2.locator('select[name="sex"]').selectOption('OTHER')
  await p2.locator('input[name="password"]').fill(password)
  await p2.locator('input[name="confirmPassword"]').fill(password)
  await p2.getByRole('button', { name: 'Create account' }).click()
  await expectText(p2, 'already registered', { label: 'duplicate email rejection' })
  step('duplicate email blocked (even with different casing)')
  await ctx2.close()

  // ── Signed-up user can create a room ──────────────────────────────────────
  await p1.getByRole('button', { name: 'Create room' }).click()
  await p1.waitForURL(/\/lobby\/[A-Z0-9]{6}$/i, { timeout: 30000 })
  await expectText(p1, 'Start the game', { label: 'auth host controls' })
  step('signed-up user created a room and is host')

  await p1.reload()
  await expectText(p1, 'Start the game', { label: 'auth host after refresh' })
  step('auth host survives refresh')

  await p1.getByRole('button', { name: /leave/i }).first().click()
  await p1.waitForURL(/\/dashboard$/, { timeout: 30000 })
  step('leave room returns the auth user to the dashboard')

  // ── Logout ────────────────────────────────────────────────────────────────
  await p1.getByRole('button', { name: 'Log out' }).click()
  await p1.waitForURL(/\/login$/, { timeout: 30000 })
  step('logout lands on /login')

  await p1.goto(`${BASE}/dashboard`)
  await p1.waitForURL(/\/login$/, { timeout: 15000 })
  await p1.goto(`${BASE}/profile`)
  await p1.waitForURL(/\/login$/, { timeout: 15000 })
  step('logged-out user is bounced from /dashboard and /profile')
  await ctx1.close()

  // ── Signin flow ───────────────────────────────────────────────────────────
  const ctx3 = await browser.newContext()
  const p3 = await ctx3.newPage()
  await p3.goto(`${BASE}/login`)
  await p3.locator('input[name="email"]').fill(email)
  await p3.locator('input[name="password"]').fill('WrongPass1')
  await p3.getByRole('button', { name: 'Sign in' }).click()
  await expectText(p3, 'Invalid email or password.', { label: 'bad-credentials error' })
  const retainedEmail = await p3.locator('input[name="email"]').inputValue()
  if (retainedEmail !== email) fail(`login form wiped the email on error (got "${retainedEmail}")`)
  step('wrong password shows a clear error and keeps the email filled in')

  // Case-insensitive email login
  await p3.locator('input[name="email"]').fill(email.toUpperCase())
  await p3.locator('input[name="password"]').fill(password)
  await p3.getByRole('button', { name: 'Sign in' }).click()
  await p3.waitForURL(/\/dashboard$/, { timeout: 30000 })
  await expectText(p3, 'E2E Tester')
  step('valid login succeeds (email matched case-insensitively)')

  await p3.reload()
  await expectText(p3, 'E2E Tester', { label: 'login session after refresh' })
  step('logged-in user stays authenticated after refresh')

  // Logged-in users are bounced away from /login and /signup
  await p3.goto(`${BASE}/login`)
  await p3.waitForURL(/\/dashboard$/, { timeout: 15000 })
  step('authenticated user is bounced from /login back to dashboard')

  await p3.getByRole('button', { name: 'Log out' }).click()
  await p3.waitForURL(/\/login$/, { timeout: 30000 })
  step('signin-flow logout works')
  await ctx3.close()

  // ── Logged-out user can still create a room as guest ─────────────────────
  const ctx4 = await browser.newContext()
  const p4 = await ctx4.newPage()
  await p4.goto(`${BASE}/`)
  const form = p4.locator('form', { has: p4.getByRole('button', { name: /create/i }) })
  await form.locator('input[name="displayName"]').fill('PostLogoutGuest')
  await form.getByRole('button', { name: /create/i }).click()
  await p4.waitForURL(/\/lobby\/[A-Z0-9]{6}$/i, { timeout: 30000 })
  step('guest room creation still works for logged-out users')
  await p4.getByRole('button', { name: /leave/i }).first().click()
  await ctx4.close()

  console.log('\nAUTH FLOWS E2E: ALL CHECKS PASSED')
} finally {
  await browser.close()
}
