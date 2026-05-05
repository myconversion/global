-- =============================================================================
-- CRM Forms — Lead Capture Form Builder
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLE: crm_forms
-- ---------------------------------------------------------------------------
CREATE TABLE public.crm_forms (
  id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id      UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  description     TEXT,
  pipeline_id     UUID        REFERENCES public.crm_pipelines(id) ON DELETE SET NULL,
  primary_entity  TEXT        NOT NULL DEFAULT 'contact'
                              CHECK (primary_entity IN ('contact', 'company')),
  fields          JSONB       NOT NULL DEFAULT '[]',
  success_message TEXT        NOT NULL DEFAULT 'Obrigado! Entraremos em contato em breve.',
  redirect_url    TEXT,
  public_token    UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  owner_id        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_forms ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_crm_forms_updated_at
  BEFORE UPDATE ON public.crm_forms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_crm_forms_company_id   ON public.crm_forms(company_id);
CREATE INDEX idx_crm_forms_public_token ON public.crm_forms(public_token);
CREATE INDEX idx_crm_forms_pipeline_id  ON public.crm_forms(pipeline_id);

-- ---------------------------------------------------------------------------
-- TABLE: crm_form_submissions
-- ---------------------------------------------------------------------------
CREATE TABLE public.crm_form_submissions (
  id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id         UUID        NOT NULL REFERENCES public.crm_forms(id) ON DELETE CASCADE,
  company_id      UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  data            JSONB       NOT NULL DEFAULT '{}',
  contact_id      UUID        REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  crm_company_id  UUID        REFERENCES public.crm_companies(id) ON DELETE SET NULL,
  deal_id         UUID        REFERENCES public.crm_pipeline_deals(id) ON DELETE SET NULL,
  ip_address      TEXT,
  user_agent      TEXT,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_form_submissions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_crm_form_submissions_form_id    ON public.crm_form_submissions(form_id);
CREATE INDEX idx_crm_form_submissions_company_id ON public.crm_form_submissions(company_id);

-- ---------------------------------------------------------------------------
-- RLS POLICIES: crm_forms
-- ---------------------------------------------------------------------------

-- Admins see all forms in their company
CREATE POLICY "Admins view all crm_forms"
  ON public.crm_forms FOR SELECT TO authenticated
  USING (public.is_company_admin(auth.uid(), company_id));

-- Collaborators see only their own forms
CREATE POLICY "Collaborators view own crm_forms"
  ON public.crm_forms FOR SELECT TO authenticated
  USING (
    public.is_company_member(auth.uid(), company_id)
    AND created_by = auth.uid()
  );

-- Any member can create a form
CREATE POLICY "Members create crm_forms"
  ON public.crm_forms FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(auth.uid(), company_id));

-- Admin or creator can update
CREATE POLICY "Admins or creator update crm_forms"
  ON public.crm_forms FOR UPDATE TO authenticated
  USING (
    public.is_company_admin(auth.uid(), company_id)
    OR created_by = auth.uid()
  );

-- Only admins can delete
CREATE POLICY "Admins delete crm_forms"
  ON public.crm_forms FOR DELETE TO authenticated
  USING (public.is_company_admin(auth.uid(), company_id));

-- Anon reads active forms (for public form page via token lookup)
CREATE POLICY "Anon reads active crm_forms"
  ON public.crm_forms FOR SELECT TO anon
  USING (is_active = true);

-- ---------------------------------------------------------------------------
-- RLS POLICIES: crm_form_submissions
-- ---------------------------------------------------------------------------

-- Admins see all submissions in their company
CREATE POLICY "Admins view all submissions"
  ON public.crm_form_submissions FOR SELECT TO authenticated
  USING (public.is_company_admin(auth.uid(), company_id));

-- Collaborators see submissions from their own forms only
CREATE POLICY "Collaborators view own form submissions"
  ON public.crm_form_submissions FOR SELECT TO authenticated
  USING (
    public.is_company_member(auth.uid(), company_id)
    AND EXISTS (
      SELECT 1 FROM public.crm_forms f
      WHERE f.id = crm_form_submissions.form_id
        AND f.created_by = auth.uid()
    )
  );

-- INSERT done exclusively via service role in Edge Function (no policy needed)
