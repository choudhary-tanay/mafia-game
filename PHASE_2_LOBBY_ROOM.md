# Phase 2: Dashboard, Create Room, Join Room, And Lobby Rules

## Claude Instruction

Read `MAFIA_GAME_PRD.md` and the completed Phase 1 code first.

Implement Phase 2 only. Do not build role assignment, private role reveal, night/day gameplay, voting, scoring updates, or fancy UI yet.

## Goal

Let authenticated users create or join a game room and wait in a validated lobby.

## Build

- Dashboard actions for creating and joining a room.
- Create room flow.
- Join room by room code.
- Invite link support.
- Lobby page.
- Player list.
- Host badge.
- Copy invite link.
- Leave room action.
- Host room settings.
- Lobby validation.
- Start game button disabled until valid.

## Room Settings

Host can configure:

- Number of Mafia.
- Discussion timer.
- Voting timer.
- Night timer.
- Reveal role on death.
- Tie rule.

First version tie rule:

- No elimination on tie.

## Lobby Validation

Minimum players:

```text
totalPlayers >= 4
```

Mafia count rule:

```text
mafiaCount < totalPlayers - mafiaCount
```

Start game is disabled when:

- Fewer than 4 players are in the lobby.
- Mafia count is too high.
- Mafia count is less than 1.
- Required settings are invalid.
- The current user is not the host.

## Recommended Mafia Count Display

Show a helpful recommendation:

- 4-5 players: 1 Mafia.
- 6-8 players: 2 Mafia.
- 9-12 players: 3 Mafia.
- 13+ players: around 25% of players, rounded down, while keeping Mafia fewer than non-Mafia.

Show a clear warning when Mafia count is too high.

Example:

```text
Too many Mafia for this player count. Mafia must be fewer than the rest of the village.
```

## Database

Create room/lobby models such as:

- rooms.
- roomPlayers.

Suggested `rooms` fields:

- id.
- code.
- hostUserId.
- status.
- mafiaCount.
- discussionTimerSeconds.
- votingTimerSeconds.
- nightTimerSeconds.
- revealRoleOnDeath.
- tieRule.
- createdAt.
- updatedAt.

Suggested `roomPlayers` fields:

- id.
- roomId.
- userId.
- displayName.
- avatarUrl.
- isHost.
- isConnected.
- isReady, optional.
- joinedAt.

## Realtime

If realtime infrastructure is ready, add lobby updates for:

- Player joined.
- Player left.
- Settings changed.
- Host changed, if needed.
- Validation changed.

If realtime is not ready yet, keep the code structured so it can be added in a later phase.

## Acceptance Criteria

- Logged-in users can create rooms.
- Rooms have unique short codes.
- Logged-in users can join by room code.
- Lobby shows current players.
- Host is clearly marked.
- Host can edit room settings.
- Non-host users cannot edit room settings.
- Start game is disabled when lobby rules are invalid.
- Start game is enabled only for the host when the lobby is valid.

## Stop Point

Stop after Phase 2 is complete and tested. Do not implement role assignment yet.
