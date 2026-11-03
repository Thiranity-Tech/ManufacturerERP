-- Run this after schema.sql and modules.sql in Supabase SQL Editor.
-- Inventory workflow: purchase receipt -> raw materials -> manager-approved issue -> production -> finished goods -> dispatch.

alter table public.purchase_orders add column if not exists material_name text;
alter table public.purchase_orders add column if not exists material_sku text;
alter table public.purchase_orders add column if not exists quantity numeric not null default 0 check (quantity >= 0);
alter table public.purchase_orders add column if not exists unit text not null default 'Units';
alter table public.purchase_orders add column if not exists unit_cost numeric not null default 0 check (unit_cost >= 0);
alter table public.purchase_orders add column if not exists received_at timestamptz;

create table if not exists public.material_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  raw_material_id uuid not null references public.raw_materials(id) on delete restrict,
  quantity numeric not null check (quantity > 0),
  purpose text,
  status text not null default 'requested' check (status in ('requested', 'approved', 'released', 'rejected')),
  requested_by uuid not null default auth.uid() references auth.users(id),
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  released_at timestamptz
);

create table if not exists public.production_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity numeric not null check (quantity > 0),
  process_note text,
  created_at timestamptz not null default now()
);

create table if not exists public.dispatches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  customer_name text not null,
  dispatch_number text,
  quantity numeric not null check (quantity > 0),
  created_at timestamptz not null default now()
);

alter table public.material_requests enable row level security;
alter table public.production_records enable row level security;
alter table public.dispatches enable row level security;
revoke all on public.material_requests, public.production_records, public.dispatches from anon;
grant select, insert, update, delete on public.material_requests, public.production_records, public.dispatches to authenticated;

drop policy if exists "Members manage material requests" on public.material_requests;
drop policy if exists "Members manage production records" on public.production_records;
drop policy if exists "Members manage dispatches" on public.dispatches;
create policy "Members manage material requests" on public.material_requests for all to authenticated using ((select public.is_organization_member(organization_id))) with check ((select public.is_organization_member(organization_id)));
create policy "Members manage production records" on public.production_records for all to authenticated using ((select public.is_organization_member(organization_id))) with check ((select public.is_organization_member(organization_id)));
create policy "Members manage dispatches" on public.dispatches for all to authenticated using ((select public.is_organization_member(organization_id))) with check ((select public.is_organization_member(organization_id)));

create or replace function public.receive_purchase_order(order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare po public.purchase_orders;
begin
  select * into po from public.purchase_orders where id = order_id and organization_id in (select organization_id from public.organization_members where user_id = auth.uid());
  if po.id is null then raise exception 'Purchase order not found'; end if;
  if po.status = 'received' then raise exception 'Purchase order already received'; end if;
  if po.material_name is null or po.quantity <= 0 then raise exception 'Purchase order material and quantity are required'; end if;
  insert into public.raw_materials (organization_id, name, sku, stock, unit, cost)
  values (po.organization_id, po.material_name, nullif(po.material_sku, ''), po.quantity, po.unit, po.unit_cost)
  on conflict (organization_id, sku) do update set stock = public.raw_materials.stock + excluded.stock, cost = excluded.cost;
  update public.purchase_orders set status = 'received', received_at = now() where id = order_id;
end $$;

create or replace function public.release_material_request(request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare req public.material_requests; current_stock numeric;
begin
  select * into req from public.material_requests where id = request_id and organization_id in (select organization_id from public.organization_members where user_id = auth.uid());
  if req.id is null or req.status <> 'approved' then raise exception 'Only approved requests can be released'; end if;
  select stock into current_stock from public.raw_materials where id = req.raw_material_id for update;
  if current_stock < req.quantity then raise exception 'Requested quantity exceeds raw material inventory'; end if;
  update public.raw_materials set stock = stock - req.quantity where id = req.raw_material_id;
  update public.material_requests set status = 'released', released_at = now() where id = request_id;
end $$;

create or replace function public.record_dispatch(product_uuid uuid, customer text, dispatch_ref text, dispatch_quantity numeric)
returns void language plpgsql security definer set search_path = public as $$
declare current_stock numeric; workspace uuid;
begin
  select organization_id into workspace from public.organization_members where user_id = auth.uid() limit 1;
  select stock into current_stock from public.products where id = product_uuid and organization_id = workspace for update;
  if current_stock is null then raise exception 'Finished product not found'; end if;
  if dispatch_quantity <= 0 or dispatch_quantity > current_stock then raise exception 'Dispatch quantity exceeds available finished goods inventory'; end if;
  insert into public.dispatches (organization_id, product_id, customer_name, dispatch_number, quantity) values (workspace, product_uuid, customer, nullif(dispatch_ref, ''), dispatch_quantity);
  update public.products set stock = stock - dispatch_quantity where id = product_uuid;
end $$;

grant execute on function public.receive_purchase_order(uuid), public.release_material_request(uuid), public.record_dispatch(uuid, text, text, numeric) to authenticated;

create or replace function public.record_production(product_uuid uuid, produced_quantity numeric, note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare workspace uuid;
begin
  select organization_id into workspace from public.organization_members where user_id = auth.uid() limit 1;
  if produced_quantity <= 0 then raise exception 'Production quantity must be greater than zero'; end if;
  update public.products set stock = stock + produced_quantity where id = product_uuid and organization_id = workspace;
  if not found then raise exception 'Finished product not found'; end if;
  insert into public.production_records (organization_id, product_id, quantity, process_note) values (workspace, product_uuid, produced_quantity, note);
end $$;
grant execute on function public.record_production(uuid, numeric, text) to authenticated;
