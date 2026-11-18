-- Run this once in the Supabase SQL Editor after jobs-and-bom.sql.
-- Adds a design image to jobs and creates its image-upload bucket.

alter table public.jobs
  add column if not exists design_image_url text;

alter table public.jobs
  add column if not exists design_image_urls jsonb not null default '[]'::jsonb;

-- Preserve images already stored by the earlier single-image version.
update public.jobs
set design_image_urls = jsonb_build_array(design_image_url)
where design_image_url is not null
  and coalesce(jsonb_array_length(design_image_urls), 0) = 0;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'job-designs',
  'job-designs',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Workspace members upload job designs" on storage.objects;
drop policy if exists "Workspace members update job designs" on storage.objects;
drop policy if exists "Workspace members delete job designs" on storage.objects;

create policy "Workspace members upload job designs"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'job-designs'
  and split_part(name, '/', 1) in (
    select organization_id::text from public.organization_members where user_id = auth.uid()
  )
);

create policy "Workspace members update job designs"
on storage.objects for update to authenticated
using (
  bucket_id = 'job-designs'
  and split_part(name, '/', 1) in (
    select organization_id::text from public.organization_members where user_id = auth.uid()
  )
);

create policy "Workspace members delete job designs"
on storage.objects for delete to authenticated
using (
  bucket_id = 'job-designs'
  and split_part(name, '/', 1) in (
    select organization_id::text from public.organization_members where user_id = auth.uid()
  )
);
