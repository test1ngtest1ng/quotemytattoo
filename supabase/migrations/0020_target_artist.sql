-- 0020: direct-to-artist requests. A customer can request a quote FROM a specific
-- artist (from their profile / the directory / saved list). The request is targeted
-- to that artist (optionally also broadcast to other matching artists).
alter table public.tattoo_requests
  add column if not exists target_artist_id uuid references public.artists(id) on delete set null;
