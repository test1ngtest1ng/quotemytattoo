-- =============================================================================
-- Amber batch: featured listings, artist availability, and request expiry.
--   featured_until  - paid placement (set manually for now; Stripe later).
--   available       - artist is taking work; when false, they're skipped in
--                     matching and get no new-lead emails.
--   expires_at      - a live request auto-closes after this time (6 weeks).
-- =============================================================================

alter table artists
  add column if not exists featured_until timestamptz,
  add column if not exists available boolean not null default true;

alter table studios
  add column if not exists featured_until timestamptz;

alter table tattoo_requests
  add column if not exists expires_at timestamptz;

-- Give existing live requests a 6-week window from when they were posted.
update tattoo_requests
  set expires_at = created_at + interval '6 weeks'
  where expires_at is null and status = 'live';

-- Helpful index for the expiry sweep.
create index if not exists idx_requests_live_expiry
  on tattoo_requests (status, expires_at);
