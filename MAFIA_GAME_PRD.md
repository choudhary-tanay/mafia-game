# Mafia Game Product Requirements Document

## Claude Usage Instruction

Do not build the entire app from a single broad prompt.

First, read this PRD carefully. Do not code yet. Understand the product, identify the required frontend pages, backend modules, database schema, realtime events, game state machine, and development phases. After planning, implement the app one phase at a time.

Recommended first Claude prompt:

```text
I am building an online Mafia/Werewolf party game.

First, read the attached MAFIA_GAME_PRD.md carefully.

Do not start coding yet.

Your task:
1. Understand the product.
2. Identify the required frontend pages.
3. Identify the backend modules.
4. Design the database schema.
5. Design the realtime socket events.
6. Design the game state machine.
7. Break the development into clear phases.
8. Tell me the safest order to build this so the app does not become messy.

After that, wait for my next instruction.
```

When implementation begins, use focused prompts such as:

```text
Now implement Phase 1 only.
Do not build future phases yet.
Keep code scalable for the remaining phases.
```

## Product Summary

Build an online realtime Mafia/Werewolf party game where friends can sign up, create or join a room, receive secret roles, play through night and day phases, vote, eliminate players, and finish with automatic win detection and score updates.

The app should replace the need for a human moderator. The backend should control all role assignment, hidden information, game state transitions, scoring, and win-condition checks.

The experience should be beginner-friendly, dramatic, social, and polished, while staying secure and reliable.

## Core Goals

- Let users create accounts with simple signup and login.
- Let authenticated users create and join game rooms.
- Support realtime multiplayer lobbies and gameplay.
- Assign secret roles securely from the backend.
- Run the complete Mafia game loop without a human moderator.
- Prevent hidden roles or secret actions from leaking to the frontend.
- Provide dramatic but non-graphic stories and announcements.
- Track player profiles, score progression, and game history.
- Make the final UI feel like a dark mystery party game.

## Non-Goals For Early Phases

- No two-factor authentication.
- No AI moderator required for the first build.
- No public matchmaking required for the first build.
- No voice or video chat required for the first build.
- No payment or monetization required.
- No complex moderation/admin console required in the first version.

## Recommended Tech Direction

The implementation can use:

- Frontend: Next.js / React.
- Backend: API routes, server actions, or a separate Node backend.
- Database: PostgreSQL, Supabase, Prisma, or another relational database.
- Realtime: Socket.IO, Supabase Realtime, Pusher, Ably, or equivalent.
- Auth: Simple email/password auth with hashed passwords or a trusted auth provider.

The exact stack can vary, but the architecture must keep game logic backend-driven.

## User Accounts

### Signup

Signup should ask for:

- Full name.
- Email address.
- Sex.
- Password.
- Confirm password.

Suggested sex options:

- Male.
- Female.
- Other.
- Prefer not to say.

The sex field is used only for basic profile personalization and optional story pronouns. It must not affect gameplay.

Validation:

- Name is required.
- Email is required and must be valid.
- Sex is required.
- Password is required.
- Confirm password must match password.
- Password should have basic strength validation.
- Email must be unique.
- Show clear, simple error messages.

Example errors:

- "Please enter your name."
- "Please enter a valid email."
- "This email is already registered."
- "Passwords do not match."

### Login

Login should ask only for:

- Email.
- Password.

No OTP, no 2FA, and no complicated login flow.

After login, redirect to:

- Dashboard, or
- Create / Join Game page.

### Logout

Users should be able to log out from the dashboard, lobby, game page, or profile area.

## Profile And Score System

Each user should have a profile.

Profile fields:

- Full name.
- Email.
- Sex.
- Avatar, optional.
- Total games played.
- Total games won.
- Total games lost.
- Mafia wins.
- Village wins.
- Games played as Mafia.
- Games played as Doctor.
- Games played as Detective.
- Games played as Villager.
- Successful Doctor saves.
- Successful Detective finds.
- Correct votes against Mafia.
- Total times survived until game end.
- Score points.
- Rank or level, optional.

Scores must be updated only by the backend after a game ends. Frontend users must never be able to directly update their own score fields.

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

Example ranks:

- Newcomer.
- Street Watcher.
- Silent Strategist.
- Village Hero.
- Mafia Master.

## Required Frontend Pages

### Public Pages

- Landing or entry page.
- Signup page.
- Login page.

The app should prioritize the playable product over marketing copy. Avoid spending early effort on a fancy landing page.

### Authenticated Pages

- Dashboard.
- Create Room page or modal.
- Join Room page or modal.
- Lobby page.
- Game page.
- Role reveal page or overlay.
- Profile page.
- Game result page.
- Rules modal or rules page.

## Dashboard Requirements

After login, the dashboard should show:

- Create game room action.
- Join game by room code action.
- Recently played games, optional.
- Profile summary.
- Logout action.

## Room And Lobby Requirements

Users should be able to:

- Create a room.
- Join a room by room code.
- Join from an invite link.
- See a player list.
- See who is the host.
- Copy invite link.
- Leave the room.
- Start the game if they are the host and the room is valid.

Lobby display:

- Room code.
- Host badge.
- Player count.
- Player readiness, optional.
- Room settings.
- Validation warnings.

## Room Settings

Host-configurable settings:

- Number of Mafia.
- Discussion timer.
- Voting timer.
- Night timer.
- Reveal role on death.
- Tie rule.

Tie rule options:

- No elimination on tie.
- Revote, optional later.
- Random elimination, optional later.

The first version should use "No elimination on tie" because it is safest and easiest to reason about.

## Lobby Rules And Validation

Minimum players:

- At least 4 players are required to start.

Mafia count rule:

```text
mafiaCount < totalPlayers - mafiaCount
```

This means Mafia must always be fewer than non-Mafia players at game start.

Show a clear warning when the Mafia count is too high.

Recommended Mafia count:

- 4-5 players: 1 Mafia.
- 6-8 players: 2 Mafia.
- 9-12 players: 3 Mafia.
- 13+ players: roughly 25% of players, rounded down, while keeping Mafia fewer than non-Mafia.

Start game must be disabled if:

- Player count is below 4.
- Mafia count is invalid.
- Required settings are missing.
- A game has already started.

## Roles

Initial roles:

- Mafia.
- Doctor.
- Detective.
- Villager.

### Mafia

Goal:

- Eliminate enough villagers so Mafia controls or equals the village.

Night ability:

- Mafia collectively choose one target to eliminate.

Information:

- Mafia players can see who the other Mafia players are.

### Doctor

Goal:

- Help the village eliminate all Mafia.

Night ability:

- Choose one player to protect.

Rules:

- If the Doctor protects the Mafia target, no one dies that night.
- The Doctor may or may not be allowed to self-save depending on future settings. For the first version, allow self-save unless a setting is added later.

### Detective

Goal:

- Help the village identify Mafia.

Night ability:

- Investigate one player each night.

Result:

- The backend returns whether the investigated player is Mafia or not Mafia.

### Villager

Goal:

- Discuss, observe, and vote to eliminate all Mafia.

Ability:

- No night action.

## Role Assignment Requirements

Role assignment must be performed by the backend.

Frontend must only receive:

- The logged-in player's own role.
- The logged-in Mafia player's known Mafia teammates, if the player is Mafia.
- Public player status such as alive/dead.

Frontend must not receive:

- Full role map.
- Other players' roles.
- Hidden night choices.
- Detective results for other players.
- Doctor target.
- Mafia target, unless the user is allowed to know.

Role assignment should:

- Use room settings for Mafia count.
- Include one Doctor when enough players are available.
- Include one Detective when enough players are available.
- Fill remaining slots with Villagers.
- Randomly shuffle roles.
- Store roles server-side.

Suggested baseline:

- 4 players: 1 Mafia, 1 Doctor, 2 Villagers.
- 5 players: 1 Mafia, 1 Doctor, 1 Detective, 2 Villagers.
- 6+ players: configured Mafia count, 1 Doctor, 1 Detective, rest Villagers.

## Game Flow

The game is divided into rounds. Each round has night and day sections.

### Game Start

1. Host starts the game.
2. Backend validates the lobby.
3. Backend assigns roles.
4. Each player sees a private role reveal screen.
5. The first night starts.

### Night Phase

Night sequence:

1. Mafia choose one target.
2. Doctor chooses one player to save.
3. Detective chooses one player to investigate.
4. Backend resolves all night actions.
5. Backend stores events.
6. Backend emits only allowed results to each player.

Night rules:

- Dead players cannot take night actions.
- Villagers do not take night actions.
- Mafia target is required before the night can resolve, unless timer expires.
- If timer expires, backend should use a safe fallback, such as no Mafia kill or last submitted Mafia selection.
- Doctor and Detective actions can be optional on timeout.

### Night Result

After night actions resolve:

- If Mafia target was not saved, target dies.
- If target was saved by Doctor, no one dies.
- Detective receives private result.
- Public announcement feed displays the night result.

### Day Phase

Day sequence:

1. Village wakes up.
2. Announcement feed shows night result.
3. Discussion timer starts.
4. Voting starts after discussion timer ends.
5. Alive players vote.
6. Backend resolves vote.
7. Eliminated player is marked dead, if any.
8. Backend checks win condition.
9. If no winner, next round starts.

### Voting Rules

- Only alive players can vote.
- Dead players cannot vote.
- Players can vote for one alive player or abstain.
- Voting ends when the timer expires or all alive players have submitted.
- Highest vote count is eliminated.
- If there is a tie, apply the room tie rule.
- First version tie rule: no elimination.
- If everyone abstains, no one is eliminated.

## Win Conditions

Village wins when:

- All Mafia players are eliminated.

Mafia wins when:

- Number of alive Mafia is greater than or equal to number of alive non-Mafia.

Win checks should happen:

- After night resolution.
- After vote resolution.
- Before starting the next round.

## Death Story System

Whenever a player is eliminated, the system should show a short dramatic story.

Story types:

- Killed by Mafia at night.
- Saved by Doctor.
- Eliminated by village vote.
- No elimination because of tie.
- No elimination because everyone abstained.

Story requirements:

- Short.
- Dramatic.
- Clear.
- Not graphic.
- Suitable for a party game.
- Different enough each round to avoid repetition.
- Must not reveal hidden roles unless "Reveal role on death" is enabled.

Story templates should support:

- Player name.
- Pronoun.
- Round number.
- Elimination type.

Example:

```text
Morning arrives in silence. {{playerName}} was found missing from the village. The Mafia had made their move.
```

Pronoun handling:

- Male: he / him / his.
- Female: she / her / her.
- Other or Prefer not to say: they / them / their.

### Mafia Kill Story Examples

- "Morning arrives with silence across the village. {{playerName}} was gone before sunrise. The Mafia had made their move."
- "Before sunrise, the village heard a distant cry. When everyone gathered, {{playerName}} was missing."
- "The night was calm, almost too calm. By morning, {{playerName}} had disappeared, leaving only whispers behind."
- "The village woke to terrible news. {{playerName}} did not survive the night. The Mafia had struck again."

### Doctor Save Story Examples

- "The Mafia moved in the dark, but someone was protected just in time. No one died last night."
- "The village nearly lost someone in the night, but a silent protector changed their fate."
- "The Mafia attempted an attack, but their plan failed. By morning, everyone was still alive."

### Vote Elimination Story Examples

- "After heated discussion, the village made its choice. {{playerName}} was eliminated by public judgment."
- "The votes were counted. Suspicion had chosen its target. {{playerName}} was removed from the village."
- "Fear turned into action. The villagers pointed to {{playerName}}, and the decision was final."

### Tie Story Example

- "The village argued until the final second, but no agreement was reached. No one was eliminated today."

### Abstain Story Example

- "No one dared to make a move. The village stayed silent, and no one was eliminated."

## Announcement Feed

Create a system announcement feed inside the game screen.

It should show:

- Phase changes.
- Night results.
- Death stories.
- Voting results.
- Doctor save result.
- Detective private result, only to the Detective.
- Game win result.

Example announcements:

- "Night 1 has started."
- "The Mafia is choosing a target."
- "The village wakes up."
- "No one died last night."
- "{{Death story appears here}}"
- "Discussion has started. You have 3 minutes."
- "Voting has started."
- "{{playerName}} has been eliminated by village vote."
- "Village wins. All Mafia have been eliminated."
- "Mafia wins. They now control the village."

System announcements should be styled with dramatic cards, icons, or banners in later UI polish phases.

## Game State Machine

Suggested states:

- LOBBY.
- ROLE_REVEAL.
- NIGHT_STARTED.
- NIGHT_ACTIONS_OPEN.
- NIGHT_RESOLUTION.
- DAY_ANNOUNCEMENT.
- DISCUSSION.
- VOTING.
- VOTE_RESOLUTION.
- GAME_OVER.

Suggested transitions:

- LOBBY -> ROLE_REVEAL when host starts a valid game.
- ROLE_REVEAL -> NIGHT_STARTED after a short reveal window or all players continue.
- NIGHT_STARTED -> NIGHT_ACTIONS_OPEN.
- NIGHT_ACTIONS_OPEN -> NIGHT_RESOLUTION when required actions are complete or timer expires.
- NIGHT_RESOLUTION -> GAME_OVER if a win condition is met.
- NIGHT_RESOLUTION -> DAY_ANNOUNCEMENT if game continues.
- DAY_ANNOUNCEMENT -> DISCUSSION.
- DISCUSSION -> VOTING when timer expires.
- VOTING -> VOTE_RESOLUTION when all votes are in or timer expires.
- VOTE_RESOLUTION -> GAME_OVER if a win condition is met.
- VOTE_RESOLUTION -> NIGHT_STARTED if game continues.

The backend should be the source of truth for the current state.

## Realtime Requirements

Use realtime events for lobby and game updates.

Suggested room/lobby events:

- room:created.
- room:joined.
- room:left.
- room:players_updated.
- room:settings_updated.
- room:validation_updated.
- room:game_started.

Suggested game events:

- game:state_changed.
- game:phase_started.
- game:timer_updated.
- game:role_assigned_private.
- game:mafia_team_private.
- game:night_action_submitted.
- game:night_resolved.
- game:detective_result_private.
- game:announcement_added.
- game:discussion_started.
- game:voting_started.
- game:vote_submitted.
- game:vote_resolved.
- game:player_eliminated.
- game:game_over.

Realtime security rules:

- Events must be scoped to a room.
- Private events must be sent only to the correct user.
- Clients must not be trusted to advance the game phase directly.
- Clients submit intents; the backend validates and applies them.

## Database Requirements

The exact schema may vary by stack, but the app needs these core entities.

### Users

- id.
- fullName.
- email.
- sex.
- passwordHash.
- avatarUrl.
- totalScore.
- totalGamesPlayed.
- totalWins.
- totalLosses.
- mafiaWins.
- villageWins.
- gamesAsMafia.
- gamesAsDoctor.
- gamesAsDetective.
- gamesAsVillager.
- successfulDoctorSaves.
- successfulDetectiveFinds.
- correctVotesAgainstMafia.
- survivedGames.
- createdAt.
- updatedAt.

### Rooms

- id.
- code.
- hostUserId.
- status.
- maxPlayers, optional.
- mafiaCount.
- discussionTimerSeconds.
- votingTimerSeconds.
- nightTimerSeconds.
- revealRoleOnDeath.
- tieRule.
- createdAt.
- updatedAt.

### RoomPlayers

- id.
- roomId.
- userId.
- displayName.
- avatarUrl.
- isHost.
- isConnected.
- isReady, optional.
- joinedAt.

### Games

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

### GamePlayers

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

Roles must be protected from unauthorized reads.

### Rounds

- id.
- gameId.
- roundNumber.
- phase.
- startedAt.
- endedAt.

### NightActions

- id.
- gameId.
- roundId.
- actorUserId.
- actionType.
- targetUserId.
- submittedAt.

Action types:

- MAFIA_KILL.
- DOCTOR_SAVE.
- DETECTIVE_CHECK.

### Votes

- id.
- gameId.
- roundId.
- voterUserId.
- targetUserId, nullable for abstain.
- submittedAt.

### GameEvents

- id.
- roomId.
- gameId.
- roundId.
- eventType.
- playerId, optional.
- targetPlayerId, optional.
- visibility.
- message.
- metadata.
- createdAt.

Event types:

- GAME_STARTED.
- ROLE_ASSIGNED.
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

Visibility examples:

- PUBLIC.
- PRIVATE_TO_PLAYER.
- PRIVATE_TO_MAFIA.
- HOST_ONLY.

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

## Backend Modules

Suggested modules:

- Auth module.
- User profile module.
- Room module.
- Lobby validation module.
- Role assignment module.
- Game state machine module.
- Timer/scheduler module.
- Night action resolver.
- Voting resolver.
- Win condition checker.
- Announcement/story module.
- Score calculation module.
- Realtime gateway/socket module.
- Persistence/repository layer.
- Authorization and visibility filtering layer.

## Frontend Components

Suggested components:

- Auth forms.
- Dashboard actions.
- Room code input.
- Lobby player list.
- Room settings panel.
- Validation warning panel.
- Host controls.
- Role reveal card.
- Role instruction panel.
- Phase banner.
- Timer ring.
- Player avatar grid.
- Night action selector.
- Voting panel.
- Announcement feed.
- Game result screen.
- Profile stats cards.
- Rules modal.

## UI Direction

Final UI should feel:

- Dark.
- Suspenseful.
- Social.
- Game-like.
- Mobile-friendly.
- Clear enough for first-time players.

UI polish should come after the game is playable.

Polish ideas:

- Dark mystery theme.
- Role cards.
- Animated role reveal.
- Timer ring.
- Player avatar grid.
- Phase banner.
- Game result screen.
- Rules modal.
- Mobile responsive UI.

Do not start with fancy UI. First make the game playable with simple screens. Then make it beautiful.

## Security Requirements

- Passwords must be hashed.
- Authenticated routes must require login.
- Room membership must be checked before room access.
- Only host can edit settings and start game.
- Only alive players can act or vote.
- Dead players can watch but cannot act.
- Backend validates every submitted action.
- Backend controls phase transitions.
- Backend controls score updates.
- Role data must never be over-fetched by the client.
- Private realtime events must only go to authorized recipients.

## Edge Cases

Handle:

- Player disconnects in lobby.
- Player disconnects during game.
- Host disconnects.
- Mafia target not submitted before timer ends.
- Doctor action not submitted.
- Detective action not submitted.
- Player refreshes page.
- Player tries to vote twice.
- Player tries to vote after death.
- Player tries to act in the wrong phase.
- Player joins after game starts.
- Room code does not exist.
- Tie vote.
- Everyone abstains.
- Mafia count becomes invalid after a player leaves.
- Win condition reached after night.
- Win condition reached after voting.

## Development Order

Recommended safest order:

1. PRD markdown file.
2. Technical plan.
3. Database schema.
4. Backend game engine.
5. Basic UI.
6. Realtime multiplayer.
7. Fancy UI.
8. Scoring/profile.
9. Testing.

Practical phase files in this repo:

1. `PHASE_1_SETUP_AUTH.md`
2. `PHASE_2_LOBBY_ROOM.md`
3. `PHASE_3_ROLE_ASSIGNMENT.md`
4. `PHASE_4_GAME_ENGINE.md`
5. `PHASE_5_UI_POLISH.md`
6. `PHASE_6_SCORING_PROFILE.md`
7. `PHASE_7_TESTING_EDGE_CASES.md`

## Final Product Requirement

The application should not just run Mafia mechanically. It should feel like an immersive party game with:

- Simple signup/login.
- Player profiles.
- Score progression.
- Role-based instructions.
- Dramatic death stories.
- Clear system announcements.
- Detailed rule pages.
- Real-time multiplayer gameplay.
- Secure backend-controlled game logic.
- A polished dark mystery UI.

The experience should be easy for beginners, exciting for friends, and structured enough that the system can fully replace the human God / Moderator.
