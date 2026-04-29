
-- Fix company_modules policies - recreate as PERMISSIVE
DROP POLICY IF EXISTS "Super admins can insert modules" ON public.company_modules;
DROP POLICY IF EXISTS "Members can view modules" ON public.company_modules;
DROP POLICY IF EXISTS "Admins can update modules" ON public.company_modules;
DROP POLICY IF EXISTS "Super admins can update modules" ON public.company_modules;
DROP POLICY IF EXISTS "Super admins can delete modules" ON public.company_modules;

CREATE POLICY "Super admins can insert modules"
ON public.company_modules FOR INSERT TO authenticated
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Members can view modules"
ON public.company_modules FOR SELECT TO authenticated
USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Super admins can view all modules"
ON public.company_modules FOR SELECT TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Admins can update modules"
ON public.company_modules FOR UPDATE TO authenticated
USING (is_company_admin(auth.uid(), company_id));

CREATE POLICY "Super admins can update modules"
ON public.company_modules FOR UPDATE TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete modules"
ON public.company_modules FOR DELETE TO authenticated
USING (is_super_admin(auth.uid()));

-- Fix company_memberships policies - recreate as PERMISSIVE
DROP POLICY IF EXISTS "Admins can manage memberships" ON public.company_memberships;
DROP POLICY IF EXISTS "Members can view memberships" ON public.company_memberships;
DROP POLICY IF EXISTS "Admins can update memberships" ON public.company_memberships;
DROP POLICY IF EXISTS "Admins can delete memberships" ON public.company_memberships;

CREATE POLICY "Admins can manage memberships"
ON public.company_memberships FOR INSERT TO authenticated
WITH CHECK (is_company_admin(auth.uid(), company_id) OR (user_id = auth.uid()));

CREATE POLICY "Super admins can manage memberships"
ON public.company_memberships FOR INSERT TO authenticated
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Members can view memberships"
ON public.company_memberships FOR SELECT TO authenticated
USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Super admins can view all memberships"
ON public.company_memberships FOR SELECT TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Admins can update memberships"
ON public.company_memberships FOR UPDATE TO authenticated
USING (is_company_admin(auth.uid(), company_id));

CREATE POLICY "Admins can delete memberships"
ON public.company_memberships FOR DELETE TO authenticated
USING (is_company_admin(auth.uid(), company_id));
