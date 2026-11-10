-- Run after platform-admin.sql. Keeps the provider's own workspace out of the customer list
-- and prevents the Platform Administrator's own membership from expiring.

create or replace function public.has_active_organization_access(target_organization_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select public.is_platform_administrator()
      or exists (
        select 1 from public.organization_subscriptions s
        where s.organization_id = target_organization_id
          and (
            (s.status = 'trial' and s.trial_ends_at > now())
            or (s.status = 'active' and (s.access_ends_at is null or s.access_ends_at > now()))
          )
      );
$$;

create or replace function public.get_platform_customers()
returns table (organization_id uuid, organization_name text, owner_email text, status text, access_ends_at timestamptz, support_email text, support_phone text, last_renewed_at timestamptz)
language sql security definer set search_path = public stable as $$
  select o.id, o.name, u.email, s.status,
         coalesce(s.access_ends_at, s.trial_ends_at),
         s.support_email, s.support_phone, s.last_renewed_at
  from public.organizations o
  join public.organization_subscriptions s on s.organization_id = o.id
  join auth.users u on u.id = o.created_by
  where public.is_platform_administrator()
    and not exists (
      select 1 from public.platform_administrators pa
      where pa.user_id = o.created_by
    )
  order by o.created_at desc;
$$;

grant execute on function public.has_active_organization_access(uuid), public.get_platform_customers() to authenticated;
