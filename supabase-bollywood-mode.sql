-- Phase 10: Bollywood Style Mode
-- Run once in the Supabase SQL editor. Idempotent.
alter table public.rooms
  add column if not exists bollywood_mode boolean not null default false;
