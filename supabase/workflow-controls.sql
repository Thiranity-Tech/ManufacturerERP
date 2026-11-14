-- Run after purchase-order-auto-stock.sql.
-- Controlled manufacturing workflow: process assignment, attendance, and PO revision audit.

alter table public.employees add column if not exists assigned_process_id uuid references public.process_definitions(id) on delete set null;

create table if not exists public.purchase_order_revisions (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  changed_by uuid not null default auth.uid() references auth.users(id),
  change_note text not null,
  previous_values jsonb not null,
  changed_at timestamptz not null default now()
);
alter table public.purchase_order_revisions enable row level security;
revoke all on public.purchase_order_revisions from anon;
grant select, insert on public.purchase_order_revisions to authenticated;
drop policy if exists "Members view purchase order revisions" on public.purchase_order_revisions;
create policy "Members view purchase order revisions" on public.purchase_order_revisions for select to authenticated using ((select public.is_organization_member(organization_id)));

create or replace function public.update_purchase_order(
  order_id uuid, supplier text, po_number text, material text, material_code text,
  material_quantity numeric, material_unit text, material_unit_cost numeric,
  revision_note text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare workspace uuid; old_po public.purchase_orders; existing_stock numeric; old_key text; new_key text;
begin
  select organization_id into workspace from public.organization_members where user_id = auth.uid() limit 1;
  select * into old_po from public.purchase_orders where id = order_id and organization_id = workspace for update;
  if old_po.id is null then raise exception 'Purchase order not found'; end if;
  if nullif(trim(revision_note), '') is null then raise exception 'Enter a note explaining this PO change'; end if;
  if material_quantity <= 0 or material_unit_cost < 0 then raise exception 'Enter a valid quantity and unit cost'; end if;
  old_key := coalesce(nullif(old_po.material_sku, ''), old_po.material_name);
  new_key := coalesce(nullif(material_code, ''), material);
  select stock into existing_stock from public.raw_materials where organization_id = workspace and sku = old_key for update;
  if coalesce(existing_stock, 0) < old_po.quantity then raise exception 'This PO cannot be edited because some material has already been issued'; end if;
  insert into public.purchase_order_revisions (organization_id, purchase_order_id, change_note, previous_values)
  values (workspace, order_id, trim(revision_note), jsonb_build_object('supplier', old_po.supplier_name, 'po_number', old_po.purchase_order_number, 'material', old_po.material_name, 'sku', old_po.material_sku, 'quantity', old_po.quantity, 'unit', old_po.unit, 'unit_cost', old_po.unit_cost));
  update public.raw_materials set stock = stock - old_po.quantity where organization_id = workspace and sku = old_key;
  insert into public.raw_materials (organization_id, name, sku, stock, unit, cost)
  values (workspace, material, new_key, material_quantity, material_unit, material_unit_cost)
  on conflict (organization_id, sku) do update set stock = public.raw_materials.stock + excluded.stock, cost = excluded.cost, unit = excluded.unit, name = excluded.name;
  update public.purchase_orders set supplier_name = supplier, purchase_order_number = po_number, material_name = material, material_sku = nullif(material_code, ''), quantity = material_quantity, unit = material_unit, unit_cost = material_unit_cost, total_amount = material_quantity * material_unit_cost where id = order_id;
end;
$$;
grant execute on function public.update_purchase_order(uuid, text, text, text, text, numeric, text, numeric, text) to authenticated;
