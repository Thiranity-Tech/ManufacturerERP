-- Run after schema.sql. This enforces the 30-day trial/subscription on the server.
-- An expired organization cannot read or write ERP data, even from a copied EXE.

create table if not exists public.organization_subscriptions (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  status text not null default 'trial' check (status in ('trial', 'active', 'suspended', 'expired')),
  trial_ends_at timestamptz,
  access_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Give organizations created before this migration a 30-day trial from migration time.
insert into public.organization_subscriptions (organization_id, status, trial_ends_at)
select id, 'trial', now() + interval '30 days' from public.organizations
on conflict (organization_id) do nothing;

create or replace function public.has_active_organization_access(target_organization_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.organization_subscriptions s where s.organization_id = target_organization_id and ((s.status = 'trial' and s.trial_ends_at > now()) or (s.status = 'active' and (s.access_ends_at is null or s.access_ends_at > now()))));
$$;

create or replace function public.is_active_organization_member(target_organization_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.organization_members m where m.organization_id = target_organization_id and m.user_id = (select auth.uid())) and public.has_active_organization_access(target_organization_id);
$$;

-- Existing RLS policies already call this function; replacing it makes all ERP tables subscription-aware.
create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select public.is_active_organization_member(target_organization_id);
$$;

create or replace function public.ensure_current_user_workspace()
returns uuid language plpgsql security definer set search_path = public as $$
declare workspace_id uuid; workspace_name text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select organization_id into workspace_id from public.organization_members where user_id = auth.uid() limit 1;
  if workspace_id is not null then return workspace_id; end if;
  select coalesce(raw_user_meta_data ->> 'company_name', 'My manufacturing workspace') into workspace_name from auth.users where id = auth.uid();
  insert into public.organizations (name, created_by) values (workspace_name, auth.uid()) returning id into workspace_id;
  insert into public.organization_members (organization_id, user_id, role) values (workspace_id, auth.uid(), 'owner');
  insert into public.organization_subscriptions (organization_id, status, trial_ends_at) values (workspace_id, 'trial', now() + interval '30 days');
  return workspace_id;
end;
$$;

create or replace function public.get_current_workspace_access()
returns table (organization_id uuid, organization_name text, role text, subscription_status text, access_ends_at timestamptz)
language sql security definer set search_path = public stable as $$
  select m.organization_id, o.name, case when m.role = 'owner' then 'superadmin' else m.role end, s.status, coalesce(s.access_ends_at, s.trial_ends_at)
  from public.organization_members m join public.organizations o on o.id = m.organization_id join public.organization_subscriptions s on s.organization_id = m.organization_id
  where m.user_id = (select auth.uid()) limit 1;
$$;

alter table public.organization_subscriptions enable row level security;
revoke all on public.organization_subscriptions from anon, authenticated;
grant execute on function public.get_current_workspace_access() to authenticated;

-- Subscription administration, run in Supabase SQL Editor with the exact organization UUID:
-- Grant/renew one month: update public.organization_subscriptions set status = 'active', access_ends_at = now() + interval '30 days', updated_at = now() where organization_id = 'ORG_UUID';
-- Stop access: update public.organization_subscriptions set status = 'suspended', updated_at = now() where organization_id = 'ORG_UUID';
