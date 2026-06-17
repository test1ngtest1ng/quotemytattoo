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
