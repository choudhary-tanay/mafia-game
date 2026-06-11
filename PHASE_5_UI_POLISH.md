# Phase 5: Fancy UI Polish

## Claude Instruction

Read `MAFIA_GAME_PRD.md` and the completed Phase 1-4 code first.

Implement Phase 5 only after the core game is playable. Do not rewrite the game engine unless a UI integration bug requires a small fix.

## Goal

Make the playable game feel like a polished dark mystery party experience.

## Build

- Dark mystery theme.
- Improved dashboard and lobby layout.
- Role cards.
- Animated role reveal.
- Timer ring.
- Player avatar grid.
- Phase banner.
- Announcement feed styling.
- Game result screen.
- Rules modal.
- Mobile responsive UI.
- Clear loading, empty, disabled, and error states.

## Design Direction

The app should feel:

- Suspenseful.
- Social.
- Clear.
- Game-like.
- Beginner-friendly.

Avoid visual polish that makes gameplay unclear.

## Important Screens

Polish:

- Signup.
- Login.
- Dashboard.
- Create / Join room.
- Lobby.
- Role reveal.
- Game screen.
- Voting panel.
- Announcement feed.
- Game result.
- Profile entry point, if it exists.

## Components

Suggested components:

- Role card.
- Player avatar tile.
- Phase banner.
- Circular timer.
- Action panel.
- Vote list.
- System announcement card.
- Rules modal.
- Result summary.

## Mobile Requirements

- Lobby must be usable on mobile.
- Game actions must be easy to tap.
- Player list/grid should not overflow.
- Timer and phase should remain visible.
- Modals should fit small screens.
- Text must not overlap or get clipped.

## Accessibility

- Buttons must have clear labels.
- Disabled states must be visible.
- Color should not be the only signal.
- Text contrast should be readable.
- Keyboard navigation should work for key actions where practical.

## Acceptance Criteria

- The game is visually cohesive.
- Role reveal feels special but remains clear.
- Timers are easy to read.
- Players can understand the current phase at a glance.
- Game actions are obvious.
- The announcement feed is readable and dramatic.
- Mobile layout works for auth, lobby, and gameplay.
- UI does not expose hidden information.

## Stop Point

Stop after visual polish is complete. Do not implement scoring/profile updates in this phase unless already completed earlier.
