-- Run this once after the existing Manufacturer ERP SQL files.
-- It links an employee's self-created Supabase Auth account to the employee
-- record created by their administrator, then records attendance safely.

create or replace function public.ensure_current_user_workspace()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  workspace_id uuid;
  workspace_name text;
  invited_role text;
  user_email text;
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

  select lower(email) into user_email
  from auth.users
  where id = auth.uid();

  -- An administrator creates the employee record first. When that exact work
  -- email activates an account, join the existing company instead of creating
  -- a second workspace.
  select organization_id, role into workspace_id, invited_role
  from public.employees
  where lower(email) = user_email
    and login_status <> 'disabled'
  order by created_at desc
  limit 1;

  if workspace_id is not null then
    insert into public.organization_members (organization_id, user_id, role)
    values (
      workspace_id,
      auth.uid(),
      case invited_role
        when 'superadmin' then 'owner'
        when 'admin' then 'admin'
        when 'manager' then 'manager'
        else 'member'
      end
    )
    on conflict (organization_id, user_id) do nothing;

    update public.employees
    set login_status = 'active'
    where organization_id = workspace_id
      and lower(email) = user_email;

    return workspace_id;
  end if;

  -- This is a company-owner signup, not an employee activation.
  select coalesce(raw_user_meta_data ->> 'company_name', 'My manufacturing workspace')
  into workspace_name
  from auth.users
  where id = auth.uid();

  insert into public.organizations (name, created_by)
  values (workspace_name, auth.uid())
  returning id into workspace_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (workspace_id, auth.uid(), 'owner');

  insert into public.organization_subscriptions (organization_id, status, trial_ends_at)
  values (workspace_id, 'trial', now() + interval '30 days')
  on conflict (organization_id) do nothing;

  return workspace_id;
end;
$$;

create or replace function public.mark_my_attendance(attendance_status text)
returns public.attendance
language plpgsql
security definer
set search_path = public
as $$
declare
  workspace_id uuid;
  employee_record public.employees;
  saved_attendance public.attendance;
  user_email text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if attendance_status not in ('present', 'leave') then
    raise exception 'Select present or leave';
  end if;

  select lower(email) into user_email from auth.users where id = auth.uid();
  select organization_id into workspace_id
  from public.organization_members
  where user_id = auth.uid()
  limit 1;

  select * into employee_record
  from public.employees
  where organization_id = workspace_id
    and lower(email) = user_email
    and login_status = 'active'
  limit 1;

  if employee_record.id is null then
    raise exception 'No active employee profile is linked to this login';
  end if;

  insert into public.attendance (organization_id, employee_name, attendance_date, status)
  values (workspace_id, employee_record.full_name, current_date, attendance_status)
  on conflict (organization_id, employee_name, attendance_date)
  do update set status = excluded.status
  returning * into saved_attendance;

  return saved_attendance;
end;
$$;

grant execute on function public.ensure_current_user_workspace(), public.mark_my_attendance(text) to authenticated;
