-- Run this after schema.sql in Supabase SQL Editor.
-- It adds the remaining ERP module tables and uses the same organization RLS rule.

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier_name text not null,
  purchase_order_number text,
  status text not null default 'draft' check (status in ('draft', 'approved', 'received', 'cancelled')),
  total_amount numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (organization_id, purchase_order_number)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category text not null,
  description text,
  amount numeric not null check (amount >= 0),
  expense_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.process_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  name text not null,
  material_fetch_mode text not null check (material_fetch_mode in ('automatic', 'manual')),
  created_at timestamptz not null default now()
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_name text not null,
  attendance_date date not null default current_date,
  status text not null check (status in ('present', 'absent', 'leave')),
  created_at timestamptz not null default now(),
  unique (organization_id, employee_name, attendance_date)
);

alter table public.purchase_orders enable row level security;
alter table public.expenses enable row level security;
alter table public.process_definitions enable row level security;
alter table public.attendance enable row level security;

revoke all on public.purchase_orders, public.expenses, public.process_definitions, public.attendance from anon;
grant select, insert, update, delete on public.purchase_orders, public.expenses, public.process_definitions, public.attendance to authenticated;

drop policy if exists "Members manage purchase orders" on public.purchase_orders;
drop policy if exists "Members manage expenses" on public.expenses;
drop policy if exists "Members manage process definitions" on public.process_definitions;
drop policy if exists "Members manage attendance" on public.attendance;

create policy "Members manage purchase orders" on public.purchase_orders for all to authenticated using ((select public.is_organization_member(organization_id))) with check ((select public.is_organization_member(organization_id)));
create policy "Members manage expenses" on public.expenses for all to authenticated using ((select public.is_organization_member(organization_id))) with check ((select public.is_organization_member(organization_id)));
create policy "Members manage process definitions" on public.process_definitions for all to authenticated using ((select public.is_organization_member(organization_id))) with check ((select public.is_organization_member(organization_id)));
create policy "Members manage attendance" on public.attendance for all to authenticated using ((select public.is_organization_member(organization_id))) with check ((select public.is_organization_member(organization_id)));
