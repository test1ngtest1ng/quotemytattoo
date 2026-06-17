-- =============================================================================
-- Admin action audit trail. Every privileged action (suspend, edit, remove,
-- delete, moderate) writes a row here via the service-role client. RLS is
-- enabled with NO policies, so only the service role (which bypasses RLS) can
-- read/write it.
-- =============================================================================

create table if not exists admin_actions (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid references profiles(id) on delete set null,
  action      text not null,
  target_type text,
  target_id   text,
  detail      text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_admin_actions_created on admin_actions (created_at desc);

alter table admin_actions enable row level security;
