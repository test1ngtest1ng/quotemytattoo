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
