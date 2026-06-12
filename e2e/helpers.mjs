// Shared helpers for the multi-context end-to-end scripts.
// Run against a dev server on localhost:3000 (npm run dev).
import { chromium } from 'playwright'

export const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
export const NAV_TIMEOUT = Number(process.env.E2E_NAV_TIMEOUT ?? 30000)

export async function launch() {
  return chromium.launch({ headless: true })
}

let stepCount = 0
export function step(msg) {
  stepCount++
  console.log(`  ✓ [${stepCount}] ${msg}`)
}

export function fail(msg) {
  console.error(`  ✗ FAIL: ${msg}`)
  process.exitCode = 1
  throw new Error(msg)
}

export async function expectText(page, text, { timeout = NAV_TIMEOUT, label } = {}) {
  try {
    await page.getByText(text, { exact: false }).first().waitFor({ timeout })
  } catch {
    fail(`${label ?? `expected text "${text}"`} — not found on ${page.url()}`)
  }
}

export async function expectNoText(page, text, { label } = {}) {
  const count = await page.getByText(text, { exact: false }).count()
  if (count > 0) fail(`${label ?? `text "${text}" should NOT be visible`} on ${page.url()}`)
}

/** Create a room as a guest from the landing page. Returns { page, code }. */
export async function createGuestRoom(ctx, name) {
  const page = await ctx.newPage()
  await page.goto(`${BASE}/`)
  const form = page.locator('form', { has: page.getByRole('button', { name: /create/i }) })
  await form.locator('input[name="displayName"]').fill(name)
  await form.getByRole('button', { name: /create/i }).click()
  await page.waitForURL(/\/lobby\/[A-Z0-9]{6}$/i, { timeout: NAV_TIMEOUT })
  const code = page.url().split('/').pop().toUpperCase()
  return { page, code }
}

/** Join a room via the invite link (lobby URL → inline join form). */
export async function joinViaInviteLink(ctx, code, name) {
  const page = await ctx.newPage()
  await page.goto(`${BASE}/lobby/${code}`)
  await page.locator('input[name="displayName"]').fill(name)
  await page.getByRole('button', { name: 'Join game' }).click()
  await page.waitForURL(new RegExp(`/lobby/${code}$`, 'i'), { timeout: NAV_TIMEOUT })
  // lobby view shows the player list once joined
  await expectText(page, 'The Village', { label: `lobby for ${name}` })
  return page
}

/** Join via the public /join/CODE page. */
export async function joinViaJoinPage(ctx, code, name) {
  const page = await ctx.newPage()
  await page.goto(`${BASE}/join/${code}`)
  await page.locator('input[name="displayName"]').fill(name)
  await page.getByRole('button', { name: 'Join game' }).click()
  await page.waitForURL(new RegExp(`/lobby/${code}$`, 'i'), { timeout: NAV_TIMEOUT })
  await expectText(page, 'The Village', { label: `lobby for ${name}` })
  return page
}

/** Join from the landing-page "Join with a code" card. */
export async function joinViaLandingCard(ctx, code, name) {
  const page = await ctx.newPage()
  await page.goto(`${BASE}/`)
  const form = page.locator('form', { has: page.getByRole('button', { name: 'Join game' }) })
  await form.locator('input[name="code"]').fill(code)
  await form.locator('input[name="displayName"]').fill(name)
  await form.getByRole('button', { name: 'Join game' }).click()
  await page.waitForURL(new RegExp(`/lobby/${code}$`, 'i'), { timeout: NAV_TIMEOUT })
  await expectText(page, 'The Village', { label: `lobby for ${name}` })
  return page
}

/** Wait until every page has navigated into /game/<id>. Returns the gameId. */
export async function waitAllInGame(pages, { timeout = 45000 } = {}) {
  let gameId = null
  for (const page of pages) {
    await page.waitForURL(/\/game\/[0-9a-f-]+$/i, { timeout })
    gameId = page.url().split('/').pop()
  }
  return gameId
}

/** Read the role shown on the role-reveal card. */
export async function readRole(page) {
  await page.getByText('Your secret role').waitFor({ timeout: NAV_TIMEOUT })
  const heading = page.locator('h1')
  const label = (await heading.first().textContent())?.trim()
  const map = { Mafia: 'MAFIA', Doctor: 'DOCTOR', Detective: 'DETECTIVE', Villager: 'VILLAGER' }
  const role = map[label]
  if (!role) fail(`unrecognised role label "${label}"`)
  return role
}

/** Acknowledge the role card. */
export async function acknowledgeRole(page) {
  await page.getByRole('button', { name: 'I understand my role' }).click()
}

/** Submit a night action: click the target name, then the role's submit button. */
export async function submitNightAction(page, targetName, submitLabel) {
  await page.getByRole('button', { name: submitLabel }).waitFor({ timeout: 45000 })
  await page.getByRole('button', { name: new RegExp(targetName) }).first().click()
  await page.getByRole('button', { name: submitLabel }).click()
  await expectText(page, 'Action submitted', { label: `night action by →${targetName}` })
}

/** Cast a vote for a player (two-step UI). */
export async function castVote(page, targetName) {
  await page.getByRole('button', { name: 'Cast Vote' }).waitFor({ timeout: 45000 })
  await page.getByRole('button', { name: new RegExp(targetName) }).first().click()
  await page.getByRole('button', { name: new RegExp('^Cast Vote') }).click()
  await expectText(page, 'Vote submitted', { label: `vote for ${targetName}` })
}

/** Abstain. */
export async function abstain(page) {
  await page.getByRole('button', { name: 'Abstain' }).waitFor({ timeout: 45000 })
  await page.getByRole('button', { name: 'Abstain' }).click()
  await expectText(page, 'Vote submitted', { label: 'abstain' })
}

/** Sign up a fresh account; resolves once the dashboard is shown. */
export async function signup(ctx, { fullName, email, password }) {
  const page = await ctx.newPage()
  await page.goto(`${BASE}/signup`)
  await page.locator('input[name="fullName"]').fill(fullName)
  await page.locator('input[name="email"]').fill(email)
  await page.locator('select[name="sex"]').selectOption('PREFER_NOT_TO_SAY')
  await page.locator('input[name="password"]').fill(password)
  await page.locator('input[name="confirmPassword"]').fill(password)
  await page.getByRole('button', { name: 'Join the family' }).click()
  await page.waitForURL(/\/dashboard$/, { timeout: NAV_TIMEOUT })
  return page
}

/** Log in; resolves once the dashboard is shown. */
export async function login(ctx, { email, password }) {
  const page = await ctx.newPage()
  await page.goto(`${BASE}/login`)
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill(password)
  await page.getByRole('button', { name: 'Enter the village' }).click()
  await page.waitForURL(/\/dashboard$/, { timeout: NAV_TIMEOUT })
  return page
}
