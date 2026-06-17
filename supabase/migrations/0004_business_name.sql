-- Solo artists can trade under a business/brand name (separate from their
-- personal name). For artists in a studio, the studio name is the business.
-- Run once in the Supabase SQL editor.
alter table artists add column if not exists business_name text;
