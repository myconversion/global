
DROP POLICY "Members can view integrations" ON public.integration_configs;

CREATE POLICY "Admins can view integrations"
  ON public.integration_configs
  FOR SELECT
  TO authenticated
  USING (is_company_admin(auth.uid(), company_id));
