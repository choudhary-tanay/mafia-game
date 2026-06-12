-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 9: Night Engagement Questions
-- Run once in the Supabase SQL editor.
-- Idempotent — safe to run multiple times.
-- ─────────────────────────────────────────────────────────────────────────────

-- Night question answers: one row per player per round (optional, non-blocking)
create table if not exists public.night_question_answers (
  id            uuid default gen_random_uuid() primary key,
  game_id       uuid not null references public.games(id) on delete cascade,
  round_id      uuid not null references public.rounds(id) on delete cascade,
  user_id       uuid,           -- set for authenticated players, null for guests
  guest_id      uuid,           -- set for guest players, null for auth users
  question_text text not null,  -- the exact question that was shown
  answer_text   text,           -- null when skipped
  skipped       boolean not null default false,
  created_at    timestamptz default now() not null,

  -- At least one identity must be set
  constraint nqa_identity_check check (user_id is not null or guest_id is not null)
);

-- Partial unique indexes: one answer per player per round
-- (partial, not full — NULLs on the other column would otherwise conflict)
create unique index if not exists nqa_round_user
  on public.night_question_answers (round_id, user_id)
  where user_id is not null;

create unique index if not exists nqa_round_guest
  on public.night_question_answers (round_id, guest_id)
  where guest_id is not null;

-- RLS — service role bypasses; no direct browser access needed
alter table public.night_question_answers enable row level security;
