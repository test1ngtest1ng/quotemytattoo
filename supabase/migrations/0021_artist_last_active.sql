-- Artist responsiveness signal: when the artist was last active on the platform.
-- Updated when they view their leads or send a quote. Surfaced on the directory
-- and profile as a coarse "Active today / this week" badge.
alter table public.artists
  add column if not exists last_active timestamptz;

create index if not exists artists_last_active_idx
  on public.artists (last_active desc);
