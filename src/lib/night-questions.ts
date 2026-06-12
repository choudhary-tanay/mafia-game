// Static question bank for the Night Engagement feature.
// Questions are party-friendly, non-offensive, and focus on social dynamics.
export const NIGHT_QUESTIONS: readonly string[] = [
  // Suspicion
  "Who seems the most suspicious right now?",
  "Who is acting too innocent?",
  "Who seems like they know too much?",
  "Who changed their opinion too quickly?",
  "Who do you think is pretending to be confused?",
  "Who gives the strongest villain energy tonight?",
  "Who is flying under the radar?",
  "Who looks the most nervous?",
  "Who seems too confident?",
  "Who has been sending mixed signals?",
  // Trust
  "Who would you trust with your life in this village?",
  "Who do you trust the least right now?",
  "Who do you trust the most right now?",
  "Who would you never trust with a secret?",
  "If you had to trust one player right now, who would it be?",
  // Strategy / Gameplay
  "What is your current theory about who the Mafia might be?",
  "What is your one-sentence alibi?",
  "Who should the village watch most closely tomorrow?",
  "Who would you vote for if voting started right now?",
  "What one clue does everyone else seem to be missing?",
  "Describe your strategy for tomorrow in one sentence.",
  "Who is playing too safely?",
  "Who is creating the most chaos?",
  "Who should the village trust on the next vote?",
  // Fun / Icebreaker
  "Who in this room would be the worst liar?",
  "Who would survive longest in a horror movie?",
  "Who would panic first in a mystery story?",
  "Who would be the best at keeping a secret?",
  "Which player would make the best detective?",
  "Which player would make the most frightening Mafia member?",
  "Who would betray the village if offered the chance?",
  // Alibi / Defense
  "If you were accused tonight, what would your defense be?",
  "What question would you ask the most suspicious player?",
  "If the Mafia is watching you, what would you say to look innocent?",
]

/** Pick a random question. Client-side only — call in useState initializer. */
export function getRandomQuestion(): string {
  return NIGHT_QUESTIONS[Math.floor(Math.random() * NIGHT_QUESTIONS.length)]
}
