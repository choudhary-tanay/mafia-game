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
