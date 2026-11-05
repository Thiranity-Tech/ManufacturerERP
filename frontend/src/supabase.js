import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = url && key ? createClient(url, key) : null;

export async function getWorkspace() {
  const { error: setupError } = await supabase.rpc("ensure_current_user_workspace");
  if (setupError) throw setupError;
  const { data, error } = await supabase.rpc("get_current_workspace_access");
  if (error) throw error;
  const workspace = data?.[0];
  if (!workspace) throw new Error("No workspace access was found for this account.");
  return {
    id: workspace.organization_id,
    name: workspace.organization_name,
    // Workspace creators are owners in the database and Super Admins in the ERP UI.
    role: workspace.role === "owner" ? "superadmin" : workspace.role === "member" ? "employee" : workspace.role,
    subscriptionStatus: workspace.subscription_status,
    accessEndsAt: workspace.access_ends_at,
  };
}
