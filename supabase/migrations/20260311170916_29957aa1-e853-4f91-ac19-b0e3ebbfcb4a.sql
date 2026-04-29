
-- Fix all RESTRICTIVE policies to PERMISSIVE by dropping and recreating them

-- =================== activity_logs ===================
DROP POLICY IF EXISTS "Members can view logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Members can create logs" ON public.activity_logs;
CREATE POLICY "Members can view logs" ON public.activity_logs FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create logs" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (is_company_member(auth.uid(), company_id));

-- =================== business_units ===================
DROP POLICY IF EXISTS "Members can view business_units" ON public.business_units;
DROP POLICY IF EXISTS "Admins can create business_units" ON public.business_units;
DROP POLICY IF EXISTS "Admins can update business_units" ON public.business_units;
DROP POLICY IF EXISTS "Admins can delete business_units" ON public.business_units;
CREATE POLICY "Members can view business_units" ON public.business_units FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins can create business_units" ON public.business_units FOR INSERT TO authenticated WITH CHECK (is_company_admin(auth.uid(), company_id));
CREATE POLICY "Admins can update business_units" ON public.business_units FOR UPDATE TO authenticated USING (is_company_admin(auth.uid(), company_id));
CREATE POLICY "Admins can delete business_units" ON public.business_units FOR DELETE TO authenticated USING (is_company_admin(auth.uid(), company_id));

-- =================== clients ===================
DROP POLICY IF EXISTS "Members can view clients" ON public.clients;
DROP POLICY IF EXISTS "Members can create clients" ON public.clients;
DROP POLICY IF EXISTS "Admins or creators can update clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can delete clients" ON public.clients;
CREATE POLICY "Members can view clients" ON public.clients FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins or creators can update clients" ON public.clients FOR UPDATE TO authenticated USING (is_company_admin(auth.uid(), company_id) OR created_by = auth.uid());
CREATE POLICY "Admins can delete clients" ON public.clients FOR DELETE TO authenticated USING (is_company_admin(auth.uid(), company_id));

-- =================== companies ===================
DROP POLICY IF EXISTS "Members can view company" ON public.companies;
DROP POLICY IF EXISTS "Super admins can view all companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated can create company" ON public.companies;
DROP POLICY IF EXISTS "Admins can update company" ON public.companies;
DROP POLICY IF EXISTS "Super admins can delete company" ON public.companies;
CREATE POLICY "Members can view company" ON public.companies FOR SELECT TO authenticated USING (is_company_member(auth.uid(), id));
CREATE POLICY "Super admins can view all companies" ON public.companies FOR SELECT TO authenticated USING (is_super_admin(auth.uid()));
CREATE POLICY "Authenticated can create company" ON public.companies FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can update company" ON public.companies FOR UPDATE TO authenticated USING (is_company_admin(auth.uid(), id));
CREATE POLICY "Super admins can delete company" ON public.companies FOR DELETE TO authenticated USING (is_super_admin(auth.uid()));

-- =================== company_memberships ===================
DROP POLICY IF EXISTS "Members can view memberships" ON public.company_memberships;
DROP POLICY IF EXISTS "Super admins can view all memberships" ON public.company_memberships;
DROP POLICY IF EXISTS "Admins can manage memberships" ON public.company_memberships;
DROP POLICY IF EXISTS "Super admins can manage memberships" ON public.company_memberships;
DROP POLICY IF EXISTS "Admins can update memberships" ON public.company_memberships;
DROP POLICY IF EXISTS "Admins can delete memberships" ON public.company_memberships;
CREATE POLICY "Members can view memberships" ON public.company_memberships FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Super admins can view all memberships" ON public.company_memberships FOR SELECT TO authenticated USING (is_super_admin(auth.uid()));
CREATE POLICY "Admins can manage memberships" ON public.company_memberships FOR INSERT TO authenticated WITH CHECK (is_company_admin(auth.uid(), company_id) OR user_id = auth.uid());
CREATE POLICY "Super admins can manage memberships" ON public.company_memberships FOR INSERT TO authenticated WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "Admins can update memberships" ON public.company_memberships FOR UPDATE TO authenticated USING (is_company_admin(auth.uid(), company_id));
CREATE POLICY "Admins can delete memberships" ON public.company_memberships FOR DELETE TO authenticated USING (is_company_admin(auth.uid(), company_id));

-- =================== company_modules ===================
DROP POLICY IF EXISTS "Members can view modules" ON public.company_modules;
DROP POLICY IF EXISTS "Super admins can view all modules" ON public.company_modules;
DROP POLICY IF EXISTS "Admins can update modules" ON public.company_modules;
DROP POLICY IF EXISTS "Super admins can insert modules" ON public.company_modules;
DROP POLICY IF EXISTS "Super admins can update modules" ON public.company_modules;
DROP POLICY IF EXISTS "Super admins can delete modules" ON public.company_modules;
CREATE POLICY "Members can view modules" ON public.company_modules FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Super admins can view all modules" ON public.company_modules FOR SELECT TO authenticated USING (is_super_admin(auth.uid()));
CREATE POLICY "Admins can update modules" ON public.company_modules FOR UPDATE TO authenticated USING (is_company_admin(auth.uid(), company_id));
CREATE POLICY "Super admins can insert modules" ON public.company_modules FOR INSERT TO authenticated WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can update modules" ON public.company_modules FOR UPDATE TO authenticated USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can delete modules" ON public.company_modules FOR DELETE TO authenticated USING (is_super_admin(auth.uid()));

-- =================== crm_activities ===================
DROP POLICY IF EXISTS "Members can view activities" ON public.crm_activities;
DROP POLICY IF EXISTS "Members can create activities" ON public.crm_activities;
DROP POLICY IF EXISTS "Creator can update activities" ON public.crm_activities;
DROP POLICY IF EXISTS "Admins can delete activities" ON public.crm_activities;
CREATE POLICY "Members can view activities" ON public.crm_activities FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create activities" ON public.crm_activities FOR INSERT TO authenticated WITH CHECK (is_company_member(auth.uid(), company_id));
CREATE POLICY "Creator can update activities" ON public.crm_activities FOR UPDATE TO authenticated USING (user_id = auth.uid() OR is_company_admin(auth.uid(), company_id));
CREATE POLICY "Admins can delete activities" ON public.crm_activities FOR DELETE TO authenticated USING (is_company_admin(auth.uid(), company_id));

-- =================== crm_automations ===================
DROP POLICY IF EXISTS "Members can view automations" ON public.crm_automations;
DROP POLICY IF EXISTS "Members can create automations" ON public.crm_automations;
DROP POLICY IF EXISTS "Admins or creators can update automations" ON public.crm_automations;
DROP POLICY IF EXISTS "Admins can delete automations" ON public.crm_automations;
CREATE POLICY "Members can view automations" ON public.crm_automations FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create automations" ON public.crm_automations FOR INSERT TO authenticated WITH CHECK (is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins or creators can update automations" ON public.crm_automations FOR UPDATE TO authenticated USING (is_company_admin(auth.uid(), company_id) OR created_by = auth.uid());
CREATE POLICY "Admins can delete automations" ON public.crm_automations FOR DELETE TO authenticated USING (is_company_admin(auth.uid(), company_id));

-- =================== crm_cadence_settings ===================
DROP POLICY IF EXISTS "Members can view cadence settings" ON public.crm_cadence_settings;
DROP POLICY IF EXISTS "Admins can insert cadence settings" ON public.crm_cadence_settings;
DROP POLICY IF EXISTS "Admins can update cadence settings" ON public.crm_cadence_settings;
DROP POLICY IF EXISTS "Admins can delete cadence settings" ON public.crm_cadence_settings;
CREATE POLICY "Members can view cadence settings" ON public.crm_cadence_settings FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins can insert cadence settings" ON public.crm_cadence_settings FOR INSERT TO authenticated WITH CHECK (is_company_admin(auth.uid(), company_id));
CREATE POLICY "Admins can update cadence settings" ON public.crm_cadence_settings FOR UPDATE TO authenticated USING (is_company_admin(auth.uid(), company_id));
CREATE POLICY "Admins can delete cadence settings" ON public.crm_cadence_settings FOR DELETE TO authenticated USING (is_company_admin(auth.uid(), company_id));

-- =================== crm_campaigns ===================
DROP POLICY IF EXISTS "Members can view crm_campaigns" ON public.crm_campaigns;
DROP POLICY IF EXISTS "Members can create crm_campaigns" ON public.crm_campaigns;
DROP POLICY IF EXISTS "Admins or creator can update crm_campaigns" ON public.crm_campaigns;
DROP POLICY IF EXISTS "Admins can delete crm_campaigns" ON public.crm_campaigns;
CREATE POLICY "Members can view crm_campaigns" ON public.crm_campaigns FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create crm_campaigns" ON public.crm_campaigns FOR INSERT TO authenticated WITH CHECK (is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins or creator can update crm_campaigns" ON public.crm_campaigns FOR UPDATE TO authenticated USING (is_company_admin(auth.uid(), company_id) OR created_by = auth.uid());
CREATE POLICY "Admins can delete crm_campaigns" ON public.crm_campaigns FOR DELETE TO authenticated USING (is_company_admin(auth.uid(), company_id));

-- =================== crm_companies ===================
DROP POLICY IF EXISTS "Members can view crm_companies" ON public.crm_companies;
DROP POLICY IF EXISTS "Members can create crm_companies" ON public.crm_companies;
DROP POLICY IF EXISTS "Admins or responsible can update crm_companies" ON public.crm_companies;
DROP POLICY IF EXISTS "Admins can delete crm_companies" ON public.crm_companies;
CREATE POLICY "Members can view crm_companies" ON public.crm_companies FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create crm_companies" ON public.crm_companies FOR INSERT TO authenticated WITH CHECK (is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins or responsible can update crm_companies" ON public.crm_companies FOR UPDATE TO authenticated USING (is_company_admin(auth.uid(), company_id) OR responsible_id = auth.uid() OR created_by = auth.uid());
CREATE POLICY "Admins can delete crm_companies" ON public.crm_companies FOR DELETE TO authenticated USING (is_company_admin(auth.uid(), company_id));

-- =================== crm_contact_company ===================
DROP POLICY IF EXISTS "Members can view crm_contact_company" ON public.crm_contact_company;
DROP POLICY IF EXISTS "Members can create crm_contact_company" ON public.crm_contact_company;
DROP POLICY IF EXISTS "Admins can delete crm_contact_company" ON public.crm_contact_company;
CREATE POLICY "Members can view crm_contact_company" ON public.crm_contact_company FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create crm_contact_company" ON public.crm_contact_company FOR INSERT TO authenticated WITH CHECK (is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins can delete crm_contact_company" ON public.crm_contact_company FOR DELETE TO authenticated USING (is_company_admin(auth.uid(), company_id));

-- =================== crm_contacts ===================
DROP POLICY IF EXISTS "Members can view crm_contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Members can create crm_contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Admins or responsible can update crm_contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Admins can delete crm_contacts" ON public.crm_contacts;
CREATE POLICY "Members can view crm_contacts" ON public.crm_contacts FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create crm_contacts" ON public.crm_contacts FOR INSERT TO authenticated WITH CHECK (is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins or responsible can update crm_contacts" ON public.crm_contacts FOR UPDATE TO authenticated USING (is_company_admin(auth.uid(), company_id) OR responsible_id = auth.uid() OR created_by = auth.uid());
CREATE POLICY "Admins can delete crm_contacts" ON public.crm_contacts FOR DELETE TO authenticated USING (is_company_admin(auth.uid(), company_id));

-- =================== crm_flow_logs ===================
DROP POLICY IF EXISTS "Members can view crm_flow_logs" ON public.crm_flow_logs;
DROP POLICY IF EXISTS "Members can create crm_flow_logs" ON public.crm_flow_logs;
CREATE POLICY "Members can view crm_flow_logs" ON public.crm_flow_logs FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create crm_flow_logs" ON public.crm_flow_logs FOR INSERT TO authenticated WITH CHECK (is_company_member(auth.uid(), company_id));

-- =================== crm_flows ===================
DROP POLICY IF EXISTS "Members can view crm_flows" ON public.crm_flows;
DROP POLICY IF EXISTS "Members can create crm_flows" ON public.crm_flows;
DROP POLICY IF EXISTS "Admins can update crm_flows" ON public.crm_flows;
DROP POLICY IF EXISTS "Admins can delete crm_flows" ON public.crm_flows;
CREATE POLICY "Members can view crm_flows" ON public.crm_flows FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create crm_flows" ON public.crm_flows FOR INSERT TO authenticated WITH CHECK (is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins can update crm_flows" ON public.crm_flows FOR UPDATE TO authenticated USING (is_company_admin(auth.uid(), company_id));
CREATE POLICY "Admins can delete crm_flows" ON public.crm_flows FOR DELETE TO authenticated USING (is_company_admin(auth.uid(), company_id));

-- =================== crm_followups ===================
DROP POLICY IF EXISTS "Members can view crm_followups" ON public.crm_followups;
DROP POLICY IF EXISTS "Members can create crm_followups" ON public.crm_followups;
DROP POLICY IF EXISTS "Admins or assigned can update crm_followups" ON public.crm_followups;
DROP POLICY IF EXISTS "Admins can delete crm_followups" ON public.crm_followups;
CREATE POLICY "Members can view crm_followups" ON public.crm_followups FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create crm_followups" ON public.crm_followups FOR INSERT TO authenticated WITH CHECK (is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins or assigned can update crm_followups" ON public.crm_followups FOR UPDATE TO authenticated USING (is_company_admin(auth.uid(), company_id) OR assigned_to = auth.uid() OR created_by = auth.uid());
CREATE POLICY "Admins can delete crm_followups" ON public.crm_followups FOR DELETE TO authenticated USING (is_company_admin(auth.uid(), company_id));

-- =================== crm_interactions ===================
DROP POLICY IF EXISTS "Members can view crm_interactions" ON public.crm_interactions;
DROP POLICY IF EXISTS "Members can create crm_interactions" ON public.crm_interactions;
DROP POLICY IF EXISTS "Admins or creator can update crm_interactions" ON public.crm_interactions;
DROP POLICY IF EXISTS "Admins can delete crm_interactions" ON public.crm_interactions;
CREATE POLICY "Members can view crm_interactions" ON public.crm_interactions FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create crm_interactions" ON public.crm_interactions FOR INSERT TO authenticated WITH CHECK (is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins or creator can update crm_interactions" ON public.crm_interactions FOR UPDATE TO authenticated USING (is_company_admin(auth.uid(), company_id) OR user_id = auth.uid());
CREATE POLICY "Admins can delete crm_interactions" ON public.crm_interactions FOR DELETE TO authenticated USING (is_company_admin(auth.uid(), company_id));

-- =================== crm_pipeline_deals ===================
DROP POLICY IF EXISTS "Members can view crm_pipeline_deals" ON public.crm_pipeline_deals;
DROP POLICY IF EXISTS "Members can create crm_pipeline_deals" ON public.crm_pipeline_deals;
DROP POLICY IF EXISTS "Admins or responsible can update crm_pipeline_deals" ON public.crm_pipeline_deals;
DROP POLICY IF EXISTS "Admins can delete crm_pipeline_deals" ON public.crm_pipeline_deals;
CREATE POLICY "Members can view crm_pipeline_deals" ON public.crm_pipeline_deals FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create crm_pipeline_deals" ON public.crm_pipeline_deals FOR INSERT TO authenticated WITH CHECK (is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins or responsible can update crm_pipeline_deals" ON public.crm_pipeline_deals FOR UPDATE TO authenticated USING (is_company_admin(auth.uid(), company_id) OR responsible_id = auth.uid() OR created_by = auth.uid());
CREATE POLICY "Admins can delete crm_pipeline_deals" ON public.crm_pipeline_deals FOR DELETE TO authenticated USING (is_company_admin(auth.uid(), company_id));

-- =================== crm_pipelines ===================
DROP POLICY IF EXISTS "Members can view crm_pipelines" ON public.crm_pipelines;
DROP POLICY IF EXISTS "Members can create crm_pipelines" ON public.crm_pipelines;
DROP POLICY IF EXISTS "Admins can update crm_pipelines" ON public.crm_pipelines;
DROP POLICY IF EXISTS "Admins can delete crm_pipelines" ON public.crm_pipelines;
CREATE POLICY "Members can view crm_pipelines" ON public.crm_pipelines FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create crm_pipelines" ON public.crm_pipelines FOR INSERT TO authenticated WITH CHECK (is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins can update crm_pipelines" ON public.crm_pipelines FOR UPDATE TO authenticated USING (is_company_admin(auth.uid(), company_id));
CREATE POLICY "Admins can delete crm_pipelines" ON public.crm_pipelines FOR DELETE TO authenticated USING (is_company_admin(auth.uid(), company_id));

-- =================== crm_prospecting_cadences ===================
DROP POLICY IF EXISTS "Members can view crm_prospecting_cadences" ON public.crm_prospecting_cadences;
DROP POLICY IF EXISTS "Admins can insert crm_prospecting_cadences" ON public.crm_prospecting_cadences;
DROP POLICY IF EXISTS "Admins can update crm_prospecting_cadences" ON public.crm_prospecting_cadences;
DROP POLICY IF EXISTS "Admins can delete crm_prospecting_cadences" ON public.crm_prospecting_cadences;
CREATE POLICY "Members can view crm_prospecting_cadences" ON public.crm_prospecting_cadences FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins can insert crm_prospecting_cadences" ON public.crm_prospecting_cadences FOR INSERT TO authenticated WITH CHECK (is_company_admin(auth.uid(), company_id));
CREATE POLICY "Admins can update crm_prospecting_cadences" ON public.crm_prospecting_cadences FOR UPDATE TO authenticated USING (is_company_admin(auth.uid(), company_id));
CREATE POLICY "Admins can delete crm_prospecting_cadences" ON public.crm_prospecting_cadences FOR DELETE TO authenticated USING (is_company_admin(auth.uid(), company_id));

-- =================== custom_field_definitions ===================
DROP POLICY IF EXISTS "Members can view custom_field_definitions" ON public.custom_field_definitions;
DROP POLICY IF EXISTS "Admins can create custom_field_definitions" ON public.custom_field_definitions;
DROP POLICY IF EXISTS "Admins can update custom_field_definitions" ON public.custom_field_definitions;
DROP POLICY IF EXISTS "Admins can delete custom_field_definitions" ON public.custom_field_definitions;
CREATE POLICY "Members can view custom_field_definitions" ON public.custom_field_definitions FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins can create custom_field_definitions" ON public.custom_field_definitions FOR INSERT TO authenticated WITH CHECK (is_company_admin(auth.uid(), company_id));
CREATE POLICY "Admins can update custom_field_definitions" ON public.custom_field_definitions FOR UPDATE TO authenticated USING (is_company_admin(auth.uid(), company_id));
CREATE POLICY "Admins can delete custom_field_definitions" ON public.custom_field_definitions FOR DELETE TO authenticated USING (is_company_admin(auth.uid(), company_id));

-- =================== custom_roles ===================
DROP POLICY IF EXISTS "Members can view custom_roles" ON public.custom_roles;
DROP POLICY IF EXISTS "Admins can create custom_roles" ON public.custom_roles;
DROP POLICY IF EXISTS "Admins can update custom_roles" ON public.custom_roles;
DROP POLICY IF EXISTS "Admins can delete custom_roles" ON public.custom_roles;
CREATE POLICY "Members can view custom_roles" ON public.custom_roles FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins can create custom_roles" ON public.custom_roles FOR INSERT TO authenticated WITH CHECK (is_company_admin(auth.uid(), company_id));
CREATE POLICY "Admins can update custom_roles" ON public.custom_roles FOR UPDATE TO authenticated USING (is_company_admin(auth.uid(), company_id));
CREATE POLICY "Admins can delete custom_roles" ON public.custom_roles FOR DELETE TO authenticated USING (is_company_admin(auth.uid(), company_id));

-- =================== deals ===================
DROP POLICY IF EXISTS "Members can view deals" ON public.deals;
DROP POLICY IF EXISTS "Members can create deals" ON public.deals;
DROP POLICY IF EXISTS "Admins or owners can update deals" ON public.deals;
DROP POLICY IF EXISTS "Admins can delete deals" ON public.deals;
CREATE POLICY "Members can view deals" ON public.deals FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create deals" ON public.deals FOR INSERT TO authenticated WITH CHECK (is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins or owners can update deals" ON public.deals FOR UPDATE TO authenticated USING (is_company_admin(auth.uid(), company_id) OR owner_id = auth.uid() OR created_by = auth.uid());
CREATE POLICY "Admins can delete deals" ON public.deals FOR DELETE TO authenticated USING (is_company_admin(auth.uid(), company_id));

-- =================== employees ===================
DROP POLICY IF EXISTS "Members can view employees" ON public.employees;
DROP POLICY IF EXISTS "Admins can create employees" ON public.employees;
DROP POLICY IF EXISTS "Admins can update employees" ON public.employees;
DROP POLICY IF EXISTS "Admins can delete employees" ON public.employees;
CREATE POLICY "Members can view employees" ON public.employees FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins can create employees" ON public.employees FOR INSERT TO authenticated WITH CHECK (is_company_admin(auth.uid(), company_id));
CREATE POLICY "Admins can update employees" ON public.employees FOR UPDATE TO authenticated USING (is_company_admin(auth.uid(), company_id));
CREATE POLICY "Admins can delete employees" ON public.employees FOR DELETE TO authenticated USING (is_company_admin(auth.uid(), company_id));

-- =================== integration_configs ===================
DROP POLICY IF EXISTS "Members can view integrations" ON public.integration_configs;
DROP POLICY IF EXISTS "Admins can create integrations" ON public.integration_configs;
DROP POLICY IF EXISTS "Admins can update integrations" ON public.integration_configs;
DROP POLICY IF EXISTS "Admins can delete integrations" ON public.integration_configs;
CREATE POLICY "Members can view integrations" ON public.integration_configs FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins can create integrations" ON public.integration_configs FOR INSERT TO authenticated WITH CHECK (is_company_admin(auth.uid(), company_id));
CREATE POLICY "Admins can update integrations" ON public.integration_configs FOR UPDATE TO authenticated USING (is_company_admin(auth.uid(), company_id));
CREATE POLICY "Admins can delete integrations" ON public.integration_configs FOR DELETE TO authenticated USING (is_company_admin(auth.uid(), company_id));

-- =================== invoices ===================
DROP POLICY IF EXISTS "Members can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Members can create invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admins or creators can update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admins can delete invoices" ON public.invoices;
CREATE POLICY "Members can view invoices" ON public.invoices FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create invoices" ON public.invoices FOR INSERT TO authenticated WITH CHECK (is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins or creators can update invoices" ON public.invoices FOR UPDATE TO authenticated USING (is_company_admin(auth.uid(), company_id) OR created_by = auth.uid());
CREATE POLICY "Admins can delete invoices" ON public.invoices FOR DELETE TO authenticated USING (is_company_admin(auth.uid(), company_id));

-- =================== profiles ===================
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view company profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can view company profiles" ON public.profiles FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM company_memberships cm1 JOIN company_memberships cm2 ON cm1.company_id = cm2.company_id WHERE cm1.user_id = auth.uid() AND cm2.user_id = profiles.user_id));
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- =================== project_deliverables ===================
DROP POLICY IF EXISTS "Members can view deliverables" ON public.project_deliverables;
DROP POLICY IF EXISTS "Members can create deliverables" ON public.project_deliverables;
DROP POLICY IF EXISTS "Members can update deliverables" ON public.project_deliverables;
DROP POLICY IF EXISTS "Admins can delete deliverables" ON public.project_deliverables;
CREATE POLICY "Members can view deliverables" ON public.project_deliverables FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_deliverables.project_id AND is_company_member(auth.uid(), p.company_id)));
CREATE POLICY "Members can create deliverables" ON public.project_deliverables FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_deliverables.project_id AND is_company_member(auth.uid(), p.company_id)));
CREATE POLICY "Members can update deliverables" ON public.project_deliverables FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_deliverables.project_id AND is_company_member(auth.uid(), p.company_id)));
CREATE POLICY "Admins can delete deliverables" ON public.project_deliverables FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_deliverables.project_id AND is_company_admin(auth.uid(), p.company_id)));

-- =================== projects ===================
DROP POLICY IF EXISTS "Members can view projects" ON public.projects;
DROP POLICY IF EXISTS "Members can create projects" ON public.projects;
DROP POLICY IF EXISTS "Admins or owners can update projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can delete projects" ON public.projects;
CREATE POLICY "Members can view projects" ON public.projects FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins or owners can update projects" ON public.projects FOR UPDATE TO authenticated USING (is_company_admin(auth.uid(), company_id) OR owner_id = auth.uid() OR created_by = auth.uid());
CREATE POLICY "Admins can delete projects" ON public.projects FOR DELETE TO authenticated USING (is_company_admin(auth.uid(), company_id));

-- =================== purchase_orders ===================
DROP POLICY IF EXISTS "Members can view purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Members can create purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Admins can update purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Admins can delete purchase_orders" ON public.purchase_orders;
CREATE POLICY "Members can view purchase_orders" ON public.purchase_orders FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create purchase_orders" ON public.purchase_orders FOR INSERT TO authenticated WITH CHECK (is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins can update purchase_orders" ON public.purchase_orders FOR UPDATE TO authenticated USING (is_company_admin(auth.uid(), company_id));
CREATE POLICY "Admins can delete purchase_orders" ON public.purchase_orders FOR DELETE TO authenticated USING (is_company_admin(auth.uid(), company_id));

-- =================== suppliers ===================
DROP POLICY IF EXISTS "Members can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Members can create suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins can update suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins can delete suppliers" ON public.suppliers;
CREATE POLICY "Members can view suppliers" ON public.suppliers FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create suppliers" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins can update suppliers" ON public.suppliers FOR UPDATE TO authenticated USING (is_company_admin(auth.uid(), company_id));
CREATE POLICY "Admins can delete suppliers" ON public.suppliers FOR DELETE TO authenticated USING (is_company_admin(auth.uid(), company_id));

-- =================== tasks ===================
DROP POLICY IF EXISTS "Members can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Members can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Members can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can delete tasks" ON public.tasks;
CREATE POLICY "Members can view tasks" ON public.tasks FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can update tasks" ON public.tasks FOR UPDATE TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins can delete tasks" ON public.tasks FOR DELETE TO authenticated USING (is_company_admin(auth.uid(), company_id));

-- =================== teams ===================
DROP POLICY IF EXISTS "Members can view teams" ON public.teams;
DROP POLICY IF EXISTS "Admins can create teams" ON public.teams;
DROP POLICY IF EXISTS "Admins can update teams" ON public.teams;
DROP POLICY IF EXISTS "Admins can delete teams" ON public.teams;
CREATE POLICY "Members can view teams" ON public.teams FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins can create teams" ON public.teams FOR INSERT TO authenticated WITH CHECK (is_company_admin(auth.uid(), company_id));
CREATE POLICY "Admins can update teams" ON public.teams FOR UPDATE TO authenticated USING (is_company_admin(auth.uid(), company_id));
CREATE POLICY "Admins can delete teams" ON public.teams FOR DELETE TO authenticated USING (is_company_admin(auth.uid(), company_id));

-- =================== team_members ===================
DROP POLICY IF EXISTS "Members can view team_members" ON public.team_members;
DROP POLICY IF EXISTS "Admins can create team_members" ON public.team_members;
DROP POLICY IF EXISTS "Admins can delete team_members" ON public.team_members;
CREATE POLICY "Members can view team_members" ON public.team_members FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins can create team_members" ON public.team_members FOR INSERT TO authenticated WITH CHECK (is_company_admin(auth.uid(), company_id));
CREATE POLICY "Admins can delete team_members" ON public.team_members FOR DELETE TO authenticated USING (is_company_admin(auth.uid(), company_id));

-- =================== transactions ===================
DROP POLICY IF EXISTS "Members can view transactions" ON public.transactions;
DROP POLICY IF EXISTS "Members can create transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins or creators can update transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can delete transactions" ON public.transactions;
CREATE POLICY "Members can view transactions" ON public.transactions FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create transactions" ON public.transactions FOR INSERT TO authenticated WITH CHECK (is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins or creators can update transactions" ON public.transactions FOR UPDATE TO authenticated USING (is_company_admin(auth.uid(), company_id) OR created_by = auth.uid());
CREATE POLICY "Admins can delete transactions" ON public.transactions FOR DELETE TO authenticated USING (is_company_admin(auth.uid(), company_id));

-- =================== user_sector_permissions ===================
DROP POLICY IF EXISTS "Members can view permissions" ON public.user_sector_permissions;
DROP POLICY IF EXISTS "Admins can create permissions" ON public.user_sector_permissions;
DROP POLICY IF EXISTS "Admins can update permissions" ON public.user_sector_permissions;
DROP POLICY IF EXISTS "Admins can delete permissions" ON public.user_sector_permissions;
CREATE POLICY "Members can view permissions" ON public.user_sector_permissions FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins can create permissions" ON public.user_sector_permissions FOR INSERT TO authenticated WITH CHECK (is_company_admin(auth.uid(), company_id));
CREATE POLICY "Admins can update permissions" ON public.user_sector_permissions FOR UPDATE TO authenticated USING (is_company_admin(auth.uid(), company_id));
CREATE POLICY "Admins can delete permissions" ON public.user_sector_permissions FOR DELETE TO authenticated USING (is_company_admin(auth.uid(), company_id));

-- =================== workspace_columns ===================
DROP POLICY IF EXISTS "Members can view workspace_columns" ON public.workspace_columns;
DROP POLICY IF EXISTS "Members can create workspace_columns" ON public.workspace_columns;
DROP POLICY IF EXISTS "Members can update workspace_columns" ON public.workspace_columns;
DROP POLICY IF EXISTS "Admins can delete workspace_columns" ON public.workspace_columns;
CREATE POLICY "Members can view workspace_columns" ON public.workspace_columns FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create workspace_columns" ON public.workspace_columns FOR INSERT TO authenticated WITH CHECK (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can update workspace_columns" ON public.workspace_columns FOR UPDATE TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins can delete workspace_columns" ON public.workspace_columns FOR DELETE TO authenticated USING (is_company_admin(auth.uid(), company_id));
