-- Run this once in the Supabase SQL Editor.
-- Purchase Orders remain ordered until a Manager or Superadmin confirms delivery.
-- Only confirmed deliveries are added to Raw Materials inventory.

alter table public.raw_materials
  add column if not exists last_delivered_at date;

alter table public.purchase_orders
  drop constraint if exists purchase_orders_status_check;
alter table public.purchase_orders
  add constraint purchase_orders_status_check
  check (status in ('draft', 'approved', 'ordered', 'received', 'cancelled'));

alter table public.bom_purchase_requests
  drop constraint if exists bom_purchase_requests_status_check;
alter table public.bom_purchase_requests
  add constraint bom_purchase_requests_status_check
  check (status in ('pending', 'ordered', 'purchased', 'cancelled'));
alter table public.bom_purchase_requests
  add column if not exists purchase_order_id uuid references public.purchase_orders(id) on delete set null;

create or replace function public.create_purchase_order(
  supplier text, po_number text, material text, material_code text,
  material_quantity numeric, material_unit text, material_unit_cost numeric
)
returns uuid language plpgsql security definer set search_path = public as $$
declare workspace uuid; created_order uuid;
begin
  select organization_id into workspace from public.organization_members where user_id = auth.uid() limit 1;
  if workspace is null then raise exception 'Workspace not found'; end if;
  if material_quantity <= 0 or material_unit_cost < 0 then raise exception 'Enter a valid quantity and unit cost'; end if;
  insert into public.purchase_orders (
    organization_id, supplier_name, purchase_order_number, material_name, material_sku,
    quantity, unit, unit_cost, total_amount, status, received_at
  ) values (
    workspace, supplier, po_number, material, nullif(material_code, ''),
    material_quantity, material_unit, material_unit_cost, material_quantity * material_unit_cost,
    'ordered', null
  ) returning id into created_order;
  return created_order;
end;
$$;

create or replace function public.update_purchase_order(
  order_id uuid, supplier text, po_number text, material text, material_code text,
  material_quantity numeric, material_unit text, material_unit_cost numeric,
  revision_note text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare workspace uuid; existing_po public.purchase_orders;
begin
  select organization_id into workspace from public.organization_members where user_id = auth.uid() limit 1;
  select * into existing_po from public.purchase_orders where id = order_id and organization_id = workspace for update;
  if existing_po.id is null then raise exception 'Purchase order not found'; end if;
  if existing_po.status = 'received' then raise exception 'A delivered PO cannot be edited because its material is already in inventory'; end if;
  if material_quantity <= 0 or material_unit_cost < 0 then raise exception 'Enter a valid quantity and unit cost'; end if;
  update public.purchase_orders
  set supplier_name = supplier, purchase_order_number = po_number, material_name = material,
      material_sku = nullif(material_code, ''), quantity = material_quantity, unit = material_unit,
      unit_cost = material_unit_cost, total_amount = material_quantity * material_unit_cost
  where id = order_id;
end;
$$;

create or replace function public.receive_purchase_order(order_id uuid, delivered_on date)
returns void language plpgsql security definer set search_path = public as $$
declare po public.purchase_orders; workspace uuid; material_key text;
begin
  select organization_id into workspace
  from public.organization_members
  where user_id = auth.uid() and role in ('owner', 'manager')
  limit 1;
  if workspace is null then raise exception 'Only a Manager or Superadmin can mark delivery'; end if;
  if delivered_on is null then raise exception 'Choose the delivery date'; end if;
  select * into po from public.purchase_orders where id = order_id and organization_id = workspace for update;
  if po.id is null then raise exception 'Purchase order not found'; end if;
  if po.status = 'received' then raise exception 'Purchase order already delivered'; end if;
  material_key := coalesce(nullif(po.material_sku, ''), po.material_name);
  insert into public.raw_materials (organization_id, name, sku, stock, unit, cost, last_delivered_at)
  values (workspace, po.material_name, material_key, po.quantity, po.unit, po.unit_cost, delivered_on)
  on conflict (organization_id, sku) do update
    set stock = public.raw_materials.stock + excluded.stock,
        cost = excluded.cost,
        unit = excluded.unit,
        name = excluded.name,
        last_delivered_at = excluded.last_delivered_at;
  update public.purchase_orders set status = 'received', received_at = delivered_on::timestamptz where id = po.id;
  update public.bom_purchase_requests
  set status = 'purchased', purchased_at = now()
  where purchase_order_id = po.id;
end;
$$;

create or replace function public.delete_purchase_order(order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare workspace uuid; existing_po public.purchase_orders; material_key text; available_stock numeric;
begin
  select organization_id into workspace from public.organization_members where user_id = auth.uid() limit 1;
  select * into existing_po from public.purchase_orders where id = order_id and organization_id = workspace for update;
  if existing_po.id is null then raise exception 'Purchase order not found'; end if;
  if existing_po.status = 'received' then
    material_key := coalesce(nullif(existing_po.material_sku, ''), existing_po.material_name);
    select stock into available_stock from public.raw_materials where organization_id = workspace and sku = material_key for update;
    if available_stock is null or available_stock < existing_po.quantity then
      raise exception 'This delivered PO cannot be deleted because some material has already been issued';
    end if;
    update public.raw_materials set stock = stock - existing_po.quantity where organization_id = workspace and sku = material_key;
  end if;
  delete from public.purchase_orders where id = existing_po.id;
end;
$$;

grant execute on function public.create_purchase_order(text, text, text, text, numeric, text, numeric),
  public.update_purchase_order(uuid, text, text, text, text, numeric, text, numeric, text),
  public.receive_purchase_order(uuid, date),
  public.delete_purchase_order(uuid)
to authenticated;
