-- =============================================================================
-- Saved / favourite artists - lets a customer shortlist artists while comparing.
-- One row per (customer, artist). RLS: a user only ever sees/changes their own.
-- =============================================================================

create table if not exists saved_artists (
  customer_id uuid not null references profiles(id) on delete cascade,
  artist_id   uuid not null references artists(id)  on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (customer_id, artist_id)
);

create index if not exists idx_saved_artists_customer on saved_artists (customer_id, created_at desc);

alter table saved_artists enable row level security;

create policy "saved_artists_select_own" on saved_artists for select using (customer_id = auth.uid());
create policy "saved_artists_insert_own" on saved_artists for insert with check (customer_id = auth.uid());
create policy "saved_artists_delete_own" on saved_artists for delete using (customer_id = auth.uid());
