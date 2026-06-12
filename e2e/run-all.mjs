// Run the full e2e suite sequentially against a server on localhost:3000.
// Usage: npm run test:e2e   (server must be running: npm start or npm run dev)
import { spawnSync } from 'node:child_process'

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
const SCRIPTS = [
  'phase-sync',
  'guest-game',
  'mixed-game',
  'auth-flows',
  'phase9-night-questions',
  'phase10-bollywood',
]

// Warm the server first — the very first server-action round-trip after a
// restart can exceed Playwright's navigation timeout and fail the suite
// spuriously.
console.log(`Warming ${BASE} …`)
for (const path of ['/', '/login', '/signup']) {
  try {
    await fetch(`${BASE}${path}`)
  } catch {
    console.error(`✗ Server not reachable at ${BASE}${path}. Start it with: npm start`)
    process.exit(1)
  }
}

const results = []
for (const name of SCRIPTS) {
  console.log(`\n━━━ ${name} ━━━`)
  const { status } = spawnSync('node', [`e2e/${name}.mjs`], {
    stdio: 'inherit',
    env: process.env,
  })
  results.push({ name, pass: status === 0 })
}

console.log('\n━━━ SUITE SUMMARY ━━━')
for (const r of results) console.log(`  ${r.pass ? '✓ PASS' : '✗ FAIL'}  ${r.name}`)
process.exit(results.every((r) => r.pass) ? 0 : 1)
