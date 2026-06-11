import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildRoleList, calculateScoreDelta, isDeadlinePassed, futureDeadline } from '../game-engine'

// ─── buildRoleList ────────────────────────────────────────────────────────────

describe('buildRoleList', () => {
  it('returns correct length', () => {
    expect(buildRoleList(4, 1)).toHaveLength(4)
    expect(buildRoleList(6, 2)).toHaveLength(6)
    expect(buildRoleList(10, 3)).toHaveLength(10)
  })

  it('4 players → 1 Mafia, 1 Doctor, 2 Villagers', () => {
    const roles = buildRoleList(4, 1)
    expect(roles.filter((r) => r === 'MAFIA')).toHaveLength(1)
    expect(roles.filter((r) => r === 'DOCTOR')).toHaveLength(1)
    expect(roles.filter((r) => r === 'DETECTIVE')).toHaveLength(0)
    expect(roles.filter((r) => r === 'VILLAGER')).toHaveLength(2)
  })

  it('5 players → 1 Mafia, 1 Doctor, 1 Detective, 2 Villagers', () => {
    const roles = buildRoleList(5, 1)
    expect(roles.filter((r) => r === 'MAFIA')).toHaveLength(1)
    expect(roles.filter((r) => r === 'DOCTOR')).toHaveLength(1)
    expect(roles.filter((r) => r === 'DETECTIVE')).toHaveLength(1)
    expect(roles.filter((r) => r === 'VILLAGER')).toHaveLength(2)
  })

  it('6 players, 2 mafia → 2 Mafia, 1 Doctor, 1 Detective, 2 Villagers', () => {
    const roles = buildRoleList(6, 2)
    expect(roles.filter((r) => r === 'MAFIA')).toHaveLength(2)
    expect(roles.filter((r) => r === 'DOCTOR')).toHaveLength(1)
    expect(roles.filter((r) => r === 'DETECTIVE')).toHaveLength(1)
    expect(roles.filter((r) => r === 'VILLAGER')).toHaveLength(2)
  })

  it('produces a random ordering (shuffled)', () => {
    // Run many times; the order should vary
    const seen = new Set<string>()
    for (let i = 0; i < 20; i++) {
      seen.add(buildRoleList(4, 1).join(','))
    }
    // Very unlikely all 20 runs produce identical ordering
    expect(seen.size).toBeGreaterThan(1)
  })
})

// ─── calculateScoreDelta ──────────────────────────────────────────────────────

describe('calculateScoreDelta', () => {
  it('Village winner gets 100 base + 50 survived = 150', () => {
    const d = calculateScoreDelta({
      role: 'VILLAGER', isWinner: true, winner: 'VILLAGE',
      survivedToEnd: true, doctorSaves: 0, detectiveFinds: 0, correctVotes: 0,
    })
    expect(d).toBe(150)
  })

  it('Village loser eliminated gets 25 + 5 = 30', () => {
    const d = calculateScoreDelta({
      role: 'VILLAGER', isWinner: false, winner: 'MAFIA',
      survivedToEnd: false, doctorSaves: 0, detectiveFinds: 0, correctVotes: 0,
    })
    expect(d).toBe(30)
  })

  it('Mafia winner gets 120 + 50 = 170', () => {
    const d = calculateScoreDelta({
      role: 'MAFIA', isWinner: true, winner: 'MAFIA',
      survivedToEnd: true, doctorSaves: 0, detectiveFinds: 0, correctVotes: 0,
    })
    expect(d).toBe(170)
  })

  it('Doctor save adds 40', () => {
    const d = calculateScoreDelta({
      role: 'DOCTOR', isWinner: true, winner: 'VILLAGE',
      survivedToEnd: true, doctorSaves: 1, detectiveFinds: 0, correctVotes: 0,
    })
    expect(d).toBe(100 + 50 + 40)
  })

  it('Multiple doctor saves stack', () => {
    const d = calculateScoreDelta({
      role: 'DOCTOR', isWinner: false, winner: 'MAFIA',
      survivedToEnd: false, doctorSaves: 3, detectiveFinds: 0, correctVotes: 0,
    })
    expect(d).toBe(25 + 5 + 120)
  })

  it('Detective correct find adds 40', () => {
    const d = calculateScoreDelta({
      role: 'DETECTIVE', isWinner: true, winner: 'VILLAGE',
      survivedToEnd: false, doctorSaves: 0, detectiveFinds: 2, correctVotes: 0,
    })
    expect(d).toBe(100 + 5 + 80)
  })

  it('Correct vote adds 20 each', () => {
    const d = calculateScoreDelta({
      role: 'VILLAGER', isWinner: true, winner: 'VILLAGE',
      survivedToEnd: false, doctorSaves: 0, detectiveFinds: 0, correctVotes: 3,
    })
    expect(d).toBe(100 + 5 + 60)
  })

  it('score is never negative', () => {
    const d = calculateScoreDelta({
      role: 'VILLAGER', isWinner: false, winner: 'MAFIA',
      survivedToEnd: false, doctorSaves: 0, detectiveFinds: 0, correctVotes: 0,
    })
    expect(d).toBeGreaterThanOrEqual(0)
  })
})

// ─── Deadline helpers ─────────────────────────────────────────────────────────

describe('isDeadlinePassed', () => {
  it('returns false for null', () => expect(isDeadlinePassed(null)).toBe(false))

  it('returns true for a past date', () => {
    const past = new Date(Date.now() - 5000).toISOString()
    expect(isDeadlinePassed(past)).toBe(true)
  })

  it('returns false for a future date', () => {
    const future = new Date(Date.now() + 5000).toISOString()
    expect(isDeadlinePassed(future)).toBe(false)
  })
})

describe('futureDeadline', () => {
  it('returns a date roughly N seconds in the future', () => {
    const before = Date.now()
    const dl = futureDeadline(30)
    const after = Date.now()
    const t = new Date(dl).getTime()
    expect(t).toBeGreaterThanOrEqual(before + 29_000)
    expect(t).toBeLessThanOrEqual(after + 31_000)
  })
})
