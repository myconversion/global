
-- 1. Create business_units table
CREATE TABLE public.business_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  address text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view business_units" ON public.business_units
  FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Admins can create business_units" ON public.business_units
  FOR INSERT TO authenticated WITH CHECK (is_company_admin(auth.uid(), company_id));

CREATE POLICY "Admins can update business_units" ON public.business_units
  FOR UPDATE TO authenticated USING (is_company_admin(auth.uid(), company_id));

CREATE POLICY "Admins can delete business_units" ON public.business_units
  FOR DELETE TO authenticated USING (is_company_admin(auth.uid(), company_id));
