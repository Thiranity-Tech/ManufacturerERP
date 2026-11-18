-- Run this once in the Supabase SQL Editor after workflow-controls.sql.
-- Process work is assigned per product process and changes from pending to
-- completed when the assigned employee marks it done.

create table if not exists public.process_work_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  process_id uuid not null references public.process_definitions(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'completed')),
  assigned_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (organization_id, process_id)
);

alter table public.process_work_assignments enable row level security;
revoke all on public.process_work_assignments from anon;
grant select, insert, update, delete on public.process_work_assignments to authenticated;

drop policy if exists "Members manage process work assignments" on public.process_work_assignments;
create policy "Members manage process work assignments"
on public.process_work_assignments for all to authenticated
using ((select public.is_organization_member(organization_id)))
with check ((select public.is_organization_member(organization_id)));

create or replace function public.assign_process_employee(
  target_process_id uuid,
  target_employee_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  workspace uuid;
  target_process public.process_definitions;
begin
  select organization_id into workspace
  from public.organization_members
  where user_id = auth.uid() and role in ('owner', 'admin', 'manager')
  limit 1;
  if workspace is null then raise exception 'Only a manager or administrator can assign process work'; end if;

  select * into target_process
  from public.process_definitions
  where id = target_process_id and organization_id = workspace;
  if target_process.id is null then raise exception 'Process not found'; end if;

  if target_employee_id is null then
    delete from public.process_work_assignments
    where organization_id = workspace and process_id = target_process_id;
    update public.employees
    set assigned_process_id = null
    where organization_id = workspace and assigned_process_id = target_process_id;
    return;
  end if;

  if not exists (
    select 1 from public.employees
    where id = target_employee_id and organization_id = workspace and login_status = 'active'
  ) then raise exception 'Employee not found'; end if;

  update public.employees
  set assigned_process_id = null
  where organization_id = workspace and assigned_process_id = target_process_id;

  update public.employees
  set assigned_process_id = target_process_id
  where id = target_employee_id and organization_id = workspace;

  insert into public.process_work_assignments (
    organization_id, product_id, process_id, employee_id, status, assigned_at, completed_at
  ) values (
    workspace, target_process.product_id, target_process_id, target_employee_id, 'pending', now(), null
  )
  on conflict (organization_id, process_id)
  do update set employee_id = excluded.employee_id,
                product_id = excluded.product_id,
                status = 'pending',
                assigned_at = now(),
                completed_at = null;
end;
$$;

create or replace function public.complete_my_assigned_process(work_assignment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  workspace uuid;
  current_employee_id uuid;
begin
  select organization_id into workspace
  from public.organization_members
  where user_id = auth.uid()
  limit 1;
  if workspace is null then raise exception 'Workspace not found'; end if;

  select id into current_employee_id
  from public.employees
  where organization_id = workspace
    and lower(email) = (select lower(email) from auth.users where id = auth.uid())
    and login_status = 'active'
  limit 1;
  if current_employee_id is null then raise exception 'No active employee profile is linked to this login'; end if;

  update public.process_work_assignments
  set status = 'completed', completed_at = now()
  where id = work_assignment_id
    and organization_id = workspace
    and employee_id = current_employee_id;

  if not found then raise exception 'This work assignment is not available to your account'; end if;
end;
$$;

grant execute on function public.assign_process_employee(uuid, uuid), public.complete_my_assigned_process(uuid) to authenticated;
