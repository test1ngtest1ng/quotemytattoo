-- =============================================================================
-- Admin access flag. Flip `is_admin = true` for any account to grant them the
-- /admin panel (reports moderation, signups, leads, stats, exports). Toggle it
-- off to revoke - no redeploy needed.
-- =============================================================================

alter table profiles add column if not exists is_admin boolean not null default false;
