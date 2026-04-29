
-- Add business_unit_id to all key data tables (nullable, optional)
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS business_unit_id uuid REFERENCES public.business_units(id) ON DELETE SET NULL;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS business_unit_id uuid REFERENCES public.business_units(id) ON DELETE SET NULL;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS business_unit_id uuid REFERENCES public.business_units(id) ON DELETE SET NULL;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS business_unit_id uuid REFERENCES public.business_units(id) ON DELETE SET NULL;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS business_unit_id uuid REFERENCES public.business_units(id) ON DELETE SET NULL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS business_unit_id uuid REFERENCES public.business_units(id) ON DELETE SET NULL;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS business_unit_id uuid REFERENCES public.business_units(id) ON DELETE SET NULL;
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS business_unit_id uuid REFERENCES public.business_units(id) ON DELETE SET NULL;
ALTER TABLE public.crm_companies ADD COLUMN IF NOT EXISTS business_unit_id uuid REFERENCES public.business_units(id) ON DELETE SET NULL;
ALTER TABLE public.crm_pipeline_deals ADD COLUMN IF NOT EXISTS business_unit_id uuid REFERENCES public.business_units(id) ON DELETE SET NULL;
ALTER TABLE public.communication_conversations ADD COLUMN IF NOT EXISTS business_unit_id uuid REFERENCES public.business_units(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_bu ON public.transactions(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_invoices_bu ON public.invoices(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_employees_bu ON public.employees(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_bu ON public.suppliers(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_bu ON public.purchase_orders(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_clients_bu ON public.clients(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_deals_bu ON public.deals(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_bu ON public.crm_contacts(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_crm_companies_bu ON public.crm_companies(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_crm_pipeline_deals_bu ON public.crm_pipeline_deals(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_comm_conversations_bu ON public.communication_conversations(business_unit_id);
