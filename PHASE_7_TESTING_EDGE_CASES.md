# Phase 7: Testing, Edge Cases, And Hardening

## Claude Instruction

Read `MAFIA_GAME_PRD.md` and the completed Phase 1-6 code first.

Implement Phase 7 only. Focus on reliability, security, hidden-information safety, and multiplayer edge cases.

## Goal

Make the app stable enough for real groups to play without the game state breaking.

## Test Areas

- Auth.
- Dashboard.
- Create room.
- Join room.
- Lobby settings.
- Lobby validation.
- Role assignment.
- Role visibility.
- Night actions.
- Detective private result.
- Doctor save.
- Day discussion.
- Voting.
- Tie handling.
- Abstain handling.
- Win conditions.
- Score updates.
- Profile stats.
- Realtime reconnect behavior.

## Critical Edge Cases

Handle and test:

- Player disconnects in lobby.
- Player disconnects during game.
- Host disconnects.
- Player refreshes page.
- Player opens game in multiple tabs.
- Player tries to join after game starts.
- Player tries to vote twice.
- Player tries to act twice.
- Player tries to vote after death.
- Player tries to act after death.
- Player tries to act in the wrong phase.
- Mafia target not submitted before timer ends.
- Doctor action not submitted.
- Detective action not submitted.
- Room code does not exist.
- Room code is expired or closed.
- Mafia count becomes invalid after a player leaves the lobby.
- Tie vote.
- Everyone abstains.
- Win condition reached after night.
- Win condition reached after vote.
- Score processing is retried.

## Hidden Information Tests

Verify:

- Non-Mafia players never receive Mafia teammate data.
- Users never receive other players' roles unless reveal-on-death allows a specific public reveal.
- Detective result is private to the Detective.
- Doctor target is not public.
- Mafia target is not public before resolution.
- Frontend network responses do not include a full role map.
- Realtime private events are delivered only to authorized users.

## Suggested Automated Tests

Add tests for:

- Lobby validation function.
- Mafia count recommendation function.
- Role assignment distribution.
- Role assignment authorization filters.
- Night action resolver.
- Vote resolver.
- Win condition checker.
- Story template rendering.
- Score calculation.
- Score idempotency.

## Suggested Manual QA Script

1. Create four test users.
2. Create a room as user 1.
3. Join with users 2-4.
4. Confirm start is disabled before valid settings.
5. Start game.
6. Confirm every player sees only their own role.
7. Play one night.
8. Confirm night result is correct.
9. Play discussion and vote.
10. Confirm elimination is correct.
11. Continue until a win condition.
12. Confirm scores update once.
13. Confirm profile stats display correctly.

## Acceptance Criteria

- Core automated tests pass.
- Manual four-player game can be completed.
- No hidden role leakage is visible in API responses or realtime events.
- Reconnect/refresh returns the player to the correct state.
- Invalid actions are rejected by the backend.
- Score updates are accurate and idempotent.
- Mobile smoke test passes for auth, lobby, and gameplay.

## Final Stop Point

After this phase, the app should be ready for a real playtest with friends.
