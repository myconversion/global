-- Fix 1: Restrict company creation to super admins only
DROP POLICY IF EXISTS "Authenticated can create company" ON public.companies;
CREATE POLICY "Super admins can create company"
  ON public.companies FOR INSERT TO authenticated
  WITH CHECK (is_super_admin(auth.uid()));

-- Fix 2: Restrict employees SELECT to admins only (protects salary data)
DROP POLICY IF EXISTS "Members can view employees" ON public.employees;
CREATE POLICY "Admins can view employees" ON public.employees
  FOR SELECT TO authenticated
  USING (is_company_admin(auth.uid(), company_id));