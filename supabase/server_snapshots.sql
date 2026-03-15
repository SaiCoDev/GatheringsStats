-- Create the server_snapshots table to store periodic server allocation data.
-- Run this in the Supabase SQL Editor.

create table if not exists server_snapshots (
  id uuid primary key default gen_random_uuid(),
  captured_at timestamptz not null default now(),
  total_servers int not null default 0,
  total_players int not null default 0,
  max_capacity int not null default 0,
  -- Full breakdown stored as JSON for flexibility
  entries jsonb not null default '[]'::jsonb
);

-- Index for time-range queries
create index if not exists idx_server_snapshots_captured_at
  on server_snapshots (captured_at desc);
