-- Guest-first request flow: a guest who creates an account at submit (with email
-- confirmation on) gets their request saved as a draft, flagged to auto-publish
-- when they confirm their email (handled in /auth/confirm). The flag also marks
-- abandoned/never-confirmed guest drafts for cleanup by the daily cron.
alter table public.tattoo_requests
  add column if not exists publish_on_verify boolean not null default false;

create index if not exists tattoo_requests_publish_on_verify_idx
  on public.tattoo_requests (created_at)
  where publish_on_verify;
