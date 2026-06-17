-- =============================================================================
-- Chat image attachments. Customers and artists can share images in the chat.
-- Stored in a public bucket with unguessable UUID paths (design references -
-- low sensitivity; public URLs keep realtime delivery simple).
-- =============================================================================

alter table messages add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', true)
on conflict (id) do nothing;

create policy "chat_images_public_read" on storage.objects
  for select using (bucket_id = 'chat-images');

create policy "chat_images_auth_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'chat-images');
