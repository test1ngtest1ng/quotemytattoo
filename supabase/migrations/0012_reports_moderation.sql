-- =============================================================================
-- Reporting / flagging + review moderation.
--  * `reports` - any logged-in user can flag an artist, studio, review or
--    message for abuse. Only the owner/admin reads them (via the service role).
--  * reviews.hidden - a moderated review is hidden from the public AND excluded
--    from the artist's rating average (the recompute function is updated below).
-- =============================================================================

create table if not exists reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid references profiles(id) on delete set null,
  target_type text not null check (target_type in ('artist','studio','review','message')),
  target_id   uuid not null,
  reason      text not null,
  details     text,
  status      text not null default 'open' check (status in ('open','dismissed','actioned')),
  created_at  timestamptz not null default now()
);
create index if not exists idx_reports_status on reports (status, created_at desc);

alter table reports enable row level security;
-- Anyone signed in can file a report as themselves; nobody can read/update via
-- the anon/auth role (the admin moderation page uses the service role).
create policy "reports_insert_own" on reports for insert with check (reporter_id = auth.uid());

-- Moderation flag on reviews.
alter table reviews add column if not exists hidden boolean not null default false;

-- Exclude hidden reviews from the artist's rating + review_count.
create or replace function public.recompute_artist_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare aid uuid;
begin
  aid := coalesce(new.artist_id, old.artist_id);
  update artists set
    rating = coalesce((select round(avg(rating)::numeric, 2) from reviews where artist_id = aid and hidden = false), 0),
    review_count = (select count(*) from reviews where artist_id = aid and hidden = false)
  where id = aid;
  return null;
end;
$$;
