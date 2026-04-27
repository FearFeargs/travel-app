-- Public images bucket (trip covers, avatars, profile backgrounds)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'images', 'images', true,
  5242880,  -- 5 MB
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do nothing;

-- Any authenticated user can upload
create policy "images: authenticated upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'images');

-- Public read for all
create policy "images: public read"
  on storage.objects for select
  using (bucket_id = 'images');

-- Authenticated users can overwrite and delete (upsert pattern)
create policy "images: authenticated update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'images');

create policy "images: authenticated delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'images');

-- Profile cover background (separate from avatar)
alter table public.users add column if not exists profile_cover_url text;
