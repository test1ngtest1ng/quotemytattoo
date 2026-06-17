-- =============================================================================
-- Admin moderation flags.
--   profiles.suspended       - reversible "ban": blocks login + actions.
--   tattoo_requests.removed  - reversible soft-delete for spam/abuse, hidden
--                              from artists' leads but recoverable.
-- =============================================================================

alter table profiles add column if not exists suspended boolean not null default false;
alter table tattoo_requests add column if not exists removed boolean not null default false;

create index if not exists idx_requests_removed on tattoo_requests (removed);
