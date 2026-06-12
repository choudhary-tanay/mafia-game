/**
 * Bollywood popup diagnosis script.
 * Creates a 5-player game in Bollywood mode, captures ALL browser console
 * messages tagged [BOLLYWOOD_*] and builds the diagnosis table.
 */
import {
  launch, step, expectText,
  createGuestRoom, joinViaInviteLink,
  waitAllInGame, readRole, acknowledgeRole, submitNightAction, castVote,
} from './helpers.mjs'

const browser = await launch()

// Capture all console logs across pages
const logs = []

function captureLogs(page, label) {
  page.on('console', async (msg) => {
    const text = msg.text()
    if (!text.startsWith('[BOLLYWOOD')) return
    try {
      // msg.args() gives us the actual argument handles
      const args = msg.args()
      const type = await args[0].jsonValue()  // the label string
      const data = args.length > 1 ? await args[1].jsonValue() : {}
      logs.push({ pageLabel: label, type, data, raw: text })
    } catch {
      // Fallback: try to extract from text representation
      const jsonStart = text.indexOf('{')
      try {
        const data = jsonStart >= 0 ? JSON.parse(text.slice(jsonStart)) : {}
        logs.push({ pageLabel: label, type: text.split('{')[0].trim(), data, raw: text })
      } catch {
        logs.push({ pageLabel: label, type: text.split(' ')[0], data: { raw: text }, raw: text })
      }
    }
  })
}

function reportLogs() {
  console.log('\n\n══════════════════════════════════════════════════════════')
  console.log('  BOLLYWOOD REACTION DIAGNOSIS REPORT')
  console.log('══════════════════════════════════════════════════════════\n')

  const byType = {}
  for (const l of logs) {
    if (!byType[l.type]) byType[l.type] = []
    byType[l.type].push(l)
  }

  console.log('── Summary ───────────────────────────────────────────────')
  for (const [type, entries] of Object.entries(byType)) {
    console.log(`  ${type}: ${entries.length} occurrence(s)`)
  }

  console.log('\n── GENERATED events (server-side) ──────────────────────')
  for (const l of (byType['[BOLLYWOOD_REACTION_GENERATED]'] ?? [])) {
    const d = l.data
    console.log(`  page=${l.pageLabel} key=${d.reactionKey} phase=${d.phase} role=${d.viewerRole} trigger=${d.triggerEventId}`)
  }

  console.log('\n── COMPUTED RESULT (server-side final) ────────────────')
  for (const l of (byType['[BOLLYWOOD_REACTION_COMPUTED_RESULT]'] ?? [])) {
    const d = l.data
    console.log(`  page=${l.pageLabel} phase=${d.phase} role=${d.viewerRole} raw=${d.rawEventCount} → deduped=${d.dedupedCount} → final=${d.finalCount} keys=${JSON.stringify(d.finalKeys)}`)
    console.log(`    allRoundEvents=${JSON.stringify(d.allRoundEventsProcessed)}`)
  }

  console.log('\n── RECEIVED events (client-side, before sessionStorage dedup) ─')
  for (const l of (byType['[BOLLYWOOD_REACTION_RECEIVED]'] ?? [])) {
    const d = l.data
    console.log(`  page=${l.pageLabel} source=${d.source} propCount=${d.propEventCount} fresh=${d.freshCount} queueWas=${d.currentQueueLength}`)
    if (d.freshCount > 0) console.log(`    freshKeys=${JSON.stringify(d.freshKeys)}`)
    if (d.freshCount > 1) console.log(`    ⚠ MULTIPLE FRESH EVENTS — these will all queue back-to-back!`)
  }

  console.log('\n── QUEUED events ──────────────────────────────────────')
  for (const l of (byType['[BOLLYWOOD_REACTION_QUEUED]'] ?? [])) {
    const d = l.data
    console.log(`  page=${l.pageLabel} added=${JSON.stringify(d.addingKeys)} newQueue=${JSON.stringify(d.newQueue)}`)
    if (d.newQueue.length > 1) console.log(`    ⚠ QUEUE HAS ${d.newQueue.length} ITEMS — ${d.newQueue.length} popups will show sequentially`)
  }

  console.log('\n── DISPLAYED events (user saw these) ─────────────────')
  for (const l of (byType['[BOLLYWOOD_REACTION_DISPLAYED]'] ?? [])) {
    const d = l.data
    console.log(`  page=${l.pageLabel} key=${d.eventKey} "${d.caption}"`)
  }

  console.log('\n── CLOSED events ──────────────────────────────────────')
  for (const l of (byType['[BOLLYWOOD_REACTION_CLOSED]'] ?? [])) {
    const d = l.data
    console.log(`  page=${l.pageLabel} key=${d.eventKey} trigger=${d.trigger}`)
  }

  console.log('\n── Auto-close timers ──────────────────────────────────')
  for (const l of (byType['[BOLLYWOOD_REACTION_TIMER_STARTED]'] ?? [])) {
    const d = l.data
    console.log(`  page=${l.pageLabel} key=${d.eventKey} delay=${d.delayMs}ms trigger=${d.trigger}`)
  }

  // Detect overlapping/duplicate patterns
  console.log('\n── DIAGNOSIS: Overlap/Duplicate Patterns ──────────────')
  const queued = byType['[BOLLYWOOD_REACTION_QUEUED]'] ?? []
  let overlappingFound = false
  for (const l of queued) {
    const d = l.data
    if (d.newQueue.length > 1) {
      overlappingFound = true
      console.log(`  ⚠ OVERLAP DETECTED on page=${l.pageLabel}:`)
      console.log(`    Queue at this moment: ${JSON.stringify(d.newQueue)}`)
      console.log(`    Items added simultaneously: ${JSON.stringify(d.addingKeys)}`)
      console.log(`    This means ${d.addingKeys.length} popup(s) were computed together and will show back-to-back`)
    }
  }
  if (!overlappingFound) {
    console.log('  No simultaneous queue accumulation detected in this test run.')
  }

  console.log('\n══════════════════════════════════════════════════════════\n')
}

try {
  const names = ['Arjun', 'Bindu', 'Charu', 'Dev', 'Esha']
  const ctxs = await Promise.all(Array.from({ length: 5 }, () => browser.newContext()))

  // ── Create room + enable Bollywood mode ─────────────────────────────────
  const { page: host, code } = await createGuestRoom(ctxs[0], names[0])
  captureLogs(host, `HOST(${names[0]})`)

  await host.locator('select[name="nightTimerSeconds"]').selectOption('30')
  await host.locator('select[name="votingTimerSeconds"]').selectOption('30')
  await host.locator('select[name="discussionTimerSeconds"]').selectOption('60')
  await host.locator('input[name="bollywoodMode"]').check()
  await host.getByRole('button', { name: 'Save settings' }).click()
  await expectText(host, 'saved successfully', { timeout: 8000 })
  step(`Room ${code} created with Bollywood mode ON`)

  // ── Join players ─────────────────────────────────────────────────────────
  const others = []
  for (let i = 1; i < 5; i++) {
    const p = await joinViaInviteLink(ctxs[i], code, names[i])
    captureLogs(p, names[i])
    others.push(p)
  }
  step('All 5 players in lobby')

  // ── Start game ─────────────────────────────────────────────────────────
  await host.getByRole('button', { name: 'Start The Night' }).click()
  const allPages = [host, ...others]
  await waitAllInGame(allPages)
  step('Game started')

  // Read roles
  const roles = []
  for (let i = 0; i < 5; i++) {
    roles[i] = await readRole(allPages[i])
  }
  step(`Roles: ${roles.map((r, i) => `${names[i]}=${r}`).join(', ')}`)

  const idx = (role) => roles.indexOf(role)
  const mafiaIdx = idx('MAFIA')
  const doctorIdx = idx('DOCTOR')
  const detectiveIdx = idx('DETECTIVE')
  const villagerIdxs = roles.map((r, i) => r === 'VILLAGER' ? i : -1).filter(i => i >= 0)

  const mafia = allPages[mafiaIdx]
  const doctor = doctorIdx >= 0 ? allPages[doctorIdx] : null
  const detective = detectiveIdx >= 0 ? allPages[detectiveIdx] : null

  // Mafia should NOT target the doctor so we can test "doctor saves other"
  // Target a villager who is NOT the doctor
  const targetIdx = villagerIdxs.find(i => i !== mafiaIdx) ?? villagerIdxs[0]
  const targetName = names[targetIdx]
  const doctorName = doctorIdx >= 0 ? names[doctorIdx] : null
  const detectiveName = detectiveIdx >= 0 ? names[detectiveIdx] : null

  for (const p of allPages) await acknowledgeRole(p)
  step('Roles acknowledged')

  await host.getByRole('button', { name: 'Begin Night 1' }).click()
  await expectText(host, 'Round 1', { timeout: 30000 })
  step('Night 1 started')

  // ─────────────────────────────────────────────────────────────────────
  // SCENARIO 1: Doctor saves the Mafia's target (Doctor saves OTHER player)
  // Expected: key 01 (all), key 25 (Mafia), key 23 (Doctor saves other)
  // ─────────────────────────────────────────────────────────────────────
  await submitNightAction(mafia, targetName, 'Submit Mafia Target')
  step(`SCENARIO: Mafia targeted ${targetName}`)

  if (doctor && doctorName) {
    // Doctor saves the target (not themselves) → scenario 01+23 for Doctor, 25 for Mafia
    await submitNightAction(doctor, targetName, 'Submit Save')
    step(`SCENARIO: Doctor saved ${targetName} (OTHER player) → expect 01+23 for Doctor, 01+25 for Mafia, 01 for others`)
  }

  if (detective && detectiveName) {
    // Detective investigates Mafia → scenario 11
    await submitNightAction(detective, names[mafiaIdx], 'Submit Investigation')
    step(`SCENARIO: Detective investigated Mafia → expect private 11`)
  }

  // Wait for night to resolve → discussion
  await expectText(host, 'Discussion', { timeout: 45000 })
  step('Night 1 resolved → Discussion. Waiting 3s for popups to show...')
  await allPages[0].waitForTimeout(3000)

  // Give time for all popups to be displayed and auto-close
  await allPages[0].waitForTimeout(6000)

  // End discussion
  for (let i = 0; i < 3; i++) {
    if (await host.getByRole('dialog').count() === 0) break
    await host.getByRole('button', { name: 'Continue' }).click().catch(() => {})
    await host.waitForTimeout(600)
  }
  await host.getByRole('button', { name: 'End Discussion & Start Voting' }).click()
  await expectText(host, 'Cast Vote', { timeout: 30000 })
  step('Voting phase started')

  // ─────────────────────────────────────────────────────────────────────
  // SCENARIO 2: Unanimous vote (all vote for Mafia)
  // Expected: key 21 (perfect vote, village sees) + 28 (unanimous)
  // ─────────────────────────────────────────────────────────────────────
  let voteCount = 0
  for (let i = 0; i < allPages.length; i++) {
    const isDead = await allPages[i].getByText('eliminated', { exact: false }).count() > 0
    if (!isDead) {
      await castVote(allPages[i], names[mafiaIdx]).catch(() => {})
      voteCount++
    }
  }
  step(`SCENARIO: ${voteCount} players voted for Mafia (unanimous) → expect 21+28 for all, 05+19 for any surviving Mafia`)

  // Wait for vote resolution + popup display
  await host.waitForTimeout(10000)

  // Check game over
  const gameOverShown = await host.getByText('Village', { exact: false }).count() > 0
  if (gameOverShown) {
    step('SCENARIO: Village wins → expect 06 for village side, 07 for Mafia')
  }

  await allPages[0].waitForTimeout(5000)

  step('All scenarios complete. Generating diagnosis report...')
  reportLogs()

  console.log('\nBOLLYWOOD DIAGNOSIS COMPLETE')
} finally {
  await browser.close()
}
