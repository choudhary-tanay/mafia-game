// Row types matching the Supabase `users` table (snake_case columns)
export type UserRow = {
  id: string
  full_name: string
  email: string
  sex: string
  password_hash: string
  avatar_url: string | null
  total_score: number
  total_games_played: number
  total_wins: number
  total_losses: number
  mafia_wins: number
  village_wins: number
  games_as_mafia: number
  games_as_doctor: number
  games_as_detective: number
  games_as_villager: number
  successful_doctor_saves: number
  successful_detective_finds: number
  correct_votes_against_mafia: number
  survived_games: number
  created_at: string
  updated_at: string
}

// Add future table row types here as phases are implemented:
// export type RoomRow = { ... }
// export type GameRow = { ... }
