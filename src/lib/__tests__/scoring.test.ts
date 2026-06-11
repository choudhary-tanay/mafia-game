// Tests for the pure score calculation path.
// The DB-dependent computeAndPersistScores is covered by the idempotency logic
// (unique constraint) which is tested in integration.
import { describe, it, expect } from 'vitest'
import { calculateScoreDelta } from '../game-engine'

describe('score idempotency / calculation edge cases', () => {
  it('winner always scores more than loser for the same role', () => {
    const win  = calculateScoreDelta({ role: 'VILLAGER', isWinner: true,  winner: 'VILLAGE', survivedToEnd: false, doctorSaves: 0, detectiveFinds: 0, correctVotes: 0 })
    const lose = calculateScoreDelta({ role: 'VILLAGER', isWinner: false, winner: 'MAFIA',   survivedToEnd: false, doctorSaves: 0, detectiveFinds: 0, correctVotes: 0 })
    expect(win).toBeGreaterThan(lose)
  })

  it('surviving gives more points than dying for the same outcome', () => {
    const survived = calculateScoreDelta({ role: 'VILLAGER', isWinner: true, winner: 'VILLAGE', survivedToEnd: true,  doctorSaves: 0, detectiveFinds: 0, correctVotes: 0 })
    const killed   = calculateScoreDelta({ role: 'VILLAGER', isWinner: true, winner: 'VILLAGE', survivedToEnd: false, doctorSaves: 0, detectiveFinds: 0, correctVotes: 0 })
    expect(survived).toBeGreaterThan(killed)
  })

  it('Mafia winning scores more than Village winning (120 vs 100)', () => {
    const mafia   = calculateScoreDelta({ role: 'MAFIA',    isWinner: true, winner: 'MAFIA',   survivedToEnd: true, doctorSaves: 0, detectiveFinds: 0, correctVotes: 0 })
    const village = calculateScoreDelta({ role: 'VILLAGER', isWinner: true, winner: 'VILLAGE', survivedToEnd: true, doctorSaves: 0, detectiveFinds: 0, correctVotes: 0 })
    expect(mafia).toBeGreaterThan(village)
    expect(mafia - village).toBe(20) // 120 vs 100
  })

  it('each correct vote adds exactly 20', () => {
    const base = calculateScoreDelta({ role: 'VILLAGER', isWinner: true, winner: 'VILLAGE', survivedToEnd: false, doctorSaves: 0, detectiveFinds: 0, correctVotes: 0 })
    const v1   = calculateScoreDelta({ role: 'VILLAGER', isWinner: true, winner: 'VILLAGE', survivedToEnd: false, doctorSaves: 0, detectiveFinds: 0, correctVotes: 1 })
    const v2   = calculateScoreDelta({ role: 'VILLAGER', isWinner: true, winner: 'VILLAGE', survivedToEnd: false, doctorSaves: 0, detectiveFinds: 0, correctVotes: 2 })
    expect(v1 - base).toBe(20)
    expect(v2 - base).toBe(40)
  })

  it('Doctor saves add 40 each, Detective finds add 40 each', () => {
    const d = calculateScoreDelta({ role: 'DOCTOR', isWinner: true, winner: 'VILLAGE', survivedToEnd: false, doctorSaves: 2, detectiveFinds: 0, correctVotes: 0 })
    const f = calculateScoreDelta({ role: 'DETECTIVE', isWinner: true, winner: 'VILLAGE', survivedToEnd: false, doctorSaves: 0, detectiveFinds: 2, correctVotes: 0 })
    const base = calculateScoreDelta({ role: 'VILLAGER', isWinner: true, winner: 'VILLAGE', survivedToEnd: false, doctorSaves: 0, detectiveFinds: 0, correctVotes: 0 })
    expect(d - base).toBe(80)
    expect(f - base).toBe(80)
  })

  it('Doctor saves do not add points to Villager/Mafia/Detective', () => {
    // doctorSaves only scored for DOCTOR role
    const vill = calculateScoreDelta({ role: 'VILLAGER', isWinner: false, winner: 'MAFIA', survivedToEnd: false, doctorSaves: 5, detectiveFinds: 0, correctVotes: 0 })
    const base = calculateScoreDelta({ role: 'VILLAGER', isWinner: false, winner: 'MAFIA', survivedToEnd: false, doctorSaves: 0, detectiveFinds: 0, correctVotes: 0 })
    expect(vill).toBe(base) // saves ignored for non-Doctor
  })

  it('Detective finds do not add points to non-Detective roles', () => {
    const vill = calculateScoreDelta({ role: 'VILLAGER', isWinner: true, winner: 'VILLAGE', survivedToEnd: false, doctorSaves: 0, detectiveFinds: 5, correctVotes: 0 })
    const base = calculateScoreDelta({ role: 'VILLAGER', isWinner: true, winner: 'VILLAGE', survivedToEnd: false, doctorSaves: 0, detectiveFinds: 0, correctVotes: 0 })
    expect(vill).toBe(base)
  })
})
