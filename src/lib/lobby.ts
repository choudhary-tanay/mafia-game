// Pure lobby validation — no DB, no imports. Safe everywhere including Edge Runtime.

export type LobbyValidation = {
  canStart: boolean
  warnings: string[]
}

export function validateLobby(playerCount: number, mafiaCount: number): LobbyValidation {
  const warnings: string[] = []

  if (playerCount < 4) {
    warnings.push(`Need at least 4 players to start (currently ${playerCount}).`)
  }

  if (mafiaCount < 1) {
    warnings.push('At least 1 Mafia player is required.')
  } else if (mafiaCount >= playerCount - mafiaCount) {
    warnings.push(
      'Too many Mafia for this player count. Mafia must be fewer than the rest of the village.',
    )
  }

  return { canStart: warnings.length === 0, warnings }
}

export function recommendedMafiaCount(playerCount: number): number {
  if (playerCount <= 5) return 1
  if (playerCount <= 8) return 2
  if (playerCount <= 12) return 3
  return Math.max(1, Math.floor(playerCount * 0.25))
}

export function formatTimer(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s === 0 ? `${m}m` : `${m}m ${s}s`
}
