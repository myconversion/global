
CREATE TABLE public.crm_prospecting_cadences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pipeline_id uuid NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  channel text NOT NULL,
  delay_days integer NOT NULL DEFAULT 0,
  template_name text NOT NULL,
  template_script text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_prospecting_cadences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view crm_prospecting_cadences"
  ON public.crm_prospecting_cadences FOR SELECT
  USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Admins can insert crm_prospecting_cadences"
  ON public.crm_prospecting_cadences FOR INSERT
  WITH CHECK (is_company_admin(auth.uid(), company_id));

CREATE POLICY "Admins can update crm_prospecting_cadences"
  ON public.crm_prospecting_cadences FOR UPDATE
  USING (is_company_admin(auth.uid(), company_id));

CREATE POLICY "Admins can delete crm_prospecting_cadences"
  ON public.crm_prospecting_cadences FOR DELETE
  USING (is_company_admin(auth.uid(), company_id));
