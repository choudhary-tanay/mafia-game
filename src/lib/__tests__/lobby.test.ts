import { describe, it, expect } from 'vitest'
import { validateLobby, recommendedMafiaCount, formatTimer } from '../lobby'

describe('validateLobby', () => {
  it('passes with 4 players and 1 mafia', () => {
    const r = validateLobby(4, 1)
    expect(r.canStart).toBe(true)
    expect(r.warnings).toHaveLength(0)
  })

  it('fails with fewer than 4 players', () => {
    const r = validateLobby(3, 1)
    expect(r.canStart).toBe(false)
    expect(r.warnings.some((w) => w.includes('4 players'))).toBe(true)
  })

  it('fails when mafiaCount >= non-mafia count', () => {
    const r = validateLobby(4, 2) // 2 mafia, 2 non-mafia — tie
    expect(r.canStart).toBe(false)
    expect(r.warnings.some((w) => w.toLowerCase().includes('too many mafia'))).toBe(true)
  })

  it('fails when mafiaCount > non-mafia count', () => {
    const r = validateLobby(5, 3) // 3 mafia, 2 non-mafia
    expect(r.canStart).toBe(false)
  })

  it('passes with 6 players and 2 mafia', () => {
    const r = validateLobby(6, 2)
    expect(r.canStart).toBe(true)
  })

  it('fails when mafiaCount is 0', () => {
    const r = validateLobby(4, 0)
    expect(r.canStart).toBe(false)
    expect(r.warnings.some((w) => w.includes('1 Mafia'))).toBe(true)
  })

  it('allows exactly one more non-mafia than mafia', () => {
    // 5 players, 2 mafia → 3 non-mafia: 2 < 3, valid
    const r = validateLobby(5, 2)
    expect(r.canStart).toBe(true)
  })

  it('accumulates multiple warnings', () => {
    // 3 players (< 4) AND 0 mafia
    const r = validateLobby(3, 0)
    expect(r.warnings.length).toBeGreaterThanOrEqual(2)
  })
})

describe('recommendedMafiaCount', () => {
  it('returns 1 for 4 players', () => expect(recommendedMafiaCount(4)).toBe(1))
  it('returns 1 for 5 players', () => expect(recommendedMafiaCount(5)).toBe(1))
  it('returns 2 for 6 players', () => expect(recommendedMafiaCount(6)).toBe(2))
  it('returns 2 for 8 players', () => expect(recommendedMafiaCount(8)).toBe(2))
  it('returns 3 for 9 players', () => expect(recommendedMafiaCount(9)).toBe(3))
  it('returns 3 for 12 players', () => expect(recommendedMafiaCount(12)).toBe(3))
  it('returns ~25% for 13+ players', () => {
    const r = recommendedMafiaCount(16)
    expect(r).toBeGreaterThanOrEqual(3)
    expect(r).toBeLessThan(16 / 2) // always fewer than half
  })
})

describe('formatTimer', () => {
  it('formats seconds < 60 correctly', () => {
    expect(formatTimer(45)).toBe('45s')
    expect(formatTimer(0)).toBe('0s')
  })
  it('formats exact minutes', () => {
    expect(formatTimer(60)).toBe('1m')
    expect(formatTimer(120)).toBe('2m')
  })
  it('formats minutes + seconds', () => {
    expect(formatTimer(90)).toBe('1m 30s')
    expect(formatTimer(185)).toBe('3m 5s')
  })
})
