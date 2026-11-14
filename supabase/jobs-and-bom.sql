-- Run after workflow-controls.sql.
-- A job stores design requirements and its BOM; it does not change stock.

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  job_name text not null,
  project_name text,
  customer_name text,
  design_requirements text,
  height numeric,
  breadth numeric,
  length numeric,
  sheet_count numeric,
  status text not null default 'planned' check (status in ('planned', 'in_progress', 'completed')),
  created_at timestamptz not null default now()
);
create table if not exists public.job_bom_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  raw_material_id uuid references public.raw_materials(id) on delete set null,
  material_name text not null,
  planned_quantity numeric not null check (planned_quantity > 0),
  unit text,
  vendor_reference text,
  created_at timestamptz not null default now()
);
alter table public.jobs enable row level security;
alter table public.job_bom_items enable row level security;
revoke all on public.jobs, public.job_bom_items from anon;
grant select, insert, update, delete on public.jobs, public.job_bom_items to authenticated;
drop policy if exists "Members manage jobs" on public.jobs;
drop policy if exists "Members manage job bom" on public.job_bom_items;
create policy "Members manage jobs" on public.jobs for all to authenticated using ((select public.is_organization_member(organization_id))) with check ((select public.is_organization_member(organization_id)));
create policy "Members manage job bom" on public.job_bom_items for all to authenticated using ((select public.is_organization_member(organization_id))) with check ((select public.is_organization_member(organization_id)));
