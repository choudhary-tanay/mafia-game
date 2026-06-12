// Mixed end-to-end: 2 authenticated users + 2 guests in one game.
// Covers: dashboard create/join, guest badges, host-only permissions,
// multi-round play (abstain day → auto-advance, night deadline expiry →
// quiet night), vote-out win, and scoring persisted ONLY for auth users.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import {
  launch, step, fail, expectText, expectNoText,
  joinViaInviteLink, joinViaLandingCard, waitAllInGame,
  readRole, acknowledgeRole, submitNightAction, castVote, abstain, signup,
} from './helpers.mjs'

const browser = await launch()
try {
  const stamp = Date.now()
  const names = ['Astra', 'Brio', 'Cedar', 'Dune'] // P1 auth host, P2 auth, P3+P4 guests
  const emails = [`mix1.${stamp}@test.local`, `mix2.${stamp}@test.local`]
  const password = 'Password1'

  // ── 1. Two accounts sign up; P1 creates a room from the dashboard ───────
  const ctx1 = await browser.newContext()
  const host = await signup(ctx1, { fullName: names[0], email: emails[0], password })
  step('P1 (auth) signed up')
  await host.getByRole('button', { name: 'Create room' }).click()
  await host.waitForURL(/\/lobby\/[A-Z0-9]{6}$/i, { timeout: 30000 })
  const code = host.url().split('/').pop().toUpperCase()
  step(`P1 created room ${code} from the dashboard`)

  // ── 2. P2 (auth) joins by room code from the dashboard ──────────────────
  const ctx2 = await browser.newContext()
  const p2 = await signup(ctx2, { fullName: names[1], email: emails[1], password })
  await p2.locator('input[name="code"]').fill(code)
  await p2.getByRole('button', { name: 'Join room' }).click()
  await p2.waitForURL(new RegExp(`/lobby/${code}$`, 'i'), { timeout: 30000 })
  step('P2 (auth) joined with the room code')

  // ── 3. Guests join via invite link and landing card ─────────────────────
  const ctx3 = await browser.newContext()
  const g3 = await joinViaInviteLink(ctx3, code, names[2])
  step('P3 (guest) joined via invite link')
  const ctx4 = await browser.newContext()
  const g4 = await joinViaLandingCard(ctx4, code, names[3])
  step('P4 (guest) joined via landing-page code card')

  const pages = [host, p2, g3, g4]
  for (const p of pages) await expectText(p, 'Players (4)', { timeout: 20000 })
  step('all four lobbies show Players (4)')

  // ── 4. Badges + host-only permissions ────────────────────────────────────
  const guestBadges = await host.getByText('Guest', { exact: true }).count()
  if (guestBadges < 2) fail(`expected 2 Guest badges, saw ${guestBadges}`)
  await expectNoText(p2, 'Save settings', { label: 'non-host must not see the settings form' })
  const p2Start = await p2.getByRole('button', { name: 'Start game' }).count()
  if (p2Start > 0) fail('non-host sees a Start game button')
  await expectText(p2, 'Waiting for the host', { label: 'non-host waiting state' })
  step('guest badges shown; only the real host has settings + start controls')

  // ── 5. Host configures fast timers and starts ────────────────────────────
  await host.locator('select[name="nightTimerSeconds"]').selectOption('30')
  await host.locator('select[name="votingTimerSeconds"]').selectOption('30')
  await host.locator('select[name="discussionTimerSeconds"]').selectOption('60')
  await host.getByRole('button', { name: 'Save settings' }).click()
  await expectText(host, 'Settings saved')
  await host.getByRole('button', { name: 'Start game' }).click()
  const gameId = await waitAllInGame(pages)
  step(`game ${gameId} started with 4 players`)

  // ── 6. Roles: 1 mafia, 1 doctor, 2 villagers ─────────────────────────────
  const roles = []
  for (let i = 0; i < pages.length; i++) {
    roles[i] = await readRole(pages[i])
    if (roles[i] !== 'MAFIA') await expectNoText(pages[i], 'Your Mafia team')
  }
  const counts = roles.reduce((m, r) => ((m[r] = (m[r] ?? 0) + 1), m), {})
  if (counts.MAFIA !== 1 || counts.DOCTOR !== 1 || counts.VILLAGER !== 2) {
    fail(`unexpected role distribution: ${JSON.stringify(counts)}`)
  }
  step(`roles dealt (${roles.join(', ')}); no Mafia-team leakage`)

  const idx = (r) => roles.indexOf(r)
  const mafia = pages[idx('MAFIA')]
  const doctor = pages[idx('DOCTOR')]
  const doctorName = names[idx('DOCTOR')]
  const mafiaName = names[idx('MAFIA')]
  const villagerIdxs = roles.map((r, i) => (r === 'VILLAGER' ? i : -1)).filter((i) => i >= 0)
  // Never kill the host (index 0) — the script needs them alive to drive
  // "End Discussion & Start Voting".
  const victimIdx = villagerIdxs.find((i) => i !== 0) ?? villagerIdxs[0]
  const survivorIdx = villagerIdxs.find((i) => i !== victimIdx)
  const victimName = names[victimIdx]

  for (const p of pages) await acknowledgeRole(p)
  await host.getByRole('button', { name: 'Begin Night 1' }).click()
  step('host began Night 1')

  // ── 7. Night 1: kill lands (doctor saves self) ───────────────────────────
  await submitNightAction(mafia, victimName, 'Submit Mafia Target')
  await submitNightAction(doctor, doctorName, 'Submit Save')
  await expectText(pages[victimIdx], 'You are eliminated', { timeout: 45000 })
  step(`night 1 resolved — ${victimName} eliminated`)

  // ── 8. Day 1: everyone abstains → no elimination → auto next night ──────
  await host.getByRole('button', { name: 'End Discussion & Start Voting' }).click()
  const alive = [mafia, doctor, pages[survivorIdx]]
  for (const p of alive) await abstain(p)
  step('all alive players abstained')
  // VOTE_RESOLUTION auto-advances to Night 2 after its 5s window — no host involvement
  await expectText(mafia, 'Submit Mafia Target', { timeout: 45000, label: 'auto-advance to Night 2' })
  await expectText(doctor, 'Round 2', { timeout: 45000, label: 'round counter advanced' })
  step('abstain → no elimination → timer auto-advanced everyone to Night 2')

  // ── 9. Night 2: mafia never acts → 30s deadline expires → quiet night ────
  await submitNightAction(doctor, doctorName, 'Submit Save')
  step('doctor acted; mafia is stalling — waiting for the night deadline')
  await expectText(doctor, 'The night passed quietly', { timeout: 90000, label: 'deadline-expiry resolution' })
  step('night deadline expired and the phase auto-resolved (quiet night, nobody died)')

  // ── 10. Day 2: vote the mafia out ─────────────────────────────────────────
  await host.getByRole('button', { name: 'End Discussion & Start Voting' }).click()
  await castVote(doctor, mafiaName)
  await castVote(pages[survivorIdx], mafiaName)
  await abstain(mafia)
  for (const p of pages) await expectText(p, 'Village wins!', { timeout: 45000 })
  step('mafia voted out — Village wins on all four screens')

  // ── 11. Guest vs auth game-over CTAs ─────────────────────────────────────
  await expectText(g3, 'temporary', { label: 'guest sees temporary-score note' })
  await expectText(host, 'Back to dashboard', { label: 'auth sees dashboard link' })
  step('game-over screen differentiates guests (temporary score) from auth users')

  // ── 12. Scoring persisted for auth users only (DB check) ─────────────────
  const env = Object.fromEntries(
    readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
      .split('\n').filter((l) => l.includes('=') && !l.startsWith('#'))
      .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }),
  )
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: result } = await supabase.from('game_results').select('winning_team').eq('game_id', gameId).single()
  if (result?.winning_team !== 'VILLAGE') fail(`game_results says ${result?.winning_team}, expected VILLAGE`)

  const { data: stats } = await supabase.from('player_game_stats').select('user_id, guest_id, is_guest, won').eq('game_id', gameId)
  if ((stats ?? []).length !== 4) fail(`expected 4 stat rows, got ${stats?.length}`)
  const guestStats = (stats ?? []).filter((s) => s.is_guest)
  if (guestStats.length !== 2) fail(`expected 2 guest stat rows, got ${guestStats.length}`)

  for (const em of emails) {
    const { data: u } = await supabase.from('users').select('total_games_played').eq('email', em).single()
    if (u?.total_games_played !== 1) fail(`${em} total_games_played=${u?.total_games_played}, expected 1`)
  }
  step('scoring persisted: game_results=VILLAGE, 4 stat rows (2 guest), both auth profiles updated')

  console.log('\nMIXED GAME E2E: ALL CHECKS PASSED')
} finally {
  await browser.close()
}
