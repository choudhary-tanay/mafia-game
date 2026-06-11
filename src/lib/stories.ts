// Death story templates — short, dramatic, non-graphic, party-game appropriate.

const MAFIA_KILL = [
  'Morning arrives in silence. {{name}} was found missing from the village. The Mafia had made their move.',
  'Before sunrise, the village heard a distant cry. When everyone gathered, {{name}} had vanished.',
  'The night was calm, almost too calm. By morning, {{name}} had disappeared, leaving only whispers behind.',
  'The village woke to terrible news. {{name}} did not survive the night.',
]

const DOCTOR_SAVE = [
  'The Mafia moved in the dark, but someone was protected just in time. No one died last night.',
  'The village nearly lost someone. A silent protector changed their fate.',
  'The Mafia attempted an attack, but their plan failed. By morning, everyone was still alive.',
]

const VOTE_ELIMINATION = [
  'After heated discussion, the village made its choice. {{name}} was eliminated by public judgment.',
  'The votes were counted. Suspicion had chosen its target. {{name}} was removed from the village.',
  'Fear turned into action. The villagers pointed to {{name}}, and the decision was final.',
]

const TIE = [
  'The village argued until the final second, but no agreement was reached. No one was eliminated today.',
]

const ABSTAIN = [
  'No one dared to make a move. The village stayed silent, and no one was eliminated.',
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function mafiaKillStory(name: string): string {
  return pick(MAFIA_KILL).replace('{{name}}', name)
}

export function doctorSaveStory(): string {
  return pick(DOCTOR_SAVE)
}

export function voteEliminationStory(name: string): string {
  return pick(VOTE_ELIMINATION).replace('{{name}}', name)
}

export function tieStory(): string {
  return pick(TIE)
}

export function abstainStory(): string {
  return pick(ABSTAIN)
}
