-- Run after subscriptions.sql.
-- Bootstrap yourself once by replacing YOUR_LOGIN_EMAIL before running the last statement.

create table if not exists public.platform_administrators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.platform_administrators enable row level security;
revoke all on public.platform_administrators from anon, authenticated;

create or replace function public.is_platform_administrator()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.platform_administrators where user_id = (select auth.uid()));
$$;

create or replace function public.get_platform_customers()
returns table (organization_id uuid, organization_name text, owner_email text, status text, access_ends_at timestamptz, support_email text, support_phone text, last_renewed_at timestamptz)
language sql security definer set search_path = public stable as $$
  select o.id, o.name, u.email, s.status, coalesce(s.access_ends_at, s.trial_ends_at), s.support_email, s.support_phone, s.last_renewed_at
  from public.organizations o
  join public.organization_subscriptions s on s.organization_id = o.id
  join auth.users u on u.id = o.created_by
  where public.is_platform_administrator()
  order by o.created_at desc;
$$;

create or replace function public.set_customer_subscription(target_organization_id uuid, access_days integer, contact_email text default null, contact_phone text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_administrator() then raise exception 'Platform administrator access required'; end if;
  if access_days < 1 or access_days > 3650 then raise exception 'Access duration must be between 1 and 3650 days'; end if;
  update public.organization_subscriptions
  set status = 'active', access_ends_at = now() + make_interval(days => access_days),
      support_email = coalesce(contact_email, support_email), support_phone = coalesce(contact_phone, support_phone),
      last_renewed_at = now(), updated_at = now()
  where organization_id = target_organization_id;
  if not found then raise exception 'Customer workspace was not found'; end if;
end;
$$;

create or replace function public.suspend_customer_subscription(target_organization_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_administrator() then raise exception 'Platform administrator access required'; end if;
  update public.organization_subscriptions set status = 'suspended', updated_at = now() where organization_id = target_organization_id;
end;
$$;

create or replace function public.get_platform_access_events()
returns table (occurred_at timestamptz, organization_name text, user_email text, event_type text, subscription_status text)
language sql security definer set search_path = public stable as $$
  select e.occurred_at, o.name, u.email, e.event_type, e.subscription_status
  from public.organization_access_events e
  join public.organizations o on o.id = e.organization_id
  join auth.users u on u.id = e.user_id
  where public.is_platform_administrator()
  order by e.occurred_at desc limit 100;
$$;

revoke all on function public.is_platform_administrator(), public.get_platform_customers(), public.set_customer_subscription(uuid, integer, text, text), public.suspend_customer_subscription(uuid), public.get_platform_access_events() from public;
grant execute on function public.is_platform_administrator(), public.get_platform_customers(), public.set_customer_subscription(uuid, integer, text, text), public.suspend_customer_subscription(uuid), public.get_platform_access_events() to authenticated;

-- Bootstrap: run this after you have created your own ERP account.
-- insert into public.platform_administrators (user_id)
-- select id from auth.users where email = 'YOUR_LOGIN_EMAIL';
