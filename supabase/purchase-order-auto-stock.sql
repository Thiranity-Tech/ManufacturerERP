-- Run after inventory-flow.sql.
-- A Purchase Order immediately adds material to inventory; no separate receive step exists.

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
  insert into public.purchase_orders (organization_id, supplier_name, purchase_order_number, material_name, material_sku, quantity, unit, unit_cost, total_amount, status, received_at)
  values (workspace, supplier, po_number, material, nullif(material_code, ''), material_quantity, material_unit, material_unit_cost, material_quantity * material_unit_cost, 'received', now())
  returning id into created_order;
  insert into public.raw_materials (organization_id, name, sku, stock, unit, cost)
  values (workspace, material, coalesce(nullif(material_code, ''), material), material_quantity, material_unit, material_unit_cost)
  on conflict (organization_id, sku) do update set stock = public.raw_materials.stock + excluded.stock, cost = excluded.cost, unit = excluded.unit, name = excluded.name;
  return created_order;
end;
$$;

create or replace function public.update_purchase_order(
  order_id uuid, supplier text, po_number text, material text, material_code text,
  material_quantity numeric, material_unit text, material_unit_cost numeric
)
returns void language plpgsql security definer set search_path = public as $$
declare workspace uuid; old_po public.purchase_orders; existing_stock numeric; old_key text; new_key text;
begin
  select organization_id into workspace from public.organization_members where user_id = auth.uid() limit 1;
  select * into old_po from public.purchase_orders where id = order_id and organization_id = workspace for update;
  if old_po.id is null then raise exception 'Purchase order not found'; end if;
  if material_quantity <= 0 or material_unit_cost < 0 then raise exception 'Enter a valid quantity and unit cost'; end if;
  old_key := coalesce(nullif(old_po.material_sku, ''), old_po.material_name);
  new_key := coalesce(nullif(material_code, ''), material);
  select stock into existing_stock from public.raw_materials where organization_id = workspace and sku = old_key for update;
  if coalesce(existing_stock, 0) < old_po.quantity then raise exception 'This PO cannot be edited because some of its material has already been issued'; end if;
  update public.raw_materials set stock = stock - old_po.quantity where organization_id = workspace and sku = old_key;
  insert into public.raw_materials (organization_id, name, sku, stock, unit, cost)
  values (workspace, material, new_key, material_quantity, material_unit, material_unit_cost)
  on conflict (organization_id, sku) do update set stock = public.raw_materials.stock + excluded.stock, cost = excluded.cost, unit = excluded.unit, name = excluded.name;
  update public.purchase_orders
  set supplier_name = supplier, purchase_order_number = po_number, material_name = material,
      material_sku = nullif(material_code, ''), quantity = material_quantity, unit = material_unit,
      unit_cost = material_unit_cost, total_amount = material_quantity * material_unit_cost
  where id = order_id;
end;
$$;

grant execute on function public.create_purchase_order(text, text, text, text, numeric, text, numeric), public.update_purchase_order(uuid, text, text, text, text, numeric, text, numeric) to authenticated;
