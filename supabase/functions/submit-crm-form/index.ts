import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

// ---------------------------------------------------------------------------
// CORS — public function: allow any origin (form can be embedded anywhere)
// ---------------------------------------------------------------------------
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonOk(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function jsonError(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Service-role client (bypasses RLS for inserts)
// ---------------------------------------------------------------------------
function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type FieldMapping =
  | "contact.name" | "contact.email" | "contact.phone"
  | "contact.cpf"  | "contact.position"
  | "company.razao_social" | "company.nome_fantasia"
  | "company.cnpj"        | "company.email" | "company.phone"
  | "deal.title" | "deal.value"
  | "custom_field";

interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  mapping: FieldMapping;
  customFieldKey?: string;
}

interface PipelineStage {
  name: string;
  probability: number;
  order: number;
}

interface CRMForm {
  id: string;
  company_id: string;
  pipeline_id: string | null;
  primary_entity: "contact" | "company";
  fields: FormField[];
  success_message: string;
  redirect_url: string | null;
  owner_id: string | null;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonError("Method not allowed", 405);

  // 1. Parse body
  let body: { token?: unknown; data?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const { token, data } = body;
  if (!token || typeof token !== "string") return jsonError("Missing token");
  if (!data || typeof data !== "object" || Array.isArray(data)) return jsonError("Missing data");

  const submissionData = data as Record<string, unknown>;

  const supabase = getServiceClient();

  // 2. Load form by public_token
  const { data: form, error: formErr } = await supabase
    .from("crm_forms")
    .select("id, company_id, pipeline_id, primary_entity, fields, success_message, redirect_url, owner_id")
    .eq("public_token", token)
    .eq("is_active", true)
    .single<CRMForm>();

  if (formErr || !form) return jsonError("Form not found or inactive", 404);

  const fields: FormField[] = Array.isArray(form.fields) ? form.fields : [];

  // 3. Validate required fields
  for (const field of fields) {
    if (field.required) {
      const val = submissionData[field.id];
      if (val === undefined || val === null || val === "" || val === false) {
        return jsonError(`Field "${field.label}" is required`);
      }
    }
  }

  // 4. Build mapped payloads
  const contactPayload: Record<string, unknown> = {
    company_id: form.company_id,
    responsible_id: form.owner_id ?? null,
    status: "lead",
  };
  const companyPayload: Record<string, unknown> = {
    company_id: form.company_id,
    responsible_id: form.owner_id ?? null,
  };
  const dealExtra: { title?: string; value?: number } = {};
  const customFields: Record<string, unknown> = {};

  for (const field of fields) {
    const val = submissionData[field.id];
    if (val === undefined || val === null || val === "") continue;

    switch (field.mapping) {
      case "contact.name":     contactPayload.name          = val; break;
      case "contact.email":    contactPayload.email         = val; break;
      case "contact.phone":    contactPayload.phone         = val; break;
      case "contact.cpf":      contactPayload.cpf           = val; break;
      case "contact.position": contactPayload.position      = val; break;
      case "company.razao_social":  companyPayload.razao_social  = val; break;
      case "company.nome_fantasia": companyPayload.nome_fantasia = val; break;
      case "company.cnpj":         companyPayload.cnpj          = val; break;
      case "company.email":        companyPayload.email          = val; break;
      case "company.phone":        companyPayload.phone          = val; break;
      case "deal.title": dealExtra.title = String(val); break;
      case "deal.value": dealExtra.value = Number(val) || 0; break;
      case "custom_field":
        if (field.customFieldKey) customFields[field.customFieldKey] = val;
        break;
    }
  }

  if (Object.keys(customFields).length > 0) {
    contactPayload.custom_fields = customFields;
    companyPayload.custom_fields = customFields;
  }

  let contactId: string | null = null;
  let crmCompanyId: string | null = null;
  let dealId: string | null = null;

  // 5. Create contact or company (primary entity)
  if (form.primary_entity === "contact") {
    if (!contactPayload.name) {
      contactPayload.name = (contactPayload.email as string) ?? "Lead sem nome";
    }
    const { data: contact, error: cErr } = await supabase
      .from("crm_contacts")
      .insert(contactPayload)
      .select("id")
      .single();
    if (cErr) console.error("Contact insert error:", JSON.stringify(cErr));
    else contactId = contact?.id ?? null;
  } else {
    if (!companyPayload.razao_social && !companyPayload.nome_fantasia) {
      companyPayload.razao_social = "Empresa sem nome";
    }
    const { data: company, error: coErr } = await supabase
      .from("crm_companies")
      .insert(companyPayload)
      .select("id")
      .single();
    if (coErr) console.error("Company insert error:", JSON.stringify(coErr));
    else crmCompanyId = company?.id ?? null;
  }

  // 6. Create deal in first active pipeline stage (if pipeline configured)
  // NOTE: stages are stored as JSONB inside crm_pipelines.stages — there is no separate stages table.
  if (form.pipeline_id) {
    const { data: pipeline } = await supabase
      .from("crm_pipelines")
      .select("stages")
      .eq("id", form.pipeline_id)
      .single<{ stages: PipelineStage[] }>();

    const stages: PipelineStage[] = Array.isArray(pipeline?.stages) ? pipeline.stages : [];
    const sortedStages = [...stages].sort((a, b) => a.order - b.order);

    // First stage with probability > 0 and < 100 (skip Won/Lost)
    const firstStage = sortedStages.find(s => s.probability > 0 && s.probability < 100);

    if (firstStage) {
      const leadName = String(
        contactPayload.name ?? companyPayload.razao_social ?? companyPayload.nome_fantasia ?? "Novo Lead"
      );

      const dPayload: Record<string, unknown> = {
        company_id:    form.company_id,
        responsible_id: form.owner_id ?? null,
        pipeline_id:   form.pipeline_id,
        stage_name:    firstStage.name,   // ← stage_name (text), NOT stage_id
        title:         dealExtra.title ?? leadName,
        value:         dealExtra.value ?? 0,
      };

      if (contactId)    dPayload.contact_id    = contactId;
      if (crmCompanyId) dPayload.crm_company_id = crmCompanyId;  // ← crm_company_id, NOT company_id_crm

      const { data: deal, error: dErr } = await supabase
        .from("crm_pipeline_deals")
        .insert(dPayload)
        .select("id")
        .single();
      if (dErr) console.error("Deal insert error:", JSON.stringify(dErr));
      else dealId = deal?.id ?? null;
    }
  }

  // 7. Insert submission record
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("cf-connecting-ip") ?? null;
  const ua = req.headers.get("user-agent") ?? null;

  const { data: submission, error: subErr } = await supabase
    .from("crm_form_submissions")
    .insert({
      form_id:        form.id,
      company_id:     form.company_id,
      data:           submissionData,
      contact_id:     contactId,
      crm_company_id: crmCompanyId,
      deal_id:        dealId,
      ip_address:     ip,
      user_agent:     ua,
    })
    .select("id")
    .single();

  if (subErr) {
    console.error("Submission insert error:", JSON.stringify(subErr));
    return jsonError("Error saving submission", 500);
  }

  return jsonOk({
    success:         true,
    submission_id:   submission.id,
    success_message: form.success_message,
    redirect_url:    form.redirect_url,
  });
});
