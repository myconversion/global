-- Add new origin values to crm_origin enum
-- New values: facebook, instagram, site, prospeccao_ativa, midia_offline

ALTER TYPE public.crm_origin ADD VALUE IF NOT EXISTS 'facebook';
ALTER TYPE public.crm_origin ADD VALUE IF NOT EXISTS 'instagram';
ALTER TYPE public.crm_origin ADD VALUE IF NOT EXISTS 'site';
ALTER TYPE public.crm_origin ADD VALUE IF NOT EXISTS 'prospeccao_ativa';
ALTER TYPE public.crm_origin ADD VALUE IF NOT EXISTS 'midia_offline';
