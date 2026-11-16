-- Run once in Supabase SQL Editor after the existing ERP SQL files.
-- Saves a product's process plan atomically, preventing duplicate process rows.

create or replace function public.replace_product_process_plan(
  target_product_id uuid,
  process_names text[],
  fetch_mode text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare workspace_id uuid; process_name text; position integer := 0;
begin
  select organization_id into workspace_id from public.organization_members where user_id = auth.uid() limit 1;
  if workspace_id is null then raise exception 'Workspace access not found'; end if;
  if fetch_mode not in ('automatic', 'manual') then raise exception 'Choose automatic or manual material fetch'; end if;
  if not exists (select 1 from public.products where id = target_product_id and organization_id = workspace_id) then raise exception 'Finished product not found'; end if;
  if coalesce(array_length(process_names, 1), 0) = 0 then raise exception 'Add at least one process'; end if;

  delete from public.process_definitions where product_id = target_product_id and organization_id = workspace_id;
  foreach process_name in array process_names loop
    position := position + 1;
    if nullif(trim(process_name), '') is null then raise exception 'Every process needs a name'; end if;
    insert into public.process_definitions (organization_id, product_id, name, material_fetch_mode)
    values (workspace_id, target_product_id, position::text || '. ' || trim(process_name), fetch_mode);
  end loop;
end;
$$;

grant execute on function public.replace_product_process_plan(uuid, text[], text) to authenticated;
