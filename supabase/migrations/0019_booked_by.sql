-- 0019: record who marked a request as booked, so the customer's status banner
-- can read correctly ("you booked X" vs "X marked this as booked").
alter table public.tattoo_requests add column if not exists booked_by text; -- 'customer' | 'artist'
