import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
// SSRF protection — only allow https:// URLs from a configured allowlist
// ---------------------------------------------------------------------------
const ALLOWED_API_HOSTNAMES = (
  Deno.env.get("ALLOWED_WA_HOSTS") ?? ""
)
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

function isSafeApiUrl(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl);
    // Must be HTTPS
    if (u.protocol !== "https:") return false;
    // If an allowlist is configured, hostname must be in it
    if (ALLOWED_API_HOSTNAMES.length > 0) {
      return ALLOWED_API_HOSTNAMES.some(
        (allowed) =>
          u.hostname === allowed || u.hostname.endsWith(`.${allowed}`),
      );
    }
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
serve(async (req) => {
  const cors = corsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  if (req.method !== "POST") {
    return jsonError(cors, 405, "Method not allowed");
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // ── Auth check ──────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonError(cors, 401, "Unauthorized");
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await callerClient.auth.getUser();
    if (userError || !user) {
      return jsonError(cors, 401, "Unauthorized");
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // ── Permission check (must be admin or super_admin in at least one company) ─
    const { data: membership } = await supabase
      .from("company_memberships")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "super_admin"])
      .limit(1);

    if (!membership || membership.length === 0) {
      return jsonError(cors, 403, "Forbidden");
    }

    // ── Fetch due automations ────────────────────────────────────────────────
    const { data: automations, error: fetchError } = await supabase
      .from("crm_automations")
      .select("*, companies:company_id(id)")
      .eq("status", "scheduled")
      .lte("scheduled_at", new Date().toISOString())
      .limit(50);

    if (fetchError) {
      console.error("Error fetching automations:", fetchError.message);
      return jsonError(cors, 500, "Failed to fetch automations");
    }

    if (!automations || automations.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    let failed = 0;

    for (const automation of automations) {
      try {
        if (automation.type === "email") {
          const { data: smtpConfig } = await supabase
            .from("integration_configs")
            .select("config, is_active")
            .eq("company_id", automation.company_id)
            .eq("type", "email_smtp")
            .eq("is_active", true)
            .limit(1)
            .single();

          if (!smtpConfig) {
            throw new Error("No active SMTP configuration found");
          }

          const cfg = smtpConfig.config as Record<string, string>;
          console.log(
            `Sending email to ${automation.recipient_email} via ${cfg.host}:${cfg.port}`,
          );

          await supabase
            .from("crm_automations")
            .update({ status: "sent" })
            .eq("id", automation.id);
          sent++;
        } else if (automation.type === "whatsapp") {
          const { data: waConfig } = await supabase
            .from("integration_configs")
            .select("config, is_active")
            .eq("company_id", automation.company_id)
            .eq("type", "whatsapp")
            .eq("is_active", true)
            .limit(1)
            .single();

          if (!waConfig) {
            throw new Error("No active WhatsApp configuration found");
          }

          const cfg = waConfig.config as Record<string, string>;
          const provider = cfg.provider || "evolution";

          let apiUrl = "";
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
          };

          if (provider === "evolution") {
            apiUrl = `${cfg.api_url}/message/sendText/${cfg.instance}`;
            headers["apikey"] = cfg.api_key;
          } else if (provider === "zapi") {
            apiUrl = `${cfg.api_url}/send-text`;
            headers["Client-Token"] = cfg.api_key;
          } else {
            apiUrl = `${cfg.api_url}/send-message`;
            headers["Authorization"] = `Bearer ${cfg.api_key}`;
          }

          // SSRF protection: validate URL before fetching
          if (!isSafeApiUrl(apiUrl)) {
            throw new Error("Invalid or disallowed API URL");
          }

          const waResponse = await fetch(apiUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({
              number: automation.recipient_phone,
              text: automation.body,
            }),
          });

          if (!waResponse.ok) {
            // Read body to avoid resource leaks, but don't expose it externally
            const status = waResponse.status;
            await waResponse.text();
            throw new Error(`WhatsApp API returned status ${status}`);
          }
          await waResponse.text();

          await supabase
            .from("crm_automations")
            .update({ status: "sent" })
            .eq("id", automation.id);
          sent++;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error(`Failed to process automation ${automation.id}:`, errorMessage);
        await supabase
          .from("crm_automations")
          .update({ status: "failed", error_message: "Delivery failed" })
          .eq("id", automation.id);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ processed: automations.length, sent, failed }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("send-scheduled-message error:", e instanceof Error ? e.message : e);
    return jsonError(cors, 500, "Internal server error");
  }
});
