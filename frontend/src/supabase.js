import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = url && key ? createClient(url, key) : null;

export async function getWorkspace() {
  const { error: setupError } = await supabase.rpc("ensure_current_user_workspace");
  if (setupError) throw setupError;
  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id, role, organizations(id, name)")
    .limit(1)
    .single();
  if (error) throw error;
  return {
    id: data.organization_id,
    name: data.organizations.name,
    // Workspace creators are owners in the database and Super Admins in the ERP UI.
    role: data.role === "owner" ? "superadmin" : data.role === "member" ? "employee" : data.role,
  };
}
