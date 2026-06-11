import { describe, it, expect } from 'vitest'
import { mafiaKillStory, doctorSaveStory, voteEliminationStory, tieStory, abstainStory } from '../stories'

describe('story templates', () => {
  it('mafiaKillStory interpolates the player name', () => {
    const s = mafiaKillStory('Alice')
    expect(s).toContain('Alice')
    expect(s.length).toBeGreaterThan(20)
  })

  it('mafiaKillStory with special characters in name', () => {
    const s = mafiaKillStory("O'Brien")
    expect(s).toContain("O'Brien")
  })

  it('doctorSaveStory returns a non-empty string', () => {
    const s = doctorSaveStory()
    expect(s.length).toBeGreaterThan(10)
  })

  it('voteEliminationStory interpolates the player name', () => {
    const s = voteEliminationStory('Bob')
    expect(s).toContain('Bob')
  })

  it('tieStory returns a non-empty string', () => {
    const s = tieStory()
    expect(s.length).toBeGreaterThan(5)
  })

  it('abstainStory returns a non-empty string', () => {
    const s = abstainStory()
    expect(s.length).toBeGreaterThan(5)
  })

  it('mafiaKillStory varies across calls (random selection)', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 30; i++) seen.add(mafiaKillStory('X'))
    // Multiple templates available → should see > 1 result
    expect(seen.size).toBeGreaterThan(1)
  })

  it('doctor save story varies across calls', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 30; i++) seen.add(doctorSaveStory())
    expect(seen.size).toBeGreaterThan(1)
  })

  it('stories do not contain placeholder tokens', () => {
    for (const name of ['Alice', 'Bob']) {
      expect(mafiaKillStory(name)).not.toContain('{{')
      expect(voteEliminationStory(name)).not.toContain('{{')
    }
  })
})
