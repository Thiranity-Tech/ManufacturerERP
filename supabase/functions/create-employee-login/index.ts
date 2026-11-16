import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) throw new Error("Sign in is required.");

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authorization } } },
    );
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("Your session is no longer valid.");

    const { data: membership, error: membershipError } = await userClient
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .in("role", ["owner", "admin"])
      .limit(1)
      .maybeSingle();
    if (membershipError || !membership) throw new Error("Only a workspace owner or admin can create employee logins.");

    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const fullName = String(body.full_name ?? "").trim();
    const department = String(body.department ?? "").trim() || null;
    const role = ["employee", "manager", "admin"].includes(body.role) ? body.role : "employee";
    const assignedProcessId = body.assigned_process_id || null;
    if (!email || !fullName || password.length < 8) throw new Error("Enter a name, work email, and password of at least 8 characters.");

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (createError || !created.user) throw new Error(createError?.message ?? "Could not create the employee login.");

    const memberRole = role === "admin" ? "admin" : role === "manager" ? "manager" : "member";
    const { error: membershipInsertError } = await adminClient.from("organization_members").insert({
      organization_id: membership.organization_id,
      user_id: created.user.id,
      role: memberRole,
    });
    if (membershipInsertError) throw new Error(membershipInsertError.message);

    const { error: employeeError } = await adminClient.from("employees").insert({
      organization_id: membership.organization_id,
      full_name: fullName,
      email,
      department,
      role,
      assigned_process_id: assignedProcessId,
      login_status: "active",
    });
    if (employeeError) throw new Error(employeeError.message);

    return Response.json({ success: true }, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not create employee login." }, { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
