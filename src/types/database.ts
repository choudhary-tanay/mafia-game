// ─── Phase 1 ─────────────────────────────────────────────────────────────────

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

// ─── Phase 2 ─────────────────────────────────────────────────────────────────

export type RoomStatus = 'LOBBY' | 'ACTIVE' | 'ENDED'
export type TieRule = 'NO_ELIMINATION'

export type RoomRow = {
  id: string
  code: string
  host_user_id: string
  status: RoomStatus
  mafia_count: number
  discussion_timer_seconds: number
  voting_timer_seconds: number
  night_timer_seconds: number
  reveal_role_on_death: boolean
  tie_rule: TieRule
  created_at: string
  updated_at: string
}

export type RoomPlayerRow = {
  id: string
  room_id: string
  user_id: string
  display_name: string
  avatar_url: string | null
  is_host: boolean
  is_connected: boolean
  joined_at: string
}
