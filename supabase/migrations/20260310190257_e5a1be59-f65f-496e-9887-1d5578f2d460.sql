
-- Create teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6B7280',
  leader_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view teams" ON public.teams FOR SELECT USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins can create teams" ON public.teams FOR INSERT WITH CHECK (public.is_company_admin(auth.uid(), company_id));
CREATE POLICY "Admins can update teams" ON public.teams FOR UPDATE USING (public.is_company_admin(auth.uid(), company_id));
CREATE POLICY "Admins can delete teams" ON public.teams FOR DELETE USING (public.is_company_admin(auth.uid(), company_id));

-- Create team_members table
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view team_members" ON public.team_members FOR SELECT USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins can create team_members" ON public.team_members FOR INSERT WITH CHECK (public.is_company_admin(auth.uid(), company_id));
CREATE POLICY "Admins can delete team_members" ON public.team_members FOR DELETE USING (public.is_company_admin(auth.uid(), company_id));

-- Create custom_roles table
CREATE TABLE public.custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6B7280',
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view custom_roles" ON public.custom_roles FOR SELECT USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins can create custom_roles" ON public.custom_roles FOR INSERT WITH CHECK (public.is_company_admin(auth.uid(), company_id));
CREATE POLICY "Admins can update custom_roles" ON public.custom_roles FOR UPDATE USING (public.is_company_admin(auth.uid(), company_id));
CREATE POLICY "Admins can delete custom_roles" ON public.custom_roles FOR DELETE USING (public.is_company_admin(auth.uid(), company_id));

-- Create custom_field_definitions table
CREATE TABLE public.custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  options JSONB,
  is_required BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, entity_type, field_name)
);

ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view custom_field_definitions" ON public.custom_field_definitions FOR SELECT USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins can create custom_field_definitions" ON public.custom_field_definitions FOR INSERT WITH CHECK (public.is_company_admin(auth.uid(), company_id));
CREATE POLICY "Admins can update custom_field_definitions" ON public.custom_field_definitions FOR UPDATE USING (public.is_company_admin(auth.uid(), company_id));
CREATE POLICY "Admins can delete custom_field_definitions" ON public.custom_field_definitions FOR DELETE USING (public.is_company_admin(auth.uid(), company_id));
