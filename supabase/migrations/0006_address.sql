-- =============================================================================
-- Full street address for the booking-reveal model.
--   Public profiles show only town + outward postcode (e.g. "Shoreditch, E1").
--   The full street address + postcode is revealed to the customer only once
--   they accept a quote / book the artist (handled in app code, not RLS).
-- =============================================================================

alter table studios add column if not exists address_line text;
alter table artists add column if not exists address_line text;
