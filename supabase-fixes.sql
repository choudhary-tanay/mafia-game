-- ─────────────────────────────────────────────────────────────────────────────
-- Mafia game — schema hardening (run once in the Supabase SQL editor)
--
-- The app now works WITHOUT this file (the code no longer relies on
-- ON CONFLICT upserts), but running it is strongly recommended: it restores
-- database-level duplicate protection for night actions and votes, which the
-- Phase 8 migration accidentally weakened.
--
-- Background: Phase 8 replaced the original UNIQUE constraints with PARTIAL
-- unique indexes (WHERE ... IS NOT NULL). Postgres cannot use a partial index
-- to arbitrate the ON CONFLICT clause PostgREST sends, so every upsert failed
-- with error 42P10 — meaning no night action or vote could ever be saved.
-- Full (non-partial) unique indexes behave identically for data integrity
-- (NULLs are treated as distinct, so user rows never collide with guest rows)
-- and remain compatible with upserts.
--
-- Everything below is idempotent — safe to run multiple times.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. night_actions: replace partial indexes with full unique indexes
drop index if exists public.na_round_user;
drop index if exists public.na_round_guest;
create unique index if not exists na_round_user
  on public.night_actions (round_id, actor_user_id, action_type);
create unique index if not exists na_round_guest
  on public.night_actions (round_id, actor_guest_id, action_type);

-- 2. votes: same fix
drop index if exists public.v_round_user;
drop index if exists public.v_round_guest;
create unique index if not exists v_round_user
  on public.votes (round_id, voter_user_id);
create unique index if not exists v_round_guest
  on public.votes (round_id, voter_guest_id);

-- 3. Make sure rounds can never be duplicated (backstop for phase races)
--    (no-op if the constraint from the base schema is still present)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.rounds'::regclass
      and contype  = 'u'
  ) then
    alter table public.rounds
      add constraint rounds_game_round_key unique (game_id, round_number);
  end if;
end $$;

-- 4. game_results: idempotent-scoring gate (no-op if already present)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.game_results'::regclass
      and contype  = 'u'
  ) then
    alter table public.game_results
      add constraint game_results_game_id_key unique (game_id);
  end if;
end $$;
