
-- Create cadence settings table
CREATE TABLE public.crm_cadence_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  warm_after_days integer NOT NULL DEFAULT 3,
  cold_after_days integer NOT NULL DEFAULT 7,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- Enable RLS
ALTER TABLE public.crm_cadence_settings ENABLE ROW LEVEL SECURITY;

-- Members can view
CREATE POLICY "Members can view cadence settings"
ON public.crm_cadence_settings
FOR SELECT
TO public
USING (is_company_member(auth.uid(), company_id));

-- Admins can insert
CREATE POLICY "Admins can insert cadence settings"
ON public.crm_cadence_settings
FOR INSERT
TO public
WITH CHECK (is_company_admin(auth.uid(), company_id));

-- Admins can update
CREATE POLICY "Admins can update cadence settings"
ON public.crm_cadence_settings
FOR UPDATE
TO public
USING (is_company_admin(auth.uid(), company_id));

-- Admins can delete
CREATE POLICY "Admins can delete cadence settings"
ON public.crm_cadence_settings
FOR DELETE
TO public
USING (is_company_admin(auth.uid(), company_id));
