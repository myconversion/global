
-- Junction table: users linked to business units
CREATE TABLE public.user_business_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_unit_id uuid NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, business_unit_id)
);

ALTER TABLE public.user_business_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view user_business_units"
  ON public.user_business_units FOR SELECT TO authenticated
  USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Admins can insert user_business_units"
  ON public.user_business_units FOR INSERT TO authenticated
  WITH CHECK (is_company_admin(auth.uid(), company_id));

CREATE POLICY "Admins can delete user_business_units"
  ON public.user_business_units FOR DELETE TO authenticated
  USING (is_company_admin(auth.uid(), company_id));
