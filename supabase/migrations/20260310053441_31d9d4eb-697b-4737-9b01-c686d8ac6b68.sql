
-- Create module_name enum
CREATE TYPE public.module_name AS ENUM (
  'crm', 'projects', 'tasks', 'financial', 'fiscal',
  'purchases', 'hr', 'communication', 'bi'
);

-- Create company_modules table
CREATE TABLE public.company_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module public.module_name NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, module)
);

-- Enable RLS
ALTER TABLE public.company_modules ENABLE ROW LEVEL SECURITY;

-- Members can view modules
CREATE POLICY "Members can view modules"
  ON public.company_modules FOR SELECT
  USING (is_company_member(auth.uid(), company_id));

-- Super admins can manage modules
CREATE POLICY "Super admins can insert modules"
  ON public.company_modules FOR INSERT
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update modules"
  ON public.company_modules FOR UPDATE
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete modules"
  ON public.company_modules FOR DELETE
  USING (is_super_admin(auth.uid()));

-- Also allow admins to manage modules for their company
CREATE POLICY "Admins can update modules"
  ON public.company_modules FOR UPDATE
  USING (is_company_admin(auth.uid(), company_id));

-- Create crm_automations table
CREATE TYPE public.automation_type AS ENUM ('email', 'whatsapp');
CREATE TYPE public.automation_status AS ENUM ('scheduled', 'sent', 'failed', 'cancelled');

CREATE TABLE public.crm_automations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  type public.automation_type NOT NULL,
  status public.automation_status NOT NULL DEFAULT 'scheduled',
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  recipient_email TEXT,
  recipient_phone TEXT,
  subject TEXT,
  body TEXT NOT NULL,
  error_message TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view automations"
  ON public.crm_automations FOR SELECT
  USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Members can create automations"
  ON public.crm_automations FOR INSERT
  WITH CHECK (is_company_member(auth.uid(), company_id));

CREATE POLICY "Admins or creators can update automations"
  ON public.crm_automations FOR UPDATE
  USING (is_company_admin(auth.uid(), company_id) OR created_by = auth.uid());

CREATE POLICY "Admins can delete automations"
  ON public.crm_automations FOR DELETE
  USING (is_company_admin(auth.uid(), company_id));
