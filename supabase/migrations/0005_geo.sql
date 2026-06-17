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
