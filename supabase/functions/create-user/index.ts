import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

// ---------------------------------------------------------------------------
// CORS — restrict to configured frontend origins (never wildcard)
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS = (
  Deno.env.get("ALLOWED_ORIGINS") ?? "https://dashboard.myconversion.app"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------
const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const VALID_ROLES = ["admin", "super_admin", "collaborator", "member"];

const VALID_SECTORS = [
  "crm", "projects", "tasks", "financial", "hr", "bi",
  "fiscal", "purchases", "clients", "settings",
];

function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email) && email.length <= 254;
}

function isStrongPassword(password: string): boolean {
  // Minimum 8 chars, at least one letter and one number
  return (
    password.length >= 8 &&
    /[a-zA-Z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

function sanitizeName(name: string): string {
  // Strip HTML tags and control characters; trim whitespace
  return name
    .replace(/<[^>]*>/g, "")
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim()
    .slice(0, 100);
}

function isValidUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function jsonError(
  cors: Record<string, string>,
  status: number,
  message: string,
): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  const cors = corsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  if (req.method !== "POST") {
    return jsonError(cors, 405, "Method not allowed");
  }

  try {
    // ── Auth check ──────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonError(cors, 401, "Missing authorization");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return jsonError(cors, 401, "Unauthorized");
    }

    // ── Parse + validate body ────────────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonError(cors, 400, "Invalid JSON body");
    }

    const {
      email,
      password,
      name,
      company_id,
      role,
      method,
      sector_permissions,
    } = body as Record<string, unknown>;

    // Required fields
    if (!email || !name || !company_id || !role) {
      return jsonError(cors, 400, "Missing required fields");
    }

    // Type guards
    if (
      typeof email !== "string" ||
      typeof name !== "string" ||
      typeof company_id !== "string" ||
      typeof role !== "string"
    ) {
      return jsonError(cors, 400, "Invalid field types");
    }

    // Email format
    if (!isValidEmail(email)) {
      return jsonError(cors, 400, "Invalid email address");
    }

    // Name
    const cleanName = sanitizeName(name);
    if (cleanName.length < 2) {
      return jsonError(cors, 400, "Name too short");
    }

    // company_id must be a valid UUID
    if (!isValidUuid(company_id)) {
      return jsonError(cors, 400, "Invalid company identifier");
    }

    // Role allowlist
    if (!VALID_ROLES.includes(role)) {
      return jsonError(cors, 400, "Invalid role");
    }

    // Sector permissions: validate shape and enum values
    if (sector_permissions !== undefined) {
      if (!Array.isArray(sector_permissions) || sector_permissions.length > 50) {
        return jsonError(cors, 400, "Invalid sector_permissions");
      }
      for (const p of sector_permissions as unknown[]) {
        if (typeof p !== "object" || p === null) {
          return jsonError(cors, 400, "Invalid sector_permissions entry");
        }
        const pObj = p as Record<string, unknown>;
        if (!pObj.sector || !VALID_SECTORS.includes(String(pObj.sector))) {
          return jsonError(cors, 400, `Invalid sector: ${pObj.sector}`);
        }
      }
    }

    // ── Permission check ─────────────────────────────────────────────────────
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerMembership } = await adminClient
      .from("company_memberships")
      .select("role")
      .eq("user_id", caller.id)
      .eq("company_id", company_id)
      .single();

    const callerRole = callerMembership?.role ?? null;
    const isSuperAdmin = callerRole === "super_admin";
    const isAdmin = callerRole === "admin" || isSuperAdmin;

    if (!isAdmin) {
      // Check global super_admin
      const { data: superCheck } = await adminClient
        .from("company_memberships")
        .select("role")
        .eq("user_id", caller.id)
        .eq("role", "super_admin")
        .limit(1);

      if (!superCheck || superCheck.length === 0) {
        return jsonError(cors, 403, "Forbidden");
      }
    }

    if (role === "admin" || role === "super_admin") {
      const { data: saCheck } = await adminClient
        .from("company_memberships")
        .select("role")
        .eq("user_id", caller.id)
        .eq("role", "super_admin")
        .limit(1);

      if (!saCheck || saCheck.length === 0) {
        return jsonError(cors, 403, "Forbidden");
      }
    }

    // ── Create user ──────────────────────────────────────────────────────────
    let newUser;

    if (method === "invite") {
      const { data, error } = await adminClient.auth.admin.inviteUserByEmail(
        email,
        { data: { name: cleanName } },
      );
      if (error) {
        console.error("invite error:", error.message);
        return jsonError(cors, 400, "Could not send invitation");
      }
      newUser = data.user;
    } else {
      if (typeof password !== "string" || !isStrongPassword(password)) {
        return jsonError(
          cors,
          400,
          "Password must be at least 8 characters and contain letters and numbers",
        );
      }
      const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: cleanName },
      });
      if (error) {
        console.error("createUser error:", error.message);
        return jsonError(cors, 400, "Could not create user");
      }
      newUser = data.user;
    }

    if (!newUser) {
      return jsonError(cors, 500, "User creation failed");
    }

    // ── Company membership ───────────────────────────────────────────────────
    const { error: memberError } = await adminClient
      .from("company_memberships")
      .insert({ user_id: newUser.id, company_id, role });

    if (memberError) {
      console.error("membership insert error:", memberError.message);
      return jsonError(cors, 500, "Failed to assign membership");
    }

    // ── Sector permissions ───────────────────────────────────────────────────
    if (
      Array.isArray(sector_permissions) &&
      sector_permissions.length > 0
    ) {
      const permRows = (sector_permissions as Record<string, unknown>[]).map(
        (p) => ({
          user_id: newUser!.id,
          company_id,
          sector: String(p.sector),
          can_view: Boolean(p.can_view ?? false),
          can_create: Boolean(p.can_create ?? false),
          can_edit: Boolean(p.can_edit ?? false),
          can_delete: Boolean(p.can_delete ?? false),
        }),
      );
      const { error: permError } = await adminClient
        .from("user_sector_permissions")
        .insert(permRows);

      if (permError) {
        console.error("permissions insert error:", permError.message);
        // Non-fatal: user + membership already created; log and continue
      }
    }

    return new Response(
      JSON.stringify({ user_id: newUser.id, email: newUser.email }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (err) {
    // Log the real error server-side, return generic message to client
    console.error("create-user unhandled error:", err instanceof Error ? err.message : err);
    return jsonError(cors, 500, "Internal server error");
  }
});
