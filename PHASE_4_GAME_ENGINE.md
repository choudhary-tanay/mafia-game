# Phase 4: Core Backend Game Engine

## Claude Instruction

Read `MAFIA_GAME_PRD.md` and the completed Phase 1-3 code first.

Implement Phase 4 only. Prioritize correct backend-driven gameplay over visual polish. Do not implement profile scoring or fancy UI in this phase unless tiny placeholders are required.

## Goal

Build the playable Mafia game loop: night actions, day announcements, discussion, voting, elimination, win checks, and next round.

## Backend Principle

The backend is the source of truth.

Clients submit intents:

- Mafia target choice.
- Doctor save choice.
- Detective investigation choice.
- Vote choice.
- Abstain.

The backend validates, stores, resolves, and broadcasts only allowed results.

## Build

- Game state machine.
- Round creation.
- Night phase.
- Mafia action.
- Doctor action.
- Detective action.
- Night action resolver.
- Day announcement.
- Discussion timer.
- Voting timer.
- Vote submission.
- Vote resolver.
- Elimination handling.
- Win condition checker.
- Next round transition.
- Basic announcement feed.
- Death stories and no-elimination stories.

## Game States

Suggested states:

- ROLE_REVEAL.
- NIGHT_STARTED.
- NIGHT_ACTIONS_OPEN.
- NIGHT_RESOLUTION.
- DAY_ANNOUNCEMENT.
- DISCUSSION.
- VOTING.
- VOTE_RESOLUTION.
- GAME_OVER.

## Night Phase

Required behavior:

- Alive Mafia choose one target.
- Alive Doctor chooses one player to save.
- Alive Detective chooses one player to investigate.
- Dead players cannot act.
- Villagers cannot take night actions.
- Backend resolves all actions.

Resolution:

- If Mafia target equals Doctor save target, no one dies.
- Otherwise the Mafia target dies.
- Detective privately receives Mafia / Not Mafia result.
- Public announcement feed receives the night result.

Timeout behavior:

- If Mafia does not choose in time, use a safe default such as no kill or last submitted target.
- If Doctor does not choose in time, no save.
- If Detective does not choose in time, no result.

Document the chosen timeout behavior in code comments or developer notes.

## Day Phase

Required behavior:

- Show night result.
- Start discussion timer.
- Start voting after discussion ends.
- Alive players can vote for one alive player or abstain.
- Dead players cannot vote.
- Resolve voting when all votes are submitted or timer expires.

Vote resolution:

- Highest vote count is eliminated.
- If tied, use the room tie rule.
- First version tie rule: no elimination.
- If everyone abstains, no one is eliminated.

## Win Conditions

Village wins when:

```text
aliveMafiaCount === 0
```

Mafia wins when:

```text
aliveMafiaCount >= aliveNonMafiaCount
```

Check after:

- Night resolution.
- Vote resolution.

## Death Stories And Announcements

Add a small backend story/template module.

Story types:

- Mafia kill.
- Doctor save.
- Vote elimination.
- Tie vote.
- Everyone abstained.

Requirements:

- Short.
- Dramatic.
- Non-graphic.
- Does not reveal hidden roles unless `revealRoleOnDeath` is enabled.

Example:

```text
Morning arrives in silence. {{playerName}} was found missing from the village. The Mafia had made their move.
```

## Database

Create or complete models such as:

- rounds.
- nightActions.
- votes.
- gameEvents.

Suggested `nightActions` action types:

- MAFIA_KILL.
- DOCTOR_SAVE.
- DETECTIVE_CHECK.

Suggested `gameEvents` event types:

- NIGHT_STARTED.
- MAFIA_TARGET_SELECTED.
- DOCTOR_SAVE_SELECTED.
- DETECTIVE_INVESTIGATION.
- PLAYER_KILLED_BY_MAFIA.
- PLAYER_SAVED_BY_DOCTOR.
- DISCUSSION_STARTED.
- VOTING_STARTED.
- PLAYER_ELIMINATED_BY_VOTE.
- NO_ELIMINATION_TIE.
- NO_ELIMINATION_ABSTAIN.
- GAME_ENDED.

## Realtime Events

Suggested events:

- `game:state_changed`.
- `game:phase_started`.
- `game:timer_updated`.
- `game:night_action_submitted`.
- `game:night_resolved`.
- `game:detective_result_private`.
- `game:announcement_added`.
- `game:discussion_started`.
- `game:voting_started`.
- `game:vote_submitted`.
- `game:vote_resolved`.
- `game:player_eliminated`.
- `game:game_over`.

## Acceptance Criteria

- A game can progress from role reveal into night.
- Mafia can submit a target.
- Doctor can submit a save.
- Detective can investigate and receive a private result.
- Backend resolves night correctly.
- Day announcement appears.
- Discussion and voting phases work.
- Alive players can vote or abstain.
- Dead players cannot act or vote.
- Ties and abstains are handled.
- Eliminated players are marked dead.
- Win condition is detected after night and after vote.
- Game either ends or moves to the next round.
- Hidden information is never leaked to unauthorized clients.

## Stop Point

Stop after the game is playable with basic screens. Do not spend time on visual polish or scoring yet.
