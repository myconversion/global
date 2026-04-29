
-- Adicionar coluna access_type na tabela integration_configs
ALTER TABLE public.integration_configs
ADD COLUMN access_type text NOT NULL DEFAULT 'company_wide';

-- Criar tabela de acesso por usuário
CREATE TABLE public.integration_user_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES public.integration_configs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(integration_id, user_id)
);

-- Habilitar RLS
ALTER TABLE public.integration_user_access ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Members can view integration_user_access"
ON public.integration_user_access
FOR SELECT TO authenticated
USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Admins can insert integration_user_access"
ON public.integration_user_access
FOR INSERT TO authenticated
WITH CHECK (is_company_admin(auth.uid(), company_id));

CREATE POLICY "Admins can delete integration_user_access"
ON public.integration_user_access
FOR DELETE TO authenticated
USING (is_company_admin(auth.uid(), company_id));
