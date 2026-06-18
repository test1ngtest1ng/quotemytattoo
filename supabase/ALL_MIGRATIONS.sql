-- Quote My Tattoo - full schema for a FRESH production Supabase project.
-- Paste this entire file into the Supabase SQL Editor and Run once.
-- Combined from migrations 0001 -> 0024 in order. Generated 2026-06-18.


-- ============================================================
-- 0001_init.sql
-- ============================================================
-- =============================================================================
-- Quote My Tattoo - initial schema (marketplace MVP)
-- Run once in the Supabase SQL editor (or via `supabase db push`).
-- Covers: profiles, artists, studios, requests, quotes, conversations,
-- messages, bookings, reviews + Founding Member logic + Row-Level Security.
-- =============================================================================

-- Extensions ----------------------------------------------------------------
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- Enums ---------------------------------------------------------------------
create type user_role        as enum ('customer', 'artist', 'studio_owner');
create type request_status   as enum ('draft', 'live', 'booked', 'closed');
create type size_category    as enum ('tiny', 'small', 'medium', 'large', 'sleeve');
create type quote_status     as enum ('pending', 'accepted', 'declined', 'withdrawn');
create type match_status     as enum ('notified', 'viewed', 'responded', 'declined');
create type id_status        as enum ('pending', 'approved', 'rejected');
create type membership_plan  as enum ('free', 'artist_pro', 'studio_pro');
create type invite_status    as enum ('pending', 'accepted', 'expired');
create type booking_status   as enum ('pending', 'confirmed', 'completed', 'cancelled');
create type image_kind       as enum ('reference');

-- =============================================================================
-- Tables
-- =============================================================================

-- One row per authenticated user (mirrors auth.users) ------------------------
create table profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  role                  user_role not null default 'customer',
  name                  text,
  email                 text,
  phone                 text,
  postcode              text,
  notification_settings jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now()
);

-- Studios (basic at launch - owner + profile; rooms/splits are later) --------
create table studios (
  id                 uuid primary key default gen_random_uuid(),
  owner_profile_id   uuid references profiles(id) on delete set null,
  name               text not null,
  slug               text unique,
  location_postcode  text,
  location_area      text,
  bio                text,
  membership_plan    membership_plan not null default 'free',
  is_founding_member boolean not null default false,
  founding_number    int,
  created_at         timestamptz not null default now()
);

-- Artists --------------------------------------------------------------------
create table artists (
  id                 uuid primary key default gen_random_uuid(),
  profile_id         uuid unique references profiles(id) on delete cascade,
  display_name       text,
  slug               text unique,
  bio                text,
  primary_style      text,
  styles             text[] not null default '{}',          -- up to 5 (enforced in app)
  studio_id          uuid references studios(id) on delete set null,
  location_postcode  text,
  location_area      text,
  travel_areas       text[] not null default '{}',
  instagram_url      text,
  tiktok_url         text,
  social_embeds      jsonb not null default '[]'::jsonb,     -- array of post URLs
  -- self-declared trust badges (verifiable later)
  insured            boolean not null default false,
  licensed           boolean not null default false,
  hygiene_certified  boolean not null default false,
  first_aid          boolean not null default false,
  id_status          id_status not null default 'pending',
  verified           boolean not null default false,         -- automated ID, later
  profile_complete   boolean not null default false,         -- gates lead responses
  response_rate      numeric,
  rating             numeric not null default 0,             -- derived from reviews
  review_count       int not null default 0,                 -- derived from reviews
  membership_plan    membership_plan not null default 'free',
  is_founding_member boolean not null default false,
  founding_number    int,
  created_at         timestamptz not null default now()
);

create table studio_members (
  studio_id  uuid not null references studios(id) on delete cascade,
  artist_id  uuid not null references artists(id) on delete cascade,
  role       text not null default 'artist',  -- artist | guest | owner
  created_at timestamptz not null default now(),
  primary key (studio_id, artist_id)
);

create table studio_invites (
  id         uuid primary key default gen_random_uuid(),
  studio_id  uuid not null references studios(id) on delete cascade,
  email      text not null,
  token      text not null unique,
  status     invite_status not null default 'pending',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

create table portfolio_images (
  id          uuid primary key default gen_random_uuid(),
  artist_id   uuid not null references artists(id) on delete cascade,
  storage_path text not null,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);

-- Customer tattoo requests ---------------------------------------------------
create table tattoo_requests (
  id                uuid primary key default gen_random_uuid(),
  customer_id       uuid not null references profiles(id) on delete cascade,
  title             text,
  note              text,
  placement_zone    text,
  placement_view    text,
  size_category     size_category,
  style             text,
  budget_min        int,
  budget_max        int,
  location_text     text,
  location_postcode text,
  location_area     text,
  status            request_status not null default 'draft',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table request_images (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references tattoo_requests(id) on delete cascade,
  storage_path text not null,
  kind        image_kind not null default 'reference',
  created_at  timestamptz not null default now()
);

-- Which artists were matched to a request (drives "matched + notified") ------
create table request_matches (
  id         uuid primary key default gen_random_uuid(),
  request_id uuid not null references tattoo_requests(id) on delete cascade,
  artist_id  uuid not null references artists(id) on delete cascade,
  matched_on text,                       -- e.g. 'style+location'
  notified_at timestamptz,
  status     match_status not null default 'notified',
  created_at timestamptz not null default now(),
  unique (request_id, artist_id)
);

-- Artist quotes (one per artist per request) ---------------------------------
create table quotes (
  id             uuid primary key default gen_random_uuid(),
  request_id     uuid not null references tattoo_requests(id) on delete cascade,
  artist_id      uuid not null references artists(id) on delete cascade,
  price_estimate int,
  price_note     text,
  message        text,
  status         quote_status not null default 'pending',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (request_id, artist_id)
);

-- One conversation per (request, artist) -------------------------------------
create table conversations (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references tattoo_requests(id) on delete cascade,
  customer_id uuid not null references profiles(id) on delete cascade,
  artist_id   uuid not null references artists(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (request_id, artist_id)
);

create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id       uuid references profiles(id) on delete set null,
  body            text not null,
  created_at      timestamptz not null default now(),
  read_at         timestamptz
);

create table bookings (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid not null references tattoo_requests(id) on delete cascade,
  artist_id    uuid not null references artists(id) on delete cascade,
  quote_id     uuid references quotes(id) on delete set null,
  scheduled_for timestamptz,
  status       booking_status not null default 'pending',
  created_at   timestamptz not null default now()
);

create table reviews (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references tattoo_requests(id) on delete cascade,
  artist_id   uuid not null references artists(id) on delete cascade,
  customer_id uuid not null references profiles(id) on delete cascade,
  rating      int not null check (rating between 1 and 5),
  title       text,
  body        text,
  artist_reply text,
  created_at  timestamptz not null default now(),
  unique (request_id, customer_id, artist_id)
);

-- Indexes -------------------------------------------------------------------
create index idx_artists_styles      on artists using gin (styles);
create index idx_artists_area        on artists (location_area);
create index idx_artists_studio      on artists (studio_id);
create index idx_requests_status     on tattoo_requests (status);
create index idx_requests_customer   on tattoo_requests (customer_id);
create index idx_matches_artist      on request_matches (artist_id);
create index idx_matches_request     on request_matches (request_id);
create index idx_quotes_request      on quotes (request_id);
create index idx_quotes_artist       on quotes (artist_id);
create index idx_messages_conv       on messages (conversation_id);
create index idx_reviews_artist      on reviews (artist_id);

-- =============================================================================
-- Helper functions (SECURITY DEFINER so RLS subqueries don't recurse)
-- =============================================================================
create or replace function public.uid_owns_request(req uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from tattoo_requests r where r.id = req and r.customer_id = auth.uid());
$$;

create or replace function public.uid_is_artist(a uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from artists ar where ar.id = a and ar.profile_id = auth.uid());
$$;

create or replace function public.uid_matched_to_request(req uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from request_matches m
    join artists ar on ar.id = m.artist_id
    where m.request_id = req and ar.profile_id = auth.uid()
  );
$$;

create or replace function public.uid_in_conversation(c uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from conversations cv
    where cv.id = c
      and (cv.customer_id = auth.uid()
           or exists (select 1 from artists ar where ar.id = cv.artist_id and ar.profile_id = auth.uid()))
  );
$$;

-- =============================================================================
-- Row-Level Security
-- =============================================================================
alter table profiles         enable row level security;
alter table studios          enable row level security;
alter table artists          enable row level security;
alter table studio_members   enable row level security;
alter table studio_invites   enable row level security;
alter table portfolio_images enable row level security;
alter table tattoo_requests  enable row level security;
alter table request_images   enable row level security;
alter table request_matches  enable row level security;
alter table quotes           enable row level security;
alter table conversations    enable row level security;
alter table messages         enable row level security;
alter table bookings         enable row level security;
alter table reviews          enable row level security;

-- profiles: private to the owner -------------------------------------------
create policy "profiles_select_own" on profiles for select using (id = auth.uid());
create policy "profiles_insert_own" on profiles for insert with check (id = auth.uid());
create policy "profiles_update_own" on profiles for update using (id = auth.uid());

-- studios: public read; owner writes ---------------------------------------
create policy "studios_select_public" on studios for select using (true);
create policy "studios_insert_owner"  on studios for insert with check (owner_profile_id = auth.uid());
create policy "studios_update_owner"  on studios for update using (owner_profile_id = auth.uid());

-- artists: complete profiles public; owner sees + manages own ---------------
create policy "artists_select_public" on artists for select using (profile_complete = true or profile_id = auth.uid());
create policy "artists_insert_own"    on artists for insert with check (profile_id = auth.uid());
create policy "artists_update_own"    on artists for update using (profile_id = auth.uid());

-- studio_members: public read; managed by studio owner ---------------------
create policy "members_select_public" on studio_members for select using (true);
create policy "members_write_owner" on studio_members for all
  using (exists (select 1 from studios s where s.id = studio_id and s.owner_profile_id = auth.uid()))
  with check (exists (select 1 from studios s where s.id = studio_id and s.owner_profile_id = auth.uid()));

-- studio_invites: visible/managed by studio owner --------------------------
create policy "invites_owner" on studio_invites for all
  using (exists (select 1 from studios s where s.id = studio_id and s.owner_profile_id = auth.uid()))
  with check (exists (select 1 from studios s where s.id = studio_id and s.owner_profile_id = auth.uid()));

-- portfolio_images: public read; artist manages own ------------------------
create policy "portfolio_select_public" on portfolio_images for select using (true);
create policy "portfolio_write_owner" on portfolio_images for all
  using (uid_is_artist(artist_id)) with check (uid_is_artist(artist_id));

-- tattoo_requests: customer owns; matched artists can read live ones --------
create policy "requests_select_customer" on tattoo_requests for select using (customer_id = auth.uid());
create policy "requests_select_matched_artist" on tattoo_requests for select
  using (status = 'live' and uid_matched_to_request(id));
create policy "requests_insert_customer" on tattoo_requests for insert with check (customer_id = auth.uid());
create policy "requests_update_customer" on tattoo_requests for update using (customer_id = auth.uid());

-- request_images: follows request visibility -------------------------------
create policy "request_images_select" on request_images for select
  using (uid_owns_request(request_id) or uid_matched_to_request(request_id));
create policy "request_images_insert_owner" on request_images for insert
  with check (uid_owns_request(request_id));

-- request_matches: artist sees own; customer sees their request's; artist updates own
create policy "matches_select" on request_matches for select
  using (uid_is_artist(artist_id) or uid_owns_request(request_id));
create policy "matches_update_artist" on request_matches for update using (uid_is_artist(artist_id));

-- quotes: request customer + quoting artist read; artist writes; customer sets status
create policy "quotes_select" on quotes for select
  using (uid_is_artist(artist_id) or uid_owns_request(request_id));
create policy "quotes_insert_artist" on quotes for insert
  with check (uid_is_artist(artist_id)
              and exists (select 1 from artists a where a.id = artist_id and a.profile_complete));
create policy "quotes_update_artist" on quotes for update using (uid_is_artist(artist_id));
create policy "quotes_update_customer" on quotes for update using (uid_owns_request(request_id));

-- conversations: participants read/create ----------------------------------
create policy "conversations_select" on conversations for select
  using (customer_id = auth.uid() or uid_is_artist(artist_id));
create policy "conversations_insert" on conversations for insert
  with check (customer_id = auth.uid() or uid_is_artist(artist_id));

-- messages: conversation participants read; sender must be a participant ----
create policy "messages_select" on messages for select using (uid_in_conversation(conversation_id));
create policy "messages_insert" on messages for insert
  with check (sender_id = auth.uid() and uid_in_conversation(conversation_id));
create policy "messages_update_participant" on messages for update using (uid_in_conversation(conversation_id));

-- bookings: customer + artist read; customer creates; either updates --------
create policy "bookings_select" on bookings for select
  using (uid_owns_request(request_id) or uid_is_artist(artist_id));
create policy "bookings_insert_customer" on bookings for insert with check (uid_owns_request(request_id));
create policy "bookings_update" on bookings for update
  using (uid_owns_request(request_id) or uid_is_artist(artist_id));

-- reviews: public read; reviewing customer writes; artist may reply ---------
create policy "reviews_select_public" on reviews for select using (true);
create policy "reviews_insert_customer" on reviews for insert
  with check (customer_id = auth.uid() and uid_owns_request(request_id));
create policy "reviews_update_customer" on reviews for update using (customer_id = auth.uid());
create policy "reviews_update_artist_reply" on reviews for update using (uid_is_artist(artist_id));

-- =============================================================================
-- Triggers & automation
-- =============================================================================

-- Create a profile row automatically when a user signs up -------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, name, email, phone)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'customer'),
    new.raw_user_meta_data->>'name',
    new.email,
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Founding Member assignment: first 100 of each type, or until 31 Dec 2026 ---
create or replace function public.assign_artist_founding()
returns trigger language plpgsql as $$
declare n int;
begin
  perform pg_advisory_xact_lock(hashtext('founding_artist'));
  select count(*) into n from artists where is_founding_member;
  if n < 100 and now() < timestamptz '2027-01-01 00:00:00+00' then
    new.is_founding_member := true;
    new.founding_number := n + 1;
  end if;
  return new;
end;
$$;
create trigger trg_artist_founding before insert on artists
  for each row execute function public.assign_artist_founding();

create or replace function public.assign_studio_founding()
returns trigger language plpgsql as $$
declare n int;
begin
  perform pg_advisory_xact_lock(hashtext('founding_studio'));
  select count(*) into n from studios where is_founding_member;
  if n < 100 and now() < timestamptz '2027-01-01 00:00:00+00' then
    new.is_founding_member := true;
    new.founding_number := n + 1;
  end if;
  return new;
end;
$$;
create trigger trg_studio_founding before insert on studios
  for each row execute function public.assign_studio_founding();

-- Keep artists.rating / review_count in sync with reviews -------------------
create or replace function public.recompute_artist_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare aid uuid;
begin
  aid := coalesce(new.artist_id, old.artist_id);
  update artists set
    rating = coalesce((select round(avg(rating)::numeric, 2) from reviews where artist_id = aid), 0),
    review_count = (select count(*) from reviews where artist_id = aid)
  where id = aid;
  return null;
end;
$$;
create trigger trg_reviews_rating after insert or update or delete on reviews
  for each row execute function public.recompute_artist_rating();

-- Generic updated_at bump ---------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger trg_requests_updated before update on tattoo_requests
  for each row execute function public.set_updated_at();
create trigger trg_quotes_updated before update on quotes
  for each row execute function public.set_updated_at();


-- ============================================================
-- 0002_storage.sql
-- ============================================================
-- =============================================================================
-- Storage buckets + policies
--   portfolio       - public read (artist portfolios shown on profiles)
--   request-images  - private (customer reference uploads; served via signed
--                     URLs from the server)
-- Path convention: portfolio/{artist_id}/...  and  request-images/{request_id}/...
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('portfolio', 'portfolio', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('request-images', 'request-images', false)
on conflict (id) do nothing;

-- Portfolio: anyone can read; authenticated users upload/manage their own ----
create policy "portfolio_public_read" on storage.objects
  for select using (bucket_id = 'portfolio');

create policy "portfolio_auth_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'portfolio');

create policy "portfolio_owner_update" on storage.objects
  for update to authenticated using (bucket_id = 'portfolio' and owner = auth.uid());

create policy "portfolio_owner_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'portfolio' and owner = auth.uid());

-- Request images: private. Customers upload; owner reads. Matched artists are
-- served signed URLs generated server-side (service role), so no broad read
-- policy is exposed here.
create policy "request_images_auth_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'request-images');

create policy "request_images_owner_read" on storage.objects
  for select to authenticated using (bucket_id = 'request-images' and owner = auth.uid());

create policy "request_images_owner_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'request-images' and owner = auth.uid());


-- ============================================================
-- 0003_realtime.sql
-- ============================================================
-- Enable Supabase Realtime for the messages table so chat updates live.
-- Run once in the Supabase SQL editor.
alter publication supabase_realtime add table messages;


-- ============================================================
-- 0004_business_name.sql
-- ============================================================
-- Solo artists can trade under a business/brand name (separate from their
-- personal name). For artists in a studio, the studio name is the business.
-- Run once in the Supabase SQL editor.
alter table artists add column if not exists business_name text;


-- ============================================================
-- 0005_geo.sql
-- ============================================================
-- =============================================================================
-- Geo: coordinates + travel radius for distance-based matching
--   tattoo_requests: where the customer is + how far they'll travel
--   artists:         studio coordinates (geocoded from location_postcode)
-- Coordinates are geocoded from postcode/town via postcodes.io (free).
-- =============================================================================

alter table tattoo_requests
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists travel_radius_miles integer default 15;

alter table artists
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;


-- ============================================================
-- 0006_address.sql
-- ============================================================
-- =============================================================================
-- Full street address for the booking-reveal model.
--   Public profiles show only town + outward postcode (e.g. "Shoreditch, E1").
--   The full street address + postcode is revealed to the customer only once
--   they accept a quote / book the artist (handled in app code, not RLS).
-- =============================================================================

alter table studios add column if not exists address_line text;
alter table artists add column if not exists address_line text;


-- ============================================================
-- 0007_featured_availability_expiry.sql
-- ============================================================
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


-- ============================================================
-- 0008_studio_geo.sql
-- ============================================================
-- =============================================================================
-- Studio coordinates, so the directory can match studios by distance (radius)
-- the same way it matches artists. Geocoded from postcode/town via postcodes.io.
-- =============================================================================

alter table studios
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;


-- ============================================================
-- 0009_chat_images.sql
-- ============================================================
-- =============================================================================
-- Chat image attachments. Customers and artists can share images in the chat.
-- Stored in a public bucket with unguessable UUID paths (design references -
-- low sensitivity; public URLs keep realtime delivery simple).
-- =============================================================================

alter table messages add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', true)
on conflict (id) do nothing;

create policy "chat_images_public_read" on storage.objects
  for select using (bucket_id = 'chat-images');

create policy "chat_images_auth_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'chat-images');


-- ============================================================
-- 0010_profile_request_defaults.sql
-- ============================================================
-- =============================================================================
-- Personal "tattoo request" defaults on every profile. Lets the request wizard
-- pre-fill the customer's location + travel radius (so artists & studios - who
-- can also request tattoos - don't retype their address every time, and any
-- customer's next request is one tap). Distinct from an artist's public studio
-- address: this is where THEY want a tattoo, and is editable.
-- =============================================================================

alter table profiles add column if not exists request_postcode text;
alter table profiles add column if not exists request_area text;
alter table profiles add column if not exists request_lat double precision;
alter table profiles add column if not exists request_lng double precision;
alter table profiles add column if not exists request_radius int;


-- ============================================================
-- 0011_saved_artists.sql
-- ============================================================
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


-- ============================================================
-- 0012_reports_moderation.sql
-- ============================================================
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


-- ============================================================
-- 0013_admin.sql
-- ============================================================
-- =============================================================================
-- Admin access flag. Flip `is_admin = true` for any account to grant them the
-- /admin panel (reports moderation, signups, leads, stats, exports). Toggle it
-- off to revoke - no redeploy needed.
-- =============================================================================

alter table profiles add column if not exists is_admin boolean not null default false;


-- ============================================================
-- 0014_admin_moderation.sql
-- ============================================================
-- =============================================================================
-- Admin moderation flags.
--   profiles.suspended       - reversible "ban": blocks login + actions.
--   tattoo_requests.removed  - reversible soft-delete for spam/abuse, hidden
--                              from artists' leads but recoverable.
-- =============================================================================

alter table profiles add column if not exists suspended boolean not null default false;
alter table tattoo_requests add column if not exists removed boolean not null default false;

create index if not exists idx_requests_removed on tattoo_requests (removed);


-- ============================================================
-- 0015_admin_audit.sql
-- ============================================================
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


-- ============================================================
-- 0016_artist_verification.sql
-- ============================================================
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


-- ============================================================
-- 0017_connections.sql
-- ============================================================
-- =============================================================================
-- 0017: "Connections" model.
-- Rename bookings -> connections. A connection = a contact reveal / lead event
-- (many per request). "Booked" (the single chosen artist) moves onto the request
-- as `booked_artist_id`. Reviews open to anyone who MESSAGED the artist. The
-- old per-row booking status/scheduled_for are dropped (vestigial). PAYG-ready
-- fields (initiated_by / paid / amount / payment_ref) added but unused for now.
-- =============================================================================

-- 1. Rename the table + its constraints for clarity (policies follow the table).
alter table bookings rename to connections;
alter table connections rename constraint bookings_pkey to connections_pkey;
alter table connections rename constraint bookings_request_id_fkey to connections_request_id_fkey;
alter table connections rename constraint bookings_artist_id_fkey to connections_artist_id_fkey;
alter table connections rename constraint bookings_quote_id_fkey to connections_quote_id_fkey;

-- 2. A connection has no pending/confirmed lifecycle; drop the vestigial columns.
alter table connections drop column if exists status;
alter table connections drop column if exists scheduled_for;

-- 3. Reveal/event + PAYG-ready fields; one connection per (request, artist).
alter table connections add column if not exists initiated_by text not null default 'customer'
  check (initiated_by in ('customer','artist'));
alter table connections add column if not exists revealed_at timestamptz not null default now();
alter table connections add column if not exists paid boolean not null default false;
alter table connections add column if not exists amount numeric;
alter table connections add column if not exists payment_ref text;
alter table connections add constraint connections_request_artist_unique unique (request_id, artist_id);
comment on table connections is 'A contact reveal between a customer and an artist on a request (the lead event). Many per request. PAYG-ready via paid/amount/payment_ref.';

-- 4. "Booked" = the single chosen artist, recorded on the request (optional).
alter table tattoo_requests add column if not exists booked_artist_id uuid references artists(id) on delete set null;
alter table tattoo_requests add column if not exists closed_reason text;
alter table tattoo_requests add column if not exists closed_note text;

-- 5. Backfill: existing bookings were exclusive hires.
update tattoo_requests r set booked_artist_id = c.artist_id
  from connections c where c.request_id = r.id and r.status = 'booked';

-- 6. Reviews: anyone who MESSAGED the artist on their own request may review.
drop policy if exists "reviews_insert_customer" on reviews;
create policy "reviews_insert_customer" on reviews for insert with check (
  customer_id = auth.uid() and uid_owns_request(request_id)
  and exists (
    select 1 from conversations cv
    join messages m on m.conversation_id = cv.id
    where cv.request_id = reviews.request_id
      and cv.artist_id = reviews.artist_id
      and m.sender_id = auth.uid()
  )
);

-- 7. Close a pre-existing rating-tampering hole: the old artist update policy let
--    an artist UPDATE any column on their reviews (incl. the customer's rating).
--    Artist replies are now written server-side (service role, artist_reply only).
drop policy if exists "reviews_update_artist_reply" on reviews;

-- 8. Atomic "confirm booked" (booking + quote accept + request status in one txn).
create or replace function public.confirm_booked(p_request uuid, p_artist uuid, p_quote uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not uid_owns_request(p_request) then
    raise exception 'not authorised';
  end if;
  insert into connections (request_id, artist_id, quote_id, initiated_by, revealed_at)
    values (p_request, p_artist, p_quote, 'customer', now())
    on conflict (request_id, artist_id) do nothing;
  update tattoo_requests set booked_artist_id = p_artist, status = 'booked' where id = p_request;
  if p_quote is not null then
    update quotes set status = 'accepted' where id = p_quote;
  end if;
end $$;


-- ============================================================
-- 0018_notifications.sql
-- ============================================================
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


-- ============================================================
-- 0019_booked_by.sql
-- ============================================================
-- 0019: record who marked a request as booked, so the customer's status banner
-- can read correctly ("you booked X" vs "X marked this as booked").
alter table public.tattoo_requests add column if not exists booked_by text; -- 'customer' | 'artist'


-- ============================================================
-- 0020_target_artist.sql
-- ============================================================
-- 0020: direct-to-artist requests. A customer can request a quote FROM a specific
-- artist (from their profile / the directory / saved list). The request is targeted
-- to that artist (optionally also broadcast to other matching artists).
alter table public.tattoo_requests
  add column if not exists target_artist_id uuid references public.artists(id) on delete set null;


-- ============================================================
-- 0021_artist_last_active.sql
-- ============================================================
-- Artist responsiveness signal: when the artist was last active on the platform.
-- Updated when they view their leads or send a quote. Surfaced on the directory
-- and profile as a coarse "Active today / this week" badge.
alter table public.artists
  add column if not exists last_active timestamptz;

create index if not exists artists_last_active_idx
  on public.artists (last_active desc);


-- ============================================================
-- 0022_review_images.sql
-- ============================================================
-- =============================================================================
-- Photos in reviews. Customers can attach a few photos of their healed tattoo
-- to a review. Stored in a public bucket with unguessable UUID paths (low
-- sensitivity, already shown publicly on the artist's profile). URLs are kept on
-- the review row itself (small, fixed cap) - no separate table needed.
-- =============================================================================

alter table public.reviews
  add column if not exists image_urls text[];

insert into storage.buckets (id, name, public)
values ('review-images', 'review-images', true)
on conflict (id) do nothing;

create policy "review_images_public_read" on storage.objects
  for select using (bucket_id = 'review-images');

create policy "review_images_auth_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'review-images');


-- ============================================================
-- 0023_suspended_message_block.sql
-- ============================================================
-- =============================================================================
-- Block suspended users from sending chat messages. Server actions already
-- re-check suspension, but chat messages are a client-side insert governed only
-- by RLS - so a suspended user could keep messaging until their token expires.
-- This adds a suspended check to the messages INSERT policy. Reads are
-- unaffected (they can still see their existing conversations).
-- profiles.suspended exists from migration 0014.
-- =============================================================================

drop policy if exists "messages_insert" on messages;
create policy "messages_insert" on messages for insert
  with check (
    sender_id = auth.uid()
    and uid_in_conversation(conversation_id)
    and not exists (select 1 from profiles where id = auth.uid() and suspended = true)
  );


-- ============================================================
-- 0024_publish_on_verify.sql
-- ============================================================
-- Guest-first request flow: a guest who creates an account at submit (with email
-- confirmation on) gets their request saved as a draft, flagged to auto-publish
-- when they confirm their email (handled in /auth/confirm). The flag also marks
-- abandoned/never-confirmed guest drafts for cleanup by the daily cron.
alter table public.tattoo_requests
  add column if not exists publish_on_verify boolean not null default false;

create index if not exists tattoo_requests_publish_on_verify_idx
  on public.tattoo_requests (created_at)
  where publish_on_verify;

