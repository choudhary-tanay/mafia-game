# Phase 3: Backend Role Assignment And Private Role Reveal

## Claude Instruction

Read `MAFIA_GAME_PRD.md` and the completed Phase 1-2 code first.

Implement Phase 3 only. Do not build the full night/day game loop, voting resolution, scoring, or fancy UI yet.

## Goal

When the host starts a valid game, assign roles securely on the backend and show each player only their own role information.

## Build

- Backend game creation from a valid room.
- Backend role assignment.
- Game player records.
- Private role reveal screen or overlay.
- Role-specific short instructions.
- Mafia teammate visibility for Mafia players only.
- Start game flow from lobby into role reveal.

## Roles

Initial roles:

- Mafia.
- Doctor.
- Detective.
- Villager.

Suggested baseline:

- 4 players: 1 Mafia, 1 Doctor, 2 Villagers.
- 5 players: 1 Mafia, 1 Doctor, 1 Detective, 2 Villagers.
- 6+ players: configured Mafia count, 1 Doctor, 1 Detective, rest Villagers.

## Role Instructions

### Mafia

You are Mafia. Work with the other Mafia at night to choose one player to eliminate. Your goal is to equal or outnumber the village.

### Doctor

You are the Doctor. Each night, choose one player to protect. If you protect the Mafia target, no one dies.

### Detective

You are the Detective. Each night, investigate one player to learn whether they are Mafia.

### Villager

You are a Villager. You have no night action. Discuss, observe, and vote during the day to eliminate the Mafia.

## Security Requirements

- Role assignment happens only on the backend.
- Frontend receives only the logged-in player's own role.
- Mafia players receive only the list of their Mafia teammates.
- Non-Mafia players must not receive Mafia teammate data.
- Do not expose the full role map to the client.
- Do not expose other players' roles.
- Do not expose hidden backend-only game data.

## Database

Create game models such as:

- games.
- gamePlayers.

Suggested `games` fields:

- id.
- roomId.
- status.
- currentPhase.
- currentRoundNumber.
- winningTeam, optional.
- startedAt.
- endedAt.
- createdAt.
- updatedAt.

Suggested `gamePlayers` fields:

- id.
- gameId.
- roomId.
- userId.
- role.
- isAlive.
- deathRoundNumber, optional.
- deathCause, optional.
- survivedToEnd.
- createdAt.
- updatedAt.

Protect role data with backend authorization and response filtering.

## Realtime

Emit:

- `room:game_started`.
- `game:state_changed`.
- `game:role_assigned_private`.
- `game:mafia_team_private`, only to Mafia players.

## Acceptance Criteria

- Host can start a valid lobby.
- Backend creates a game.
- Backend assigns roles according to settings and player count.
- Each player can see only their own role.
- Mafia players can see other Mafia.
- Doctor, Detective, and Villagers cannot see hidden roles.
- The frontend never receives a full role list.
- Game state moves to role reveal or equivalent.

## Stop Point

Stop after role assignment and private reveal work. Do not implement night actions yet.
