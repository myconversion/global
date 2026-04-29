
-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Authenticated can create company" ON public.companies;

-- Recreate as PERMISSIVE so it actually grants access
CREATE POLICY "Authenticated can create company" ON public.companies
FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
