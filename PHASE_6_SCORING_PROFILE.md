# Phase 6: Profile, Scoring, Stats, And Game History

## Claude Instruction

Read `MAFIA_GAME_PRD.md` and the completed Phase 1-5 code first.

Implement Phase 6 only. Do not make major game engine rewrites unless needed to correctly produce final game results and stats.

## Goal

Update user profiles and score fields from the backend after each completed game.

## Build

- Backend score calculation.
- Backend profile stat updates.
- Game result persistence.
- Player game stat persistence.
- Profile page.
- Recent game history.
- Rank/level display.

## Score Rules

Suggested scoring:

- Win a game: +100 points.
- Lose a game: +25 points.
- Survive until the end: +50 points.
- As Mafia, successfully win: +120 points.
- As Village team, successfully eliminate Mafia: +100 points.
- As Doctor, successfully save a Mafia target: +40 points.
- As Detective, correctly identify Mafia: +40 points.
- Vote correctly against Mafia: +20 points.
- Get eliminated: +5 participation points.

Avoid double-counting in confusing ways. If the final scoring formula differs from this list, document it clearly.

## Profile Stats

Show:

- Name.
- Email.
- Sex.
- Avatar.
- Total score.
- Games played.
- Wins.
- Losses.
- Win rate.
- Favorite / most played role.
- Role-wise stats.
- Mafia wins.
- Village wins.
- Successful Doctor saves.
- Successful Detective finds.
- Correct votes against Mafia.
- Recent game history.
- Rank or level.

## Backend Requirements

- Scores update only after game ends.
- Score updates are performed only by trusted backend code.
- Users cannot directly update score/stat fields from the frontend.
- The score update should be idempotent so refreshing or repeated events do not duplicate points.
- Keep a per-game result/stat record for auditability.

## Suggested Tables

### GameResults

- id.
- gameId.
- winningTeam.
- endedReason.
- createdAt.

### PlayerGameStats

- id.
- gameId.
- userId.
- role.
- team.
- won.
- survivedToEnd.
- eliminatedRoundNumber, optional.
- correctVotesAgainstMafia.
- successfulDoctorSaves.
- successfulDetectiveFinds.
- scoreDelta.
- createdAt.

## Rank Examples

- Newcomer.
- Street Watcher.
- Silent Strategist.
- Village Hero.
- Mafia Master.

## Acceptance Criteria

- Game completion creates a game result.
- Each player receives one stat record for the completed game.
- User aggregate stats update correctly.
- Score updates cannot be triggered from the client directly.
- Re-running result processing does not duplicate scores.
- Profile page displays score, win/loss stats, role stats, and recent history.
- Rank/level is derived from score or wins.

## Stop Point

Stop after scoring and profile work is complete. Testing and edge-case hardening should happen in Phase 7.
