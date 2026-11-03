-- Run after inventory-flow.sql.
-- Expense history with timestamp, employee directory, and attendance records.

alter table public.expenses add column if not exists recorded_at timestamptz not null default now();

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null,
  email text not null,
  department text,
  role text not null default 'employee' check (role in ('superadmin', 'admin', 'manager', 'employee')),
  login_status text not null default 'pending' check (login_status in ('pending', 'active', 'disabled')),
  created_at timestamptz not null default now(),
  unique (organization_id, email)
);

alter table public.employees enable row level security;
revoke all on public.employees from anon;
grant select, insert, update, delete on public.employees to authenticated;
drop policy if exists "Members manage employees" on public.employees;
create policy "Members manage employees" on public.employees for all to authenticated using ((select public.is_organization_member(organization_id))) with check ((select public.is_organization_member(organization_id)));
