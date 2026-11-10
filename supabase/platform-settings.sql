-- Run after subscriptions.sql and platform-admin.sql.
-- One support contact for every customer workspace.

create table if not exists public.platform_settings (
  singleton boolean primary key default true check (singleton),
  support_email text,
  support_phone text,
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (singleton) values (true)
on conflict (singleton) do nothing;

alter table public.platform_settings enable row level security;
revoke all on public.platform_settings from anon, authenticated;

create or replace function public.get_platform_support_settings()
returns table (support_email text, support_phone text)
language sql security definer set search_path = public stable as $$
  select support_email, support_phone
  from public.platform_settings
  where singleton and public.is_platform_administrator();
$$;

create or replace function public.update_platform_support_settings(contact_email text, contact_phone text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_administrator() then
    raise exception 'Platform administrator access required';
  end if;
  update public.platform_settings
  set support_email = nullif(trim(contact_email), ''),
      support_phone = nullif(trim(contact_phone), ''),
      updated_at = now()
  where singleton;
end;
$$;

-- Global contacts take priority, while existing per-customer values remain a fallback.
create or replace function public.get_current_workspace_access()
returns table (organization_id uuid, organization_name text, role text, subscription_status text, access_ends_at timestamptz, support_email text, support_phone text)
language plpgsql security definer set search_path = public as $$
declare access_row record;
begin
  select m.organization_id, o.name as organization_name,
         case when m.role = 'owner' then 'superadmin' else m.role end as member_role,
         s.status, coalesce(s.access_ends_at, s.trial_ends_at) as ends_at,
         coalesce(p.support_email, s.support_email) as contact_email,
         coalesce(p.support_phone, s.support_phone) as contact_phone
  into access_row
  from public.organization_members m
  join public.organizations o on o.id = m.organization_id
  join public.organization_subscriptions s on s.organization_id = m.organization_id
  left join public.platform_settings p on p.singleton
  where m.user_id = auth.uid()
  limit 1;
  if access_row.organization_id is null then return; end if;
  insert into public.organization_access_events (organization_id, user_id, event_type, subscription_status)
  values (access_row.organization_id, auth.uid(), case when public.has_active_organization_access(access_row.organization_id) then 'desktop_open' else 'access_blocked' end, access_row.status);
  return query select access_row.organization_id, access_row.organization_name, access_row.member_role,
                      access_row.status, access_row.ends_at, access_row.contact_email, access_row.contact_phone;
end;
$$;

grant execute on function public.get_platform_support_settings(), public.update_platform_support_settings(text, text) to authenticated;
grant execute on function public.get_current_workspace_access() to authenticated;
