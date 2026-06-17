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
