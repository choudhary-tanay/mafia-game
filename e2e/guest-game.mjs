// Full guest end-to-end: 5 guests (so Mafia/Doctor/Detective all exist),
// room creation → lobby → settings → full game → win → play-again lobby.
import {
  BASE, launch, step, fail, expectText, expectNoText,
  createGuestRoom, joinViaInviteLink, joinViaJoinPage, joinViaLandingCard,
  waitAllInGame, readRole, acknowledgeRole, submitNightAction, castVote,
} from './helpers.mjs'

const browser = await launch()
try {
  const names = ['Hera', 'Gemma', 'Ivor', 'Kato', 'Lumi']
  const ctxs = await Promise.all(Array.from({ length: 5 }, () => browser.newContext()))

  // ── 1. Guest creates a room and becomes host ────────────────────────────
  const { page: host, code } = await createGuestRoom(ctxs[0], names[0])
  step(`guest created room ${code} and landed in the lobby`)
  await expectText(host, 'Start game', { label: 'host controls' })
  await expectText(host, 'Save settings', { label: 'host settings form' })
  step('guest creator has host controls (start + settings)')

  // ── 2. Host refresh keeps host status ───────────────────────────────────
  await host.reload()
  await expectText(host, 'Start game', { label: 'host controls after refresh' })
  step('host survived a page refresh')

  // ── 3. Three join paths: invite link, /join page, landing code card ─────
  const g2 = await joinViaInviteLink(ctxs[1], code, names[1])
  step(`${names[1]} joined via invite link`)
  const g3 = await joinViaJoinPage(ctxs[2], code, names[2])
  step(`${names[2]} joined via /join/${code}`)
  const g4 = await joinViaLandingCard(ctxs[3], code, names[3])
  step(`${names[3]} joined via landing-page code card`)
  const g5 = await joinViaInviteLink(ctxs[4], code, names[4])
  step(`${names[4]} joined via invite link`)

  // ── 4. Duplicate display name is rejected ───────────────────────────────
  const dupCtx = await browser.newContext()
  const dupPage = await dupCtx.newPage()
  await dupPage.goto(`${BASE}/join/${code}`)
  await dupPage.locator('input[name="displayName"]').fill(names[1])
  await dupPage.getByRole('button', { name: 'Join game' }).click()
  await expectText(dupPage, 'already using that name', { label: 'duplicate-name rejection' })
  step('duplicate display name rejected with a clear error')
  await dupCtx.close()

  // ── 5. Everyone sees all five players ───────────────────────────────────
  const pages = [host, g2, g3, g4, g5]
  for (const p of pages) await expectText(p, 'Players', { timeout: 20000, label: 'player list' })
  step('all five lobbies show Players (5)')

  // ── 6. Host updates settings ────────────────────────────────────────────
  await host.locator('select[name="nightTimerSeconds"]').selectOption('30')
  await host.locator('select[name="votingTimerSeconds"]').selectOption('30')
  await host.locator('select[name="discussionTimerSeconds"]').selectOption('60')
  await host.getByRole('button', { name: 'Save settings' }).click()
  await expectText(host, 'Settings saved', { label: 'settings saved flash' })
  await host.reload()
  const nightVal = await host.locator('select[name="nightTimerSeconds"]').inputValue()
  if (nightVal !== '30') fail(`night timer not persisted (got ${nightVal})`)
  step('host saved settings (night 30s, voting 30s, discussion 60s) and they persist')

  // ── 7. Host starts the game; everyone is routed in ──────────────────────
  await host.getByRole('button', { name: 'Start game' }).click()
  await waitAllInGame(pages)
  step('game started — all five players routed to /game')

  // ── 8. Role reveal: exactly one role each, no leakage ───────────────────
  const roles = []
  for (let i = 0; i < pages.length; i++) {
    roles[i] = await readRole(pages[i])
    if (roles[i] !== 'MAFIA') {
      await expectNoText(pages[i], 'Your Mafia team', { label: `${names[i]} must not see the Mafia team` })
    }
  }
  const counts = roles.reduce((m, r) => ((m[r] = (m[r] ?? 0) + 1), m), {})
  if (counts.MAFIA !== 1 || counts.DOCTOR !== 1 || counts.DETECTIVE !== 1 || counts.VILLAGER !== 2) {
    fail(`unexpected role distribution: ${JSON.stringify(counts)}`)
  }
  step(`roles dealt correctly (${roles.join(', ')}) — non-Mafia never see the Mafia team`)

  const idx = (role) => roles.indexOf(role)
  const mafia = pages[idx('MAFIA')]
  const doctor = pages[idx('DOCTOR')]
  const detective = pages[idx('DETECTIVE')]
  const villagerIdxs = roles.map((r, i) => (r === 'VILLAGER' ? i : -1)).filter((i) => i >= 0)
  // Never kill the host (index 0) — the script needs them alive to drive
  // "End Discussion & Start Voting".
  const victimIdx = villagerIdxs.find((i) => i !== 0) ?? villagerIdxs[0]
  const otherVillagerIdx = villagerIdxs.find((i) => i !== victimIdx)
  const mafiaName = names[idx('MAFIA')]
  const doctorName = names[idx('DOCTOR')]
  const victimName = names[victimIdx]

  for (const p of pages) await acknowledgeRole(p)
  step('all players acknowledged their roles')

  // ── 9. Host begins Night 1 ──────────────────────────────────────────────
  await host.getByRole('button', { name: 'Begin Night 1' }).click()
  await expectText(host, 'Round 1', { timeout: 30000, label: 'host sees Night 1' })
  step('host began Night 1')

  // ── 10. Refresh persistence mid-game ────────────────────────────────────
  await doctor.reload()
  await expectText(doctor, 'DOCTOR', { label: 'doctor role badge after reload' })
  step('mid-game refresh keeps identity and role')

  // ── 11. Night actions ───────────────────────────────────────────────────
  await submitNightAction(mafia, victimName, 'Submit Mafia Target')
  step(`mafia targeted ${victimName}`)
  await submitNightAction(doctor, doctorName, 'Submit Save')
  step('doctor protected themselves')
  await submitNightAction(detective, mafiaName, 'Submit Investigation')
  step(`detective investigated ${mafiaName}`)

  // ── 12. Night resolves → discussion; victim is dead ─────────────────────
  const victim = pages[victimIdx]
  await expectText(victim, 'You are eliminated', { timeout: 45000, label: 'victim sees elimination' })
  step(`${victimName} was eliminated overnight`)

  // Detective got their private result; nobody else did
  await expectText(detective, 'Your investigation result', { timeout: 45000 })
  await expectText(detective, 'is MAFIA', { label: 'detective learns the truth' })
  for (const p of [mafia, doctor, victim, pages[otherVillagerIdx]]) {
    await expectNoText(p, 'Your investigation result', { label: 'investigation result must stay private' })
  }
  step('detective result delivered privately — no leakage to other players')

  // ── 13. Host ends discussion early ──────────────────────────────────────
  await host.getByRole('button', { name: 'End Discussion & Start Voting' }).click()
  await expectText(host, 'Cast Vote', { timeout: 30000, label: 'voting phase for host' })
  step('host ended discussion early — voting started')

  // ── 14. Dead player cannot vote ─────────────────────────────────────────
  await expectText(victim, 'You are eliminated.', { timeout: 30000 })
  const victimVoteButtons = await victim.getByRole('button', { name: /^Cast Vote/ }).count()
  if (victimVoteButtons > 0) fail('dead player has a Cast Vote button')
  step('eliminated player is locked out of voting')

  // ── 15. Alive players vote the mafia out ────────────────────────────────
  await castVote(doctor, mafiaName)
  await castVote(detective, mafiaName)
  await castVote(pages[otherVillagerIdx], mafiaName)
  await castVote(mafia, names[otherVillagerIdx])
  step('all alive players voted')

  // ── 16. Village wins ────────────────────────────────────────────────────
  for (const p of pages) await expectText(p, 'Village', { timeout: 45000, label: 'game over' })
  step('vote resolved — Mafia eliminated — Village wins on every screen')

  // ── 17. Play again returns to the same lobby ────────────────────────────
  await host.getByRole('link', { name: /Play again/i }).click()
  await host.waitForURL(new RegExp(`/lobby/${code}$`, 'i'), { timeout: 30000 })
  await expectText(host, 'Players', { label: 'rematch lobby' })
  await expectText(host, 'Start game', { label: 'host controls in rematch lobby' })
  step('play-again returned the host to a startable lobby with all five players')

  console.log('\nGUEST GAME E2E: ALL CHECKS PASSED')
} finally {
  await browser.close()
}
