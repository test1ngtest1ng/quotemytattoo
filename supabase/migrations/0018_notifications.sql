-- 0018: in-app notifications
-- A lightweight notification feed for discrete events (a customer accepted a
-- quote, a booking was confirmed, a new lead matched). Unread chat messages are
-- NOT stored here - the bell merges these rows with live unread-message counts.
-- Rows are created server-side via the service role, so there is no insert policy.

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null,                       -- 'quote_accepted' | 'booked' | 'new_lead'
  title       text not null,
  body        text,
  href        text,
  request_id  uuid references public.tattoo_requests(id) on delete cascade,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

-- Users see and mark-read only their own notifications.
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select using (user_id = auth.uid());

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
