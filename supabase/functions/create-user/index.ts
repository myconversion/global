import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify the caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client with caller's token to verify permissions
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { email, password, name, company_id, role, method, sector_permissions } = body;

    if (!email || !name || !company_id || !role) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller permissions
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check if caller is super_admin (can create admins) or admin (can create collaborators)
    const { data: callerMembership } = await adminClient
      .from("company_memberships")
      .select("role")
      .eq("user_id", caller.id)
      .eq("company_id", company_id)
      .single();

    const isSuperAdmin = callerMembership?.role === "super_admin";
    const isAdmin = callerMembership?.role === "admin" || isSuperAdmin;

    // Super admin check for creating across any company
    if (!isAdmin) {
      // Check if super_admin in any company
      const { data: superCheck } = await adminClient
        .from("company_memberships")
        .select("role")
        .eq("user_id", caller.id)
        .eq("role", "super_admin")
        .limit(1);

      if (!superCheck || superCheck.length === 0) {
        return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Only super_admin can create admin users
    if (role === "admin" || role === "super_admin") {
      const { data: saCheck } = await adminClient
        .from("company_memberships")
        .select("role")
        .eq("user_id", caller.id)
        .eq("role", "super_admin")
        .limit(1);

      if (!saCheck || saCheck.length === 0) {
        return new Response(JSON.stringify({ error: "Only super admins can create admin users" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    let newUser;

    if (method === "invite") {
      // Invite by email
      const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { name },
      });
      if (error) throw error;
      newUser = data.user;
    } else {
      // Direct creation with password
      if (!password || password.length < 6) {
        return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });
      if (error) throw error;
      newUser = data.user;
    }

    if (!newUser) {
      return new Response(JSON.stringify({ error: "Failed to create user" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create company membership
    const { error: memberError } = await adminClient
      .from("company_memberships")
      .insert({
        user_id: newUser.id,
        company_id,
        role,
      });
    if (memberError) throw memberError;

    // Create sector permissions if provided
    if (sector_permissions && Array.isArray(sector_permissions) && sector_permissions.length > 0) {
      const permRows = sector_permissions.map((p: any) => ({
        user_id: newUser!.id,
        company_id,
        sector: p.sector,
        can_view: p.can_view ?? false,
        can_create: p.can_create ?? false,
        can_edit: p.can_edit ?? false,
        can_delete: p.can_delete ?? false,
      }));
      const { error: permError } = await adminClient
        .from("user_sector_permissions")
        .insert(permRows);
      if (permError) throw permError;
    }

    return new Response(
      JSON.stringify({ user_id: newUser.id, email: newUser.email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
