-- Run this once in the Supabase SQL Editor after jobs-and-bom.sql.
-- Every BOM material creates a purchase request. A manager fulfils it by
-- creating the Purchase Order, which then adds the material to inventory.

create table if not exists public.bom_purchase_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  material_name text not null,
  planned_quantity numeric not null check (planned_quantity > 0),
  unit text not null,
  status text not null default 'pending' check (status in ('pending', 'purchased', 'cancelled')),
  purchased_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists bom_purchase_requests_organization_status_idx
  on public.bom_purchase_requests (organization_id, status, created_at desc);

alter table public.bom_purchase_requests enable row level security;
revoke all on public.bom_purchase_requests from anon;
grant select, insert, update, delete on public.bom_purchase_requests to authenticated;

drop policy if exists "Members manage BOM purchase requests" on public.bom_purchase_requests;
create policy "Members manage BOM purchase requests"
on public.bom_purchase_requests for all to authenticated
using ((select public.is_organization_member(organization_id)))
with check ((select public.is_organization_member(organization_id)));

create or replace function public.add_job_bom_material(
  target_job_id uuid,
  material text,
  material_quantity numeric,
  material_unit text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  workspace uuid;
  request_id uuid;
begin
  select organization_id into workspace
  from public.organization_members
  where user_id = auth.uid()
  limit 1;

  if workspace is null then
    raise exception 'Workspace not found';
  end if;
  if not exists (
    select 1 from public.jobs
    where id = target_job_id and organization_id = workspace
  ) then
    raise exception 'Job not found';
  end if;
  if nullif(trim(material), '') is null or material_quantity <= 0 or nullif(trim(material_unit), '') is null then
    raise exception 'Enter a material, quantity, and unit';
  end if;

  insert into public.job_bom_items (
    organization_id, job_id, raw_material_id, material_name, planned_quantity, unit
  )
  values (
    workspace, target_job_id, null, trim(material), material_quantity, trim(material_unit)
  );

  insert into public.bom_purchase_requests (
    organization_id, job_id, material_name, planned_quantity, unit
  )
  values (
    workspace, target_job_id, trim(material), material_quantity, trim(material_unit)
  )
  returning id into request_id;

  return request_id;
end;
$$;

grant execute on function public.add_job_bom_material(uuid, text, numeric, text) to authenticated;
