-- Run this once in the Supabase SQL Editor after process-work-assignments.sql.
-- Intermediate completed processes are saved as Work in Progress. The final
-- process increments Finished Goods stock instead.

create table if not exists public.work_in_progress (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  process_id uuid not null references public.process_definitions(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict,
  work_assignment_id uuid not null unique references public.process_work_assignments(id) on delete cascade,
  quantity numeric not null default 1 check (quantity > 0),
  completed_at timestamptz not null default now()
);

alter table public.work_in_progress enable row level security;
revoke all on public.work_in_progress from anon;
grant select, insert, update, delete on public.work_in_progress to authenticated;

drop policy if exists "Members manage work in progress" on public.work_in_progress;
create policy "Members manage work in progress"
on public.work_in_progress for all to authenticated
using ((select public.is_organization_member(organization_id)))
with check ((select public.is_organization_member(organization_id)));

create or replace function public.complete_my_assigned_process(work_assignment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  workspace uuid;
  current_employee_id uuid;
  assignment public.process_work_assignments;
  target_process public.process_definitions;
  later_process_exists boolean;
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

  select * into assignment
  from public.process_work_assignments
  where id = work_assignment_id
    and organization_id = workspace
    and employee_id = current_employee_id
    and status = 'pending'
  for update;
  if assignment.id is null then raise exception 'This pending work assignment is not available to your account'; end if;

  select * into target_process
  from public.process_definitions
  where id = assignment.process_id and organization_id = workspace;

  if exists (
    select 1
    from public.process_definitions earlier_process
    left join public.process_work_assignments earlier_work
      on earlier_work.process_id = earlier_process.id
     and earlier_work.organization_id = workspace
    where earlier_process.organization_id = workspace
      and earlier_process.product_id = assignment.product_id
      and earlier_process.created_at < target_process.created_at
      and coalesce(earlier_work.status, 'pending') <> 'completed'
  ) then
    raise exception 'Complete the earlier process before marking this process done';
  end if;

  update public.process_work_assignments
  set status = 'completed', completed_at = now()
  where id = assignment.id;

  select exists (
    select 1 from public.process_definitions later_process
    where later_process.organization_id = workspace
      and later_process.product_id = assignment.product_id
      and later_process.created_at > target_process.created_at
  ) into later_process_exists;

  if later_process_exists then
    insert into public.work_in_progress (
      organization_id, product_id, process_id, employee_id, work_assignment_id, quantity
    ) values (
      workspace, assignment.product_id, assignment.process_id, current_employee_id, assignment.id, 1
    );
  else
    update public.products
    set stock = stock + 1
    where id = assignment.product_id and organization_id = workspace;
  end if;
end;
$$;

grant execute on function public.complete_my_assigned_process(uuid) to authenticated;
