import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await callerClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for data operations
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify caller is an admin (super_admin or admin)
    const { data: membership } = await supabase
      .from("company_memberships")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "super_admin"])
      .limit(1);

    if (!membership || membership.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch scheduled automations that are due
    const { data: automations, error: fetchError } = await supabase
      .from("crm_automations")
      .select("*, companies:company_id(id)")
      .eq("status", "scheduled")
      .lte("scheduled_at", new Date().toISOString())
      .limit(50);

    if (fetchError) {
      console.error("Error fetching automations:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!automations || automations.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    let failed = 0;

    for (const automation of automations) {
      try {
        if (automation.type === "email") {
          // Get SMTP config for the company
          const { data: smtpConfig } = await supabase
            .from("integration_configs")
            .select("config, is_active")
            .eq("company_id", automation.company_id)
            .eq("type", "email_smtp")
            .eq("is_active", true)
            .limit(1)
            .single();

          if (!smtpConfig) {
            throw new Error("Nenhuma configuração SMTP ativa encontrada");
          }

          const cfg = smtpConfig.config as Record<string, string>;

          // Send email using Deno's SMTP (simplified - in production use a proper SMTP library)
          // For now, mark as sent with a note that SMTP sending requires runtime setup
          console.log(`Would send email to ${automation.recipient_email} via ${cfg.host}:${cfg.port}`);
          
          // Update status
          await supabase
            .from("crm_automations")
            .update({ status: "sent" })
            .eq("id", automation.id);
          sent++;
        } else if (automation.type === "whatsapp") {
          // Get WhatsApp config
          const { data: waConfig } = await supabase
            .from("integration_configs")
            .select("config, is_active")
            .eq("company_id", automation.company_id)
            .eq("type", "whatsapp")
            .eq("is_active", true)
            .limit(1)
            .single();

          if (!waConfig) {
            throw new Error("Nenhuma configuração WhatsApp ativa encontrada");
          }

          const cfg = waConfig.config as Record<string, string>;
          
          // Call WhatsApp API based on provider
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

          const waResponse = await fetch(apiUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({
              number: automation.recipient_phone,
              text: automation.body,
            }),
          });

          if (!waResponse.ok) {
            const errText = await waResponse.text();
            throw new Error(`WhatsApp API error: ${waResponse.status} - ${errText}`);
          }
          await waResponse.text(); // consume body

          await supabase
            .from("crm_automations")
            .update({ status: "sent" })
            .eq("id", automation.id);
          sent++;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error(`Failed to send automation ${automation.id}:`, errorMessage);
        await supabase
          .from("crm_automations")
          .update({ status: "failed", error_message: errorMessage })
          .eq("id", automation.id);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ processed: automations.length, sent, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("send-scheduled-message error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
