-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 11: Host Pause / Resume + Game History
-- Run once in the Supabase SQL editor.
-- Idempotent — safe to run multiple times.
-- ─────────────────────────────────────────────────────────────────────────────

-- Add pause state fields to the games table.
-- DEFAULT false ensures existing rows are treated as not paused after migration.
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS is_paused                 BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paused_at                 TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paused_by_player_id       TEXT,
  ADD COLUMN IF NOT EXISTS remaining_phase_seconds   INTEGER;

-- No new tables needed for game history:
-- game_events    → public announcements (night deaths, day events, vote results)
-- night_actions  → all night actions (revealed post-game)
-- votes          → all votes (revealed post-game)
-- game_players   → final roles (already exposed on GAME_OVER)
-- rounds         → round list for timeline structure
