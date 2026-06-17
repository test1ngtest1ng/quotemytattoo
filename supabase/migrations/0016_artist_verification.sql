-- =============================================================================
-- Artist verification. Visibility/leads are NEVER gated by this - every onboarded
-- artist appears in the directory immediately. This is purely a trust badge an
-- admin grants manually. New artists start 'pending' (so they enter the admin
-- queue); existing rows are backfilled to 'pending' by the default.
-- =============================================================================

alter table artists
  add column if not exists verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'rejected'));

alter table artists add column if not exists verified_at timestamptz;

create index if not exists idx_artists_verification on artists (verification_status);
