# Mafia — Online Party Game

An online Mafia/Werewolf party game. No moderator needed — the backend runs everything.

**Stack:** Next.js 16 · React 19 · Tailwind CSS 4 · Supabase (Postgres) · jose JWT sessions

---

## Local Development Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd mafia-game
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New project**, fill in a name and database password, choose a region.
3. Wait for the project to finish provisioning (~1 minute).

### 3. Create the database table

1. In the Supabase dashboard, open **SQL Editor** (left sidebar).
2. Click **New query** and paste the entire block below, then click **Run**.

```sql
-- Auto-update updated_at on row changes
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

-- Users table
create table public.users (
  id                        uuid default gen_random_uuid() primary key,
  full_name                 text not null,
  email                     text unique not null,
  sex                       text not null,
  password_hash             text not null,
  avatar_url                text,
  total_score               integer default 0 not null,
  total_games_played        integer default 0 not null,
  total_wins                integer default 0 not null,
  total_losses              integer default 0 not null,
  mafia_wins                integer default 0 not null,
  village_wins              integer default 0 not null,
  games_as_mafia            integer default 0 not null,
  games_as_doctor           integer default 0 not null,
  games_as_detective        integer default 0 not null,
  games_as_villager         integer default 0 not null,
  successful_doctor_saves   integer default 0 not null,
  successful_detective_finds integer default 0 not null,
  correct_votes_against_mafia integer default 0 not null,
  survived_games            integer default 0 not null,
  created_at                timestamptz default now() not null,
  updated_at                timestamptz default now() not null
);

-- Row Level Security — table is private by default; service role bypasses RLS
alter table public.users enable row level security;

-- Auto-update trigger
create trigger on_users_updated
  before update on public.users
  for each row execute procedure public.handle_updated_at();
```

3. You should see "Success. No rows returned." — the table is ready.

### 3b. Phase 2 — Rooms and lobby tables

Run this as a **second** query in the SQL Editor:

```sql
-- Rooms table
create table public.rooms (
  id                        uuid default gen_random_uuid() primary key,
  code                      text unique not null,
  host_user_id              uuid not null references public.users(id) on delete cascade,
  status                    text default 'LOBBY' not null,
  mafia_count               integer default 1 not null,
  discussion_timer_seconds  integer default 180 not null,
  voting_timer_seconds      integer default 60 not null,
  night_timer_seconds       integer default 60 not null,
  reveal_role_on_death      boolean default true not null,
  tie_rule                  text default 'NO_ELIMINATION' not null,
  created_at                timestamptz default now() not null,
  updated_at                timestamptz default now() not null
);

alter table public.rooms enable row level security;

create trigger on_rooms_updated
  before update on public.rooms
  for each row execute procedure public.handle_updated_at();

-- Room players table
create table public.room_players (
  id           uuid default gen_random_uuid() primary key,
  room_id      uuid not null references public.rooms(id) on delete cascade,
  user_id      uuid not null references public.users(id) on delete cascade,
  display_name text not null,
  avatar_url   text,
  is_host      boolean default false not null,
  is_connected boolean default true not null,
  joined_at    timestamptz default now() not null,
  unique(room_id, user_id)
);

alter table public.room_players enable row level security;
```

### 3c. Phase 3 — Games and role tables

Run this as a **third** query in the SQL Editor:

```sql
-- Games table
create table public.games (
  id                   uuid default gen_random_uuid() primary key,
  room_id              uuid not null references public.rooms(id) on delete cascade,
  status               text default 'ROLE_REVEAL' not null,
  current_phase        text default 'ROLE_REVEAL' not null,
  current_round_number integer default 0 not null,
  winning_team         text,
  started_at           timestamptz default now() not null,
  ended_at             timestamptz,
  created_at           timestamptz default now() not null,
  updated_at           timestamptz default now() not null
);

alter table public.games enable row level security;

create trigger on_games_updated
  before update on public.games
  for each row execute procedure public.handle_updated_at();

-- Game players table (roles stored here — never over-fetched)
create table public.game_players (
  id                uuid default gen_random_uuid() primary key,
  game_id           uuid not null references public.games(id) on delete cascade,
  room_id           uuid not null references public.rooms(id),
  user_id           uuid not null references public.users(id),
  role              text not null,
  is_alive          boolean default true not null,
  death_round_number integer,
  death_cause       text,
  survived_to_end   boolean default false not null,
  created_at        timestamptz default now() not null,
  updated_at        timestamptz default now() not null,
  unique(game_id, user_id)
);

alter table public.game_players enable row level security;

create trigger on_game_players_updated
  before update on public.game_players
  for each row execute procedure public.handle_updated_at();
```

### 3d. Phase 4 — Game engine tables

Run this as a **fourth** query in the SQL Editor:

```sql
-- Add phase deadline to games
alter table public.games add column if not exists phase_deadline timestamptz;

-- Rounds
create table public.rounds (
  id           uuid default gen_random_uuid() primary key,
  game_id      uuid not null references public.games(id) on delete cascade,
  round_number integer not null,
  phase        text not null,
  started_at   timestamptz default now() not null,
  ended_at     timestamptz,
  unique(game_id, round_number)
);
alter table public.rounds enable row level security;

-- Night actions (Mafia kill / Doctor save / Detective check)
create table public.night_actions (
  id             uuid default gen_random_uuid() primary key,
  game_id        uuid not null references public.games(id) on delete cascade,
  round_id       uuid not null references public.rounds(id) on delete cascade,
  actor_user_id  uuid not null references public.users(id),
  action_type    text not null,
  target_user_id uuid references public.users(id),
  submitted_at   timestamptz default now() not null,
  unique(round_id, actor_user_id, action_type)
);
alter table public.night_actions enable row level security;

-- Day votes
create table public.votes (
  id              uuid default gen_random_uuid() primary key,
  game_id         uuid not null references public.games(id) on delete cascade,
  round_id        uuid not null references public.rounds(id) on delete cascade,
  voter_user_id   uuid not null references public.users(id),
  target_user_id  uuid references public.users(id),
  submitted_at    timestamptz default now() not null,
  unique(round_id, voter_user_id)
);
alter table public.votes enable row level security;

-- Announcement feed
create table public.game_events (
  id                uuid default gen_random_uuid() primary key,
  game_id           uuid not null references public.games(id) on delete cascade,
  round_id          uuid references public.rounds(id),
  event_type        text not null,
  player_id         uuid references public.users(id),
  target_player_id  uuid references public.users(id),
  visibility        text not null default 'PUBLIC',
  recipient_user_id uuid references public.users(id),
  message           text not null,
  metadata          jsonb,
  created_at        timestamptz default now() not null
);
alter table public.game_events enable row level security;
```

### 3e. Phase 6 — Scoring and profile tables

Run this as a **fifth** query in the SQL Editor:

```sql
-- Persisted game result (one per game, idempotency gate)
create table public.game_results (
  id           uuid default gen_random_uuid() primary key,
  game_id      uuid unique not null references public.games(id) on delete cascade,
  winning_team text not null,
  ended_reason text not null default 'WIN_CONDITION',
  created_at   timestamptz default now() not null
);
alter table public.game_results enable row level security;

-- Per-player per-game stat record
create table public.player_game_stats (
  id                          uuid default gen_random_uuid() primary key,
  game_id                     uuid not null references public.games(id) on delete cascade,
  user_id                     uuid not null references public.users(id),
  role                        text not null,
  team                        text not null,
  won                         boolean not null,
  survived_to_end             boolean not null,
  eliminated_round_number     integer,
  correct_votes_against_mafia integer default 0 not null,
  successful_doctor_saves     integer default 0 not null,
  successful_detective_finds  integer default 0 not null,
  score_delta                 integer not null,
  created_at                  timestamptz default now() not null,
  unique(game_id, user_id)
);
alter table public.player_game_stats enable row level security;
```

### 3f. Phase 8 — Guest player support

Run this as a **sixth** query in the SQL Editor:

```sql
-- ── room_players: make user_id nullable, add guest columns ──────────────────
alter table public.room_players alter column user_id drop not null;
alter table public.room_players add column if not exists guest_id   uuid;
alter table public.room_players add column if not exists is_guest   boolean default false not null;
alter table public.room_players drop constraint if exists room_players_room_id_user_id_key;
create unique index if not exists rp_room_user  on public.room_players (room_id, user_id)  where user_id  is not null;
create unique index if not exists rp_room_guest on public.room_players (room_id, guest_id) where guest_id is not null;

-- ── game_players: make user_id nullable, add guest columns + display_name ───
alter table public.game_players alter column user_id drop not null;
alter table public.game_players add column if not exists guest_id     uuid;
alter table public.game_players add column if not exists is_guest     boolean default false not null;
alter table public.game_players add column if not exists display_name text;
alter table public.game_players drop constraint if exists game_players_game_id_user_id_key;
create unique index if not exists gp_game_user  on public.game_players (game_id, user_id)  where user_id  is not null;
create unique index if not exists gp_game_guest on public.game_players (game_id, guest_id) where guest_id is not null;

-- ── night_actions: make actor_user_id nullable, add actor_guest_id ──────────
alter table public.night_actions alter column actor_user_id drop not null;
alter table public.night_actions add column if not exists actor_guest_id uuid;
alter table public.night_actions drop constraint if exists night_actions_round_id_actor_user_id_action_type_key;
create unique index if not exists na_round_user  on public.night_actions (round_id, actor_user_id,  action_type) where actor_user_id  is not null;
create unique index if not exists na_round_guest on public.night_actions (round_id, actor_guest_id, action_type) where actor_guest_id is not null;

-- ── votes: make voter_user_id nullable, add voter_guest_id ──────────────────
alter table public.votes alter column voter_user_id drop not null;
alter table public.votes add column if not exists voter_guest_id uuid;
alter table public.votes drop constraint if exists votes_round_id_voter_user_id_key;
create unique index if not exists v_round_user  on public.votes (round_id, voter_user_id)  where voter_user_id  is not null;
create unique index if not exists v_round_guest on public.votes (round_id, voter_guest_id) where voter_guest_id is not null;

-- ── player_game_stats: make user_id nullable, add guest columns ─────────────
alter table public.player_game_stats alter column user_id drop not null;
alter table public.player_game_stats add column if not exists guest_id  uuid;
alter table public.player_game_stats add column if not exists is_guest  boolean default false not null;
alter table public.player_game_stats drop constraint if exists player_game_stats_game_id_user_id_key;
create unique index if not exists pgs_game_user  on public.player_game_stats (game_id, user_id)  where user_id  is not null;
create unique index if not exists pgs_game_guest on public.player_game_stats (game_id, guest_id) where guest_id is not null;
```

### 4. Get your API keys

In the Supabase dashboard, go to **Project Settings → API**.

You need three values:
| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Project URL** (e.g. `https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **anon public** key |
| `SUPABASE_SERVICE_ROLE_KEY` | **service_role secret** key — keep this private |

### 5. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

Then open `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SESSION_SECRET=<run: openssl rand -base64 32>
```

> **Important:** `.env.local` is gitignored and will never be committed.

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/       — login page
│   ├── (auth)/signup/      — signup page
│   ├── actions/auth.ts     — signup / login / logout server actions
│   ├── dashboard/          — protected dashboard
│   └── page.tsx            — landing page
├── components/
│   ├── auth/               — SignupForm, LoginForm
│   └── ui/                 — Button, Input, Select
├── lib/
│   ├── session.ts          — jose JWT cookie sessions
│   ├── supabase/
│   │   ├── server.ts       — service-role client (server-only)
│   │   └── client.ts       — anon-key browser client (future realtime)
│   └── validations.ts      — Zod schemas
├── proxy.ts                — route protection (Next.js 16 middleware)
└── types/database.ts       — Supabase row types
```

---

## GitHub Setup

```bash
# From the mafia-game/ directory
git init
git add .
git commit -m "Phase 1: auth + Supabase setup"

# Create a repo on github.com, then:
git remote add origin https://github.com/your-username/mafia-game.git
git branch -M main
git push -u origin main
```

> `.env.local` is in `.gitignore` — your secrets will **not** be pushed.

---

## Vercel Deployment

### 1. Push to GitHub (see above)

### 2. Import into Vercel

1. Go to [vercel.com](https://vercel.com) and sign in.
2. Click **Add New → Project**.
3. Import your GitHub repo.
4. Vercel will auto-detect Next.js. Leave all settings as default.

### 3. Add environment variables

Before clicking **Deploy**, scroll to **Environment Variables** and add:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | your service role key |
| `SESSION_SECRET` | a new random secret (run `openssl rand -base64 32`) |

> Use a **different** `SESSION_SECRET` for production than your local one.

### 4. Deploy

Click **Deploy**. Vercel will build and publish your app.

Every `git push` to `main` will trigger an automatic redeploy.

---

## Acceptance Criteria (Phase 1)

| Test | Expected |
|---|---|
| Visit `/` | Landing page with dark mystery theme |
| Visit `/dashboard` (logged out) | Redirects to `/login` |
| Sign up at `/signup` | Creates account, redirects to dashboard |
| Duplicate email | Shows "This email is already registered." |
| Wrong password | Shows "Invalid email or password." |
| Log out | Clears session, blocks dashboard access |
| Stats on dashboard | All show `0` for new users |
