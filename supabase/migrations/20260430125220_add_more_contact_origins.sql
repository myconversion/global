-- Add more contact origin values to crm_origin enum
ALTER TYPE public.crm_origin ADD VALUE IF NOT EXISTS 'indicacao_gestor';
ALTER TYPE public.crm_origin ADD VALUE IF NOT EXISTS 'parcerias';
ALTER TYPE public.crm_origin ADD VALUE IF NOT EXISTS 'indicacao_cliente';
