-- Create the game_data_snapshots table to cache aggregated game data.
-- This avoids hitting the game server DB on every dashboard visit.
-- Run this in the Supabase SQL Editor.

create table if not exists game_data_snapshots (
  id uuid primary key default gen_random_uuid(),
  captured_at timestamptz not null default now(),
  -- Each dataset stored as JSONB for flexibility
  players jsonb not null default '[]'::jsonb,
  market jsonb not null default '[]'::jsonb,
  ratings jsonb not null default '[]'::jsonb,
  feedback jsonb not null default '[]'::jsonb,
  cycles jsonb not null default '[]'::jsonb,
  leaderboards jsonb not null default '[]'::jsonb
);

-- Index for fetching the latest snapshot quickly
create index if not exists idx_game_data_snapshots_captured_at
  on game_data_snapshots (captured_at desc);

-- Keep only the last 24 hours of snapshots (optional cleanup policy).
-- You can schedule this as a Supabase cron or run manually:
--   delete from game_data_snapshots
--   where captured_at < now() - interval '24 hours';
