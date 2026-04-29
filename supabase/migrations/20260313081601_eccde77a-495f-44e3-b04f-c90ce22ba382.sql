ALTER TABLE public.companies
  ALTER COLUMN language SET DEFAULT 'en',
  ALTER COLUMN timezone SET DEFAULT 'America/New_York',
  ALTER COLUMN locale SET DEFAULT 'en-US';