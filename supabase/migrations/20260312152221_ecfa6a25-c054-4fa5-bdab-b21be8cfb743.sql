
-- Remove overly permissive SELECT policy that exposes config secrets to all members
DROP POLICY IF EXISTS "Members can view integrations" ON public.integration_configs;

-- Ensure admin-only SELECT policy exists
DROP POLICY IF EXISTS "Admins can view integrations" ON public.integration_configs;
CREATE POLICY "Admins can view integrations"
  ON public.integration_configs FOR SELECT TO authenticated
  USING (is_company_admin(auth.uid(), company_id));

-- Create a security definer function so non-admin members can read non-sensitive fields
CREATE OR REPLACE FUNCTION public.get_company_integrations(_company_id uuid)
RETURNS TABLE(id uuid, type text, name text, is_active boolean, access_type text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ic.id, ic.type, ic.name, ic.is_active, ic.access_type
  FROM public.integration_configs ic
  WHERE ic.company_id = _company_id
    AND ic.is_active = true
    AND is_company_member(auth.uid(), _company_id);
$$;
