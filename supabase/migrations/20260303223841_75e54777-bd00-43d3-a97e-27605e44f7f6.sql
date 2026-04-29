
CREATE TABLE public.integration_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'whatsapp', 'email_smtp', 'webhook', 'api_key'
  name text NOT NULL DEFAULT '',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.integration_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view integrations"
  ON public.integration_configs FOR SELECT
  TO authenticated
  USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Admins can create integrations"
  ON public.integration_configs FOR INSERT
  TO authenticated
  WITH CHECK (is_company_admin(auth.uid(), company_id));

CREATE POLICY "Admins can update integrations"
  ON public.integration_configs FOR UPDATE
  TO authenticated
  USING (is_company_admin(auth.uid(), company_id));

CREATE POLICY "Admins can delete integrations"
  ON public.integration_configs FOR DELETE
  TO authenticated
  USING (is_company_admin(auth.uid(), company_id));
