
-- Custom Kanban columns per project/workspace
CREATE TABLE public.workspace_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#6B7280',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workspace_columns ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Members can view workspace_columns"
  ON public.workspace_columns FOR SELECT
  USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Members can create workspace_columns"
  ON public.workspace_columns FOR INSERT
  WITH CHECK (is_company_member(auth.uid(), company_id));

CREATE POLICY "Members can update workspace_columns"
  ON public.workspace_columns FOR UPDATE
  USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Admins can delete workspace_columns"
  ON public.workspace_columns FOR DELETE
  USING (is_company_admin(auth.uid(), company_id));

-- Now we need tasks to reference a workspace_column instead of fixed status
-- Add a nullable column_id to tasks for custom column support
ALTER TABLE public.tasks ADD COLUMN workspace_column_id uuid REFERENCES public.workspace_columns(id) ON DELETE SET NULL;
