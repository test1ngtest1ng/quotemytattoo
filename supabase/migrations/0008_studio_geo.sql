-- =============================================================================
-- Studio coordinates, so the directory can match studios by distance (radius)
-- the same way it matches artists. Geocoded from postcode/town via postcodes.io.
-- =============================================================================

alter table studios
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;
