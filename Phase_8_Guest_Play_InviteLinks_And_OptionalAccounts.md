# Phase 8: Guest Play, Invite Links, And Optional Accounts

## Claude Instruction

Read `MAFIA_GAME_PRD.md` and the completed Phase 1-7 code first.

Implement Phase 8 only.

The goal is to allow users to play the Mafia game without mandatory signup or login. Users should be able to join a game using a room code or invite link by entering only their display name.

Signup/login should remain available, but it should be optional.

Do not break existing authenticated user flows, profile scoring, room logic, role assignment, or game engine.

---

## Goal

Make the game easier to join for party play.

Users should be able to:

* Open an invite link.
* Enter a display name.
* Join the lobby immediately.
* Play the full game as a guest.
* Optionally sign up or log in later.
* Optionally claim/save their guest stats after the game.

This is important because party games should have low friction. Players should not be forced to create accounts before joining a casual game.

---

## Updated Access Model

The app should support two player types:

1. Authenticated User
2. Guest Player

## Authenticated User

Authenticated users:

* Already have an account.
* Can create rooms.
* Can join rooms.
* Can play games.
* Can save scores permanently.
* Can view profile and game history.
* Can host rooms.

## Guest Player

Guest players:

* Do not need signup or login.
* Can join using room code or invite link.
* Must enter a display name.
* Can play the full game.
* Can receive a role.
* Can perform actions.
* Can vote.
* Can see game result.
* Can optionally sign up after the game to save profile/stats.

Guest players should not be blocked from the core game.

---

## Important Product Rule

Signup/login is optional for players.

The app should not force every player to create an account.

Recommended behavior:

* Host account is recommended but not mandatory if guest hosting is implemented.
* Guest joining must be supported.
* Invite link should take the player directly to a join screen.
* Player only needs to enter name to join.

---

## Updated Landing Page

Landing page should show three clear actions:

1. Create Game
2. Join With Code
3. Sign In / Sign Up

Primary CTA:

* “Play With Friends”

Secondary CTA:

* “Sign In to Save Progress”

Copy should make it clear:

“You can join a game without creating an account. Just enter your name and room code.”

---

## Join By Invite Link Flow

Invite link format:

```text
/game/join/{{roomCode}}
```

or

```text
/join/{{roomCode}}
```

When user opens invite link:

1. App checks if room code exists.
2. If room does not exist, show error:
   “This room does not exist or has expired.”
3. If room exists and is still in lobby, show join screen.
4. Join screen asks for:

   * Display name
5. Optional:

   * If already logged in, prefill name from profile.
   * If logged out, allow guest name entry.
6. User clicks “Join Game”.
7. User enters lobby.

No signup/login should be required.

---

## Join By Room Code Flow

Join page should allow:

* Enter room code.
* Enter display name.
* Join as guest.

If user is logged in:

* Prefill display name.
* Still allow editing display name for that room.

If user is not logged in:

* Ask only for display name and room code.

Validation:

* Room code is required.
* Display name is required.
* Display name must be 2–24 characters.
* Display name should not be empty spaces.
* Duplicate names in the same room should be handled.

Duplicate name handling options:

Option A:

* Reject duplicate display name in same room.

Error:
“Someone in this room is already using that name.”

Option B:

* Auto-add a number:

  * Tanay
  * Tanay 2

Use Option A for first implementation because it is clearer.

---

## Guest Session Handling

Guest players need a stable temporary identity.

Create a guest session when a guest joins.

Guest identity should include:

* guestId
* displayName
* roomId
* createdAt
* expiresAt

Guest session should be stored using:

* Secure HTTP-only cookie, preferred
* Or localStorage only if cookie implementation is difficult

Recommended:

Use a secure cookie so refresh/reconnect works and users cannot easily impersonate another guest.

Guest session requirements:

* Guest can refresh the page and remain in the same room.
* Guest can reconnect during game.
* Guest cannot control another guest’s player record.
* Guest session should be scoped to the room/game.
* Guest session should expire after a reasonable time, such as 24 hours.

---

## Database Changes

Update player models to support both authenticated users and guests.

### RoomPlayers

Update `roomPlayers` to support nullable `userId`.

Fields:

* id
* roomId
* userId, nullable
* guestId, nullable
* displayName
* avatarUrl, optional
* isGuest
* isHost
* isConnected
* isReady
* joinedAt
* lastSeenAt

Rules:

* Either `userId` or `guestId` must exist.
* Authenticated players use `userId`.
* Guest players use `guestId`.
* A player cannot have both unless guest account claiming is implemented.

### GamePlayers

Update `gamePlayers` similarly.

Fields:

* id
* gameId
* roomId
* userId, nullable
* guestId, nullable
* displayName
* role
* isGuest
* isAlive
* deathRoundNumber, optional
* deathCause, optional
* survivedToEnd
* createdAt
* updatedAt

### GuestSessions

Create table or equivalent:

* id
* guestId
* displayName
* roomId
* gameId, nullable
* cookieTokenHash
* expiresAt
* createdAt
* updatedAt

Do not store raw guest session tokens if using cookies. Store hashed token values.

---

## Backend Authorization Updates

Every protected game action should accept either:

* authenticated user session
* valid guest session

Update authorization checks for:

* joining room
* leaving room
* lobby access
* role reveal access
* night action submission
* vote submission
* chat messages
* reconnect
* game result access

Important:

Backend must resolve current player by:

```text
userId OR guestId
```

Never trust display name alone.

Display name is not identity.

---

## Room Hosting Rules

Preferred first version:

* Only authenticated users can create rooms and host.
* Guests can join and play.

This is safest because hosting requires more control.

Optional later version:

* Guests can create rooms too.
* Guest host is stored with guestId.
* If guest host signs up later, room ownership can be claimed.

For Phase 8 first implementation:

Use this rule:

```text
Authenticated users can create rooms.
Guests can join rooms.
```

Update UI copy:

“To create a room, sign in. To join a room, just enter your name.”

---

## Optional Signup After Game

After game ends, guest players should see:

“Want to save your score and game history?”

Buttons:

* Create Account
* Sign In
* Continue as Guest

If guest creates account after game:

* Link guest game stats to new user account.
* Move or copy guest stats into user profile.
* Mark guest session as claimed.

If this is too much for Phase 8, create only the UI placeholder and implement claiming later.

First version acceptable behavior:

* Guests can play.
* Guest stats are shown in final game result.
* Guest stats are not permanently saved to profile unless they sign up before the game ends.

Clearly show:

“Guest scores are temporary. Sign in to save your progress.”

---

## Scoring Rules For Guests

Authenticated users:

* Scores are saved permanently to their profile.

Guest users:

* Scores can be calculated for the game result screen.
* Scores are not saved permanently unless account claiming is implemented.

Game result screen should show both:

* Authenticated player scores
* Guest player temporary scores

For guests, label:

“Temporary guest score”

---

## UI Updates

Update these screens:

### Landing Page

Add:

* Join as guest messaging
* Room code join field
* Clear optional signup copy

### Join Room Page

Support:

* Room code
* Display name
* Join as guest button
* Sign in option

### Invite Link Page

Support:

* Display room name/code
* Display name input
* Join lobby button
* Sign in to use saved profile link

### Lobby Page

Show:

* Guest badge for guest players
* Logged-in badge or profile avatar for authenticated players
* Player display name
* Host badge

### Dashboard

Authenticated-only dashboard remains.

If logged-out user visits dashboard:

* Redirect to landing page or login.
* Do not block guest invite link flow.

### Game Page

Guest players should have the same gameplay UI as authenticated players.

### Result Page

For guest players:

* Show temporary stats.
* Show CTA:
  “Create an account to save future scores.”

---

## Copy Examples

Join page copy:

```text
Join the game
Enter your name to join this Mafia room. No account required.
```

Optional account copy:

```text
Sign in if you want to save your score and game history.
```

Guest score copy:

```text
You played as a guest. Your score for this game is temporary.
```

Create room restriction copy:

```text
Please sign in to create and host a game.
```

---

## Validation Rules

Guest display name:

* Required
* Minimum 2 characters
* Maximum 24 characters
* Trim whitespace
* No duplicate active display name in same room
* Block offensive words if a filter already exists; otherwise skip for now

Room joining:

* Room must exist
* Room must be in lobby state
* Room must not be full
* Room must not already have an active player with same display name
* If game already started, show:
  “This game has already started.”

---

## Security Requirements

* Do not use display name as authentication.
* Use guestId/session token to identify guest players.
* Store guest token securely.
* Do not expose guest session token to other players.
* Guest cannot submit action for another player.
* Guest cannot vote as another player.
* Guest cannot see hidden role data of other players.
* Guest cannot access room unless their guest session belongs to that room.
* If guest session expires, ask them to rejoin if game is still in lobby.
* If game is active and guest session expires, show reconnect error.

---

## Realtime Updates

Realtime events should work for both authenticated and guest players.

Update socket authentication to support:

* user session token
* guest session token

Events should still be room-scoped and player-scoped.

Private events must work for guests too:

* role reveal
* detective result
* Mafia teammate visibility
* action confirmation

---

## Acceptance Criteria

* Logged-out user can open an invite link.
* Logged-out user can enter display name and join lobby.
* Logged-out user can join using room code and display name.
* Guest player appears in lobby with guest badge.
* Guest player can refresh and stay in the room.
* Guest player can receive a private role.
* Guest player can play the full game.
* Guest player can vote.
* Guest player can perform role action if assigned Mafia, Doctor, or Detective.
* Guest player cannot access another player’s hidden data.
* Guest player cannot submit duplicate/invalid actions.
* Authenticated players still work as before.
* Authenticated host can still create and manage room.
* Guest scores show as temporary.
* Existing profile scoring for authenticated users still works.
* Invite link flow does not force login/signup.
* Dashboard remains protected for authenticated users only.

---

## Testing Checklist

Test these flows:

1. Logged-in host creates room.
2. Logged-out player opens invite link.
3. Logged-out player enters name and joins lobby.
4. Another logged-out player joins with room code.
5. Duplicate display name is rejected.
6. Host starts game.
7. Guest receives private role.
8. Guest refreshes page and returns to correct game state.
9. Guest submits night action if role allows.
10. Guest votes during voting phase.
11. Game ends.
12. Guest sees temporary score.
13. Authenticated user sees saved score.
14. Hidden role data does not leak in network responses.
15. Logged-out user cannot access dashboard.
16. Logged-out user can still access join/invite route.

---

## Stop Point

Stop after guest joining and optional account flow are working.

Do not implement public matchmaking, payments, voice/video chat, or advanced moderation in this phase.
