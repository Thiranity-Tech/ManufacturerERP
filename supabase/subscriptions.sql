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

alter table public.organization_subscriptions add column if not exists support_email text;
alter table public.organization_subscriptions add column if not exists support_phone text;
alter table public.organization_subscriptions add column if not exists last_renewed_at timestamptz;

create table if not exists public.organization_access_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('desktop_open', 'web_open', 'access_blocked')),
  subscription_status text not null,
  occurred_at timestamptz not null default now()
);
create index if not exists organization_access_events_org_time_idx on public.organization_access_events (organization_id, occurred_at desc);

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

drop function if exists public.get_current_workspace_access();
create function public.get_current_workspace_access()
returns table (organization_id uuid, organization_name text, role text, subscription_status text, access_ends_at timestamptz, support_email text, support_phone text)
language plpgsql security definer set search_path = public as $$
declare access_row record;
begin
  select m.organization_id, o.name as organization_name, case when m.role = 'owner' then 'superadmin' else m.role end as member_role, s.status, coalesce(s.access_ends_at, s.trial_ends_at) as ends_at, s.support_email, s.support_phone
  into access_row
  from public.organization_members m join public.organizations o on o.id = m.organization_id join public.organization_subscriptions s on s.organization_id = m.organization_id
  where m.user_id = auth.uid() limit 1;
  if access_row.organization_id is null then return; end if;
  insert into public.organization_access_events (organization_id, user_id, event_type, subscription_status)
  values (access_row.organization_id, auth.uid(), case when public.has_active_organization_access(access_row.organization_id) then 'desktop_open' else 'access_blocked' end, access_row.status);
  return query select access_row.organization_id, access_row.organization_name, access_row.member_role, access_row.status, access_row.ends_at, access_row.support_email, access_row.support_phone;
end;
$$;

alter table public.organization_subscriptions enable row level security;
alter table public.organization_access_events enable row level security;
revoke all on public.organization_subscriptions from anon, authenticated;
revoke all on public.organization_access_events from anon, authenticated;
grant execute on function public.get_current_workspace_access() to authenticated;

-- Subscription administration, run in Supabase SQL Editor with the exact organization UUID:
-- Grant/renew one month: update public.organization_subscriptions set status = 'active', access_ends_at = now() + interval '30 days', last_renewed_at = now(), updated_at = now() where organization_id = 'ORG_UUID';
-- Stop access: update public.organization_subscriptions set status = 'suspended', updated_at = now() where organization_id = 'ORG_UUID';

-- Configure how a blocked customer contacts you:
-- update public.organization_subscriptions set support_email = 'you@yourcompany.com', support_phone = '+91XXXXXXXXXX' where organization_id = 'ORG_UUID';

-- See every workspace/user that opened the EXE (run in SQL Editor):
-- select e.occurred_at, o.name as company, u.email as user_email, e.event_type, e.subscription_status
-- from public.organization_access_events e join public.organizations o on o.id = e.organization_id join auth.users u on u.id = e.user_id order by e.occurred_at desc;
