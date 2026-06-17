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
