ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS labor_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS supplies_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revenue numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source_deal_id uuid;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS total_cost numeric GENERATED ALWAYS AS (labor_cost + supplies_cost) STORED;

ALTER TABLE public.crm_pipeline_deals
  ADD COLUMN IF NOT EXISTS converted_project_id uuid;

CREATE INDEX IF NOT EXISTS idx_projects_source_deal_id ON public.projects(source_deal_id);
CREATE INDEX IF NOT EXISTS idx_crm_pipeline_deals_converted_project_id ON public.crm_pipeline_deals(converted_project_id);