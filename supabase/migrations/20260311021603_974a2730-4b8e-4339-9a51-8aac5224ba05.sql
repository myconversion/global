
-- Drop ALL existing policies on companies and recreate them as PERMISSIVE
DROP POLICY IF EXISTS "Authenticated can create company" ON public.companies;
DROP POLICY IF EXISTS "Members can view company" ON public.companies;
DROP POLICY IF EXISTS "Admins can update company" ON public.companies;
DROP POLICY IF EXISTS "Super admins can delete company" ON public.companies;

-- Recreate as PERMISSIVE (default)
CREATE POLICY "Authenticated can create company"
ON public.companies FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Members can view company"
ON public.companies FOR SELECT TO authenticated
USING (is_company_member(auth.uid(), id));

CREATE POLICY "Super admins can view all companies"
ON public.companies FOR SELECT TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Admins can update company"
ON public.companies FOR UPDATE TO authenticated
USING (is_company_admin(auth.uid(), id));

CREATE POLICY "Super admins can delete company"
ON public.companies FOR DELETE TO authenticated
USING (is_super_admin(auth.uid()));
