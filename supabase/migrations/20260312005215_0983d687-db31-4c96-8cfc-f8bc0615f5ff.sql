DROP POLICY "Admins can manage memberships" ON public.company_memberships;

CREATE POLICY "Admins can manage memberships"
  ON public.company_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (is_company_admin(auth.uid(), company_id));