-- ============================================================
-- Collaborator deal visibility: restrict collaborators to see
-- only deals where they are responsible_id OR created_by.
-- Admins (admin / super_admin) continue to see all deals.
-- ============================================================

-- 1. Drop the existing broad SELECT policy that lets every member
--    see all deals regardless of role.
DROP POLICY IF EXISTS "Members can view crm_pipeline_deals" ON public.crm_pipeline_deals;

-- 2. Admins see every deal in their company (unchanged behaviour).
CREATE POLICY "Admins view all crm_pipeline_deals"
  ON public.crm_pipeline_deals
  FOR SELECT TO authenticated
  USING (public.is_company_admin(auth.uid(), company_id));

-- 3. Collaborators see only deals where they are responsible or creator.
--    is_company_admin returns false for collaborators, so this policy
--    is the only one that applies to them.
CREATE POLICY "Collaborators view own crm_pipeline_deals"
  ON public.crm_pipeline_deals
  FOR SELECT TO authenticated
  USING (
    public.is_company_member(auth.uid(), company_id)
    AND (
      responsible_id = auth.uid()
      OR created_by   = auth.uid()
    )
  );

-- Note: The two permissive SELECT policies are combined with OR by
-- PostgreSQL, so an admin satisfies policy 2 trivially (is_company_admin),
-- and a collaborator satisfies policy 3 only when they own/created the deal.
