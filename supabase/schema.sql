-- Run this once in Supabase Dashboard > SQL Editor.
-- This schema gives every company a separate workspace protected by Row Level Security.

create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'manager', 'member')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = (select auth.uid())
  );
$$;

create or replace function public.ensure_current_user_workspace()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  workspace_id uuid;
  workspace_name text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select organization_id into workspace_id
  from public.organization_members
  where user_id = auth.uid()
  limit 1;

  if workspace_id is not null then
    return workspace_id;
  end if;

  select coalesce(raw_user_meta_data ->> 'company_name', 'My manufacturing workspace')
  into workspace_name
  from auth.users
  where id = auth.uid();

  insert into public.organizations (name, created_by)
  values (workspace_name, auth.uid())
  returning id into workspace_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (workspace_id, auth.uid(), 'owner');

  return workspace_id;
end;
$$;

revoke all on function public.is_organization_member(uuid) from public;
grant execute on function public.ensure_current_user_workspace() to authenticated;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

revoke all on public.organizations, public.organization_members from anon;
grant select on public.organizations, public.organization_members to authenticated;

create policy "Members can view their organization" on public.organizations
  for select to authenticated
  using ((select public.is_organization_member(id)));

create policy "Members can view organization members" on public.organization_members
  for select to authenticated
  using ((select public.is_organization_member(organization_id)));

-- Core ERP entities. All future rows must belong to one organization.
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  sku text,
  stock numeric not null default 0 check (stock >= 0),
  price numeric not null default 0 check (price >= 0),
  created_at timestamptz not null default now(),
  unique (organization_id, sku)
);

create table if not exists public.raw_materials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  sku text,
  stock numeric not null default 0 check (stock >= 0),
  unit text not null default 'Units',
  cost numeric not null default 0 check (cost >= 0),
  created_at timestamptz not null default now(),
  unique (organization_id, sku)
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_name text not null,
  invoice_number text,
  subtotal numeric not null default 0,
  gst_amount numeric not null default 0,
  grand_total numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (organization_id, invoice_number)
);

create index if not exists products_organization_id_idx on public.products (organization_id);
create index if not exists raw_materials_organization_id_idx on public.raw_materials (organization_id);
create index if not exists sales_organization_id_idx on public.sales (organization_id);

alter table public.products enable row level security;
alter table public.raw_materials enable row level security;
alter table public.sales enable row level security;

revoke all on public.products, public.raw_materials, public.sales from anon;
grant select, insert, update, delete on public.products, public.raw_materials, public.sales to authenticated;

create policy "Members manage products" on public.products for all to authenticated
  using ((select public.is_organization_member(organization_id)))
  with check ((select public.is_organization_member(organization_id)));
create policy "Members manage raw materials" on public.raw_materials for all to authenticated
  using ((select public.is_organization_member(organization_id)))
  with check ((select public.is_organization_member(organization_id)));
create policy "Members manage sales" on public.sales for all to authenticated
  using ((select public.is_organization_member(organization_id)))
  with check ((select public.is_organization_member(organization_id)));
