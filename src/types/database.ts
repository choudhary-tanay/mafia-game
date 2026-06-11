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
  host_user_id: string | null   // null when host is a guest
  host_guest_id: string | null  // set when host is a guest
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
  user_id: string | null   // null for guests
  guest_id: string | null  // null for auth users
  display_name: string
  avatar_url: string | null
  is_host: boolean
  is_guest: boolean
  is_connected: boolean
  joined_at: string
}

// ─── Phase 3 ─────────────────────────────────────────────────────────────────

export type Role = 'MAFIA' | 'DOCTOR' | 'DETECTIVE' | 'VILLAGER'
export type GamePhase =
  | 'ROLE_REVEAL'
  | 'NIGHT_ACTIONS_OPEN'
  | 'NIGHT_RESOLUTION'
  | 'DAY_ANNOUNCEMENT'
  | 'DISCUSSION'
  | 'VOTING'
  | 'VOTE_RESOLUTION'
  | 'GAME_OVER'

export type GameRow = {
  id: string
  room_id: string
  status: GamePhase
  current_phase: GamePhase
  current_round_number: number
  winning_team: string | null
  phase_deadline: string | null
  started_at: string
  ended_at: string | null
  created_at: string
  updated_at: string
}

export type GamePlayerRow = {
  id: string
  game_id: string
  room_id: string
  user_id: string | null
  guest_id: string | null
  is_guest: boolean
  display_name: string | null
  role: Role
  is_alive: boolean
  death_round_number: number | null
  death_cause: string | null
  survived_to_end: boolean
  created_at: string
  updated_at: string
}

// ─── Phase 4 ─────────────────────────────────────────────────────────────────

export type RoundRow = {
  id: string
  game_id: string
  round_number: number
  phase: string
  started_at: string
  ended_at: string | null
}

export type NightActionType = 'MAFIA_KILL' | 'DOCTOR_SAVE' | 'DETECTIVE_CHECK'

export type NightActionRow = {
  id: string
  game_id: string
  round_id: string
  actor_user_id: string | null
  actor_guest_id: string | null
  action_type: NightActionType
  // Stable target id: authenticated users use user_id, guests use guest_id.
  target_user_id: string | null
  submitted_at: string
}

export type VoteRow = {
  id: string
  game_id: string
  round_id: string
  voter_user_id: string | null
  voter_guest_id: string | null
  // Stable target id: authenticated users use user_id, guests use guest_id.
  target_user_id: string | null
  submitted_at: string
}

export type GameEventVisibility = 'PUBLIC' | 'PRIVATE_TO_PLAYER'

export type GameEventRow = {
  id: string
  game_id: string
  round_id: string | null
  event_type: string
  player_id: string | null
  target_player_id: string | null
  visibility: GameEventVisibility
  // Stable recipient id: authenticated users use user_id, guests use guest_id.
  recipient_user_id: string | null
  message: string
  metadata: Record<string, unknown> | null
  created_at: string
}

// ─── Shared view types (passed from server → client) ─────────────────────────

export type PublicPlayer = {
  // Stable public player id: authenticated users use user_id, guests use guest_id.
  user_id: string
  display_name: string
  is_alive: boolean
  role?: Role  // only present if dead + revealRoleOnDeath
}

export type Announcement = {
  id: string
  message: string
  event_type: string
  created_at: string
}

export type WinCondition = 'VILLAGE' | 'MAFIA' | null

// ─── Phase 6 ─────────────────────────────────────────────────────────────────

export type GameResultRow = {
  id: string
  game_id: string
  winning_team: string
  ended_reason: string
  created_at: string
}

export type PlayerGameStatRow = {
  id: string
  game_id: string
  user_id: string
  role: Role
  team: string
  won: boolean
  survived_to_end: boolean
  eliminated_round_number: number | null
  correct_votes_against_mafia: number
  successful_doctor_saves: number
  successful_detective_finds: number
  score_delta: number
  created_at: string
}
