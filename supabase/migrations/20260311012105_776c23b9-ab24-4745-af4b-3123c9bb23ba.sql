
-- Drop the restrictive INSERT policy on companies
DROP POLICY IF EXISTS "Authenticated can create company" ON public.companies;

-- Recreate as a PERMISSIVE policy
CREATE POLICY "Authenticated can create company"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
