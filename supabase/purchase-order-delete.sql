-- Run this once in the Supabase SQL Editor after purchase-order-auto-stock.sql.
-- A PO may be deleted only while all stock it added is still available.

create or replace function public.delete_purchase_order(order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  workspace uuid;
  existing_po public.purchase_orders;
  material_key text;
  available_stock numeric;
begin
  select organization_id into workspace
  from public.organization_members
  where user_id = auth.uid()
  limit 1;

  if workspace is null then
    raise exception 'Workspace not found';
  end if;

  select * into existing_po
  from public.purchase_orders
  where id = order_id and organization_id = workspace
  for update;

  if existing_po.id is null then
    raise exception 'Purchase order not found';
  end if;

  material_key := coalesce(nullif(existing_po.material_sku, ''), existing_po.material_name);

  select stock into available_stock
  from public.raw_materials
  where organization_id = workspace and sku = material_key
  for update;

  if available_stock is null or available_stock < existing_po.quantity then
    raise exception 'This PO cannot be deleted because some of its material has already been issued.';
  end if;

  update public.raw_materials
  set stock = stock - existing_po.quantity
  where organization_id = workspace and sku = material_key;

  -- Revision records are removed automatically by their foreign-key cascade.
  delete from public.purchase_orders where id = existing_po.id;
end;
$$;

grant execute on function public.delete_purchase_order(uuid) to authenticated;
