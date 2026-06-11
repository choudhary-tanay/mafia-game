# Phase 1: Project Setup And Simple Auth

## Claude Instruction

Read `MAFIA_GAME_PRD.md` first.

Implement Phase 1 only. Do not build lobby, role assignment, game engine, realtime gameplay, scoring updates, or fancy UI yet. Keep the code structure scalable for later phases.

## Goal

Create the app foundation and simple account system.

## Build

- Next.js / React app foundation.
- Backend/API foundation.
- Database connection and initial migrations.
- User signup.
- User login.
- User logout.
- Authenticated session handling.
- Basic protected dashboard route.
- User profile table with empty score/stat fields.

## Signup Fields

- Full name.
- Email.
- Sex.
- Password.
- Confirm password.

Sex options:

- Male.
- Female.
- Other.
- Prefer not to say.

## Login Fields

- Email.
- Password.

No OTP and no 2FA.

## Database

Create a `users` table or equivalent model with:

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

All score/stat fields should default to zero.

## Validation

- Name is required.
- Email is required and must be valid.
- Email must be unique.
- Sex is required.
- Password is required.
- Password should have basic strength validation.
- Confirm password must match password.
- Show simple user-friendly errors.

## Security

- Store password hashes only.
- Do not store plain text passwords.
- Protect authenticated routes.
- Do not expose passwordHash to the frontend.

## Acceptance Criteria

- A new user can sign up.
- Duplicate email signup is rejected.
- A user can log in.
- A logged-in user can access the dashboard.
- A logged-out user cannot access protected pages.
- A user can log out.
- User profile/stat fields exist and start at zero.

## Stop Point

Stop after Phase 1 is complete and tested. Wait for the next instruction before implementing room/lobby features.
