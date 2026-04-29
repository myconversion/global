
-- Enums for CRM module
CREATE TYPE public.crm_temperature AS ENUM ('cold', 'warm', 'hot');
CREATE TYPE public.crm_contact_status AS ENUM ('lead', 'client');
CREATE TYPE public.crm_origin AS ENUM ('indicacao', 'inbound', 'outbound', 'social_media', 'evento', 'other');
CREATE TYPE public.crm_company_size AS ENUM ('mei', 'small', 'medium', 'large');
CREATE TYPE public.crm_interaction_type AS ENUM ('email', 'whatsapp', 'call', 'meeting', 'note', 'stage_change', 'followup');
CREATE TYPE public.crm_followup_type AS ENUM ('call', 'email', 'whatsapp', 'meeting', 'visit', 'proposal');
CREATE TYPE public.crm_alert_type AS ENUM ('none', 'email', 'whatsapp', 'both');
CREATE TYPE public.crm_campaign_channel AS ENUM ('email', 'whatsapp', 'both');
CREATE TYPE public.crm_campaign_status AS ENUM ('draft', 'scheduled', 'sent');

-- Table: crm_contacts (Pessoas PF)
CREATE TABLE public.crm_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cpf TEXT,
  email TEXT,
  phone TEXT,
  position TEXT,
  origin crm_origin DEFAULT 'other',
  temperature crm_temperature DEFAULT 'cold',
  status crm_contact_status DEFAULT 'lead',
  score INTEGER NOT NULL DEFAULT 0,
  responsible_id UUID,
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',
  last_interaction_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view crm_contacts" ON public.crm_contacts FOR SELECT USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create crm_contacts" ON public.crm_contacts FOR INSERT WITH CHECK (is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins or responsible can update crm_contacts" ON public.crm_contacts FOR UPDATE USING (is_company_admin(auth.uid(), company_id) OR responsible_id = auth.uid() OR created_by = auth.uid());
CREATE POLICY "Admins can delete crm_contacts" ON public.crm_contacts FOR DELETE USING (is_company_admin(auth.uid(), company_id));
CREATE TRIGGER update_crm_contacts_updated_at BEFORE UPDATE ON public.crm_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Table: crm_companies (Empresas PJ)
CREATE TABLE public.crm_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT,
  segment TEXT,
  size crm_company_size,
  website TEXT,
  address TEXT,
  email TEXT,
  phone TEXT,
  temperature crm_temperature DEFAULT 'cold',
  status crm_contact_status DEFAULT 'lead',
  score INTEGER NOT NULL DEFAULT 0,
  responsible_id UUID,
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',
  last_interaction_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view crm_companies" ON public.crm_companies FOR SELECT USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create crm_companies" ON public.crm_companies FOR INSERT WITH CHECK (is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins or responsible can update crm_companies" ON public.crm_companies FOR UPDATE USING (is_company_admin(auth.uid(), company_id) OR responsible_id = auth.uid() OR created_by = auth.uid());
CREATE POLICY "Admins can delete crm_companies" ON public.crm_companies FOR DELETE USING (is_company_admin(auth.uid(), company_id));
CREATE TRIGGER update_crm_companies_updated_at BEFORE UPDATE ON public.crm_companies FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Table: crm_contact_company (N:N vínculo)
CREATE TABLE public.crm_contact_company (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  crm_company_id UUID NOT NULL REFERENCES public.crm_companies(id) ON DELETE CASCADE,
  role TEXT,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contact_id, crm_company_id)
);
ALTER TABLE public.crm_contact_company ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view crm_contact_company" ON public.crm_contact_company FOR SELECT USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create crm_contact_company" ON public.crm_contact_company FOR INSERT WITH CHECK (is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins can delete crm_contact_company" ON public.crm_contact_company FOR DELETE USING (is_company_admin(auth.uid(), company_id));

-- Table: crm_pipelines (Funis customizáveis)
CREATE TABLE public.crm_pipelines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  product_service TEXT,
  stages JSONB NOT NULL DEFAULT '[]',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_pipelines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view crm_pipelines" ON public.crm_pipelines FOR SELECT USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create crm_pipelines" ON public.crm_pipelines FOR INSERT WITH CHECK (is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins can update crm_pipelines" ON public.crm_pipelines FOR UPDATE USING (is_company_admin(auth.uid(), company_id));
CREATE POLICY "Admins can delete crm_pipelines" ON public.crm_pipelines FOR DELETE USING (is_company_admin(auth.uid(), company_id));

-- Table: crm_pipeline_deals (Deals vinculados a funil)
CREATE TABLE public.crm_pipeline_deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pipeline_id UUID NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  stage_name TEXT NOT NULL,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  crm_company_id UUID REFERENCES public.crm_companies(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  responsible_id UUID,
  expected_close_date DATE,
  loss_reason TEXT,
  entered_stage_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_pipeline_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view crm_pipeline_deals" ON public.crm_pipeline_deals FOR SELECT USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create crm_pipeline_deals" ON public.crm_pipeline_deals FOR INSERT WITH CHECK (is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins or responsible can update crm_pipeline_deals" ON public.crm_pipeline_deals FOR UPDATE USING (is_company_admin(auth.uid(), company_id) OR responsible_id = auth.uid() OR created_by = auth.uid());
CREATE POLICY "Admins can delete crm_pipeline_deals" ON public.crm_pipeline_deals FOR DELETE USING (is_company_admin(auth.uid(), company_id));
CREATE TRIGGER update_crm_pipeline_deals_updated_at BEFORE UPDATE ON public.crm_pipeline_deals FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Table: crm_interactions (Timeline unificada)
CREATE TABLE public.crm_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  crm_company_id UUID REFERENCES public.crm_companies(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.crm_pipeline_deals(id) ON DELETE SET NULL,
  type crm_interaction_type NOT NULL DEFAULT 'note',
  title TEXT NOT NULL,
  description TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view crm_interactions" ON public.crm_interactions FOR SELECT USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create crm_interactions" ON public.crm_interactions FOR INSERT WITH CHECK (is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins or creator can update crm_interactions" ON public.crm_interactions FOR UPDATE USING (is_company_admin(auth.uid(), company_id) OR user_id = auth.uid());
CREATE POLICY "Admins can delete crm_interactions" ON public.crm_interactions FOR DELETE USING (is_company_admin(auth.uid(), company_id));

-- Table: crm_followups
CREATE TABLE public.crm_followups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  crm_company_id UUID REFERENCES public.crm_companies(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.crm_pipeline_deals(id) ON DELETE SET NULL,
  type crm_followup_type NOT NULL DEFAULT 'call',
  scheduled_at TIMESTAMPTZ NOT NULL,
  description TEXT,
  alert_type crm_alert_type NOT NULL DEFAULT 'none',
  alert_minutes_before INTEGER DEFAULT 30,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  snoozed_to TIMESTAMPTZ,
  assigned_to UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_followups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view crm_followups" ON public.crm_followups FOR SELECT USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create crm_followups" ON public.crm_followups FOR INSERT WITH CHECK (is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins or assigned can update crm_followups" ON public.crm_followups FOR UPDATE USING (is_company_admin(auth.uid(), company_id) OR assigned_to = auth.uid() OR created_by = auth.uid());
CREATE POLICY "Admins can delete crm_followups" ON public.crm_followups FOR DELETE USING (is_company_admin(auth.uid(), company_id));

-- Table: crm_campaigns
CREATE TABLE public.crm_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channel crm_campaign_channel NOT NULL DEFAULT 'email',
  status crm_campaign_status NOT NULL DEFAULT 'draft',
  target_filters JSONB DEFAULT '{}',
  template_body TEXT,
  template_subject TEXT,
  scheduled_at TIMESTAMPTZ,
  frequency_hours INTEGER,
  stats JSONB DEFAULT '{"sent":0,"opened":0,"clicked":0,"replied":0,"converted":0}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view crm_campaigns" ON public.crm_campaigns FOR SELECT USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create crm_campaigns" ON public.crm_campaigns FOR INSERT WITH CHECK (is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins or creator can update crm_campaigns" ON public.crm_campaigns FOR UPDATE USING (is_company_admin(auth.uid(), company_id) OR created_by = auth.uid());
CREATE POLICY "Admins can delete crm_campaigns" ON public.crm_campaigns FOR DELETE USING (is_company_admin(auth.uid(), company_id));

-- Table: crm_flows (Fluxos automatizados)
CREATE TABLE public.crm_flows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB DEFAULT '{}',
  actions JSONB DEFAULT '[]',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_flows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view crm_flows" ON public.crm_flows FOR SELECT USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create crm_flows" ON public.crm_flows FOR INSERT WITH CHECK (is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins can update crm_flows" ON public.crm_flows FOR UPDATE USING (is_company_admin(auth.uid(), company_id));
CREATE POLICY "Admins can delete crm_flows" ON public.crm_flows FOR DELETE USING (is_company_admin(auth.uid(), company_id));

-- Table: crm_flow_logs
CREATE TABLE public.crm_flow_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_id UUID NOT NULL REFERENCES public.crm_flows(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  action_executed TEXT NOT NULL,
  result TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_flow_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view crm_flow_logs" ON public.crm_flow_logs FOR SELECT USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create crm_flow_logs" ON public.crm_flow_logs FOR INSERT WITH CHECK (is_company_member(auth.uid(), company_id));

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_pipeline_deals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_followups;
