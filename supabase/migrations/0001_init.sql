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
