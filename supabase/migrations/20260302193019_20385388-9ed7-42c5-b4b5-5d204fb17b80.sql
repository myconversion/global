
-- =====================================================
-- FASE 6: ERP Schema — Enums, Tables, Functions, RLS
-- =====================================================

-- ── Enums ──
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'collaborator');
CREATE TYPE public.project_status AS ENUM ('active', 'paused', 'completed', 'archived');
CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'review', 'done', 'blocked');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.deal_stage AS ENUM ('lead', 'contact', 'proposal', 'negotiation', 'closed_won', 'closed_lost');
CREATE TYPE public.activity_type AS ENUM ('call', 'email', 'meeting', 'note', 'task');
CREATE TYPE public.transaction_type AS ENUM ('income', 'expense');
CREATE TYPE public.transaction_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled');
CREATE TYPE public.recurrence_frequency AS ENUM ('none', 'weekly', 'monthly', 'yearly');
CREATE TYPE public.invoice_status AS ENUM ('draft', 'issued', 'cancelled');
CREATE TYPE public.purchase_order_status AS ENUM ('pending', 'approved', 'received', 'cancelled');
CREATE TYPE public.employment_type AS ENUM ('clt', 'pj', 'intern', 'freelancer');
CREATE TYPE public.sector_enum AS ENUM ('crm', 'projects', 'tasks', 'financial', 'fiscal', 'purchases', 'hr', 'communication', 'bi');

-- ── Companies ──
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cnpj TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Profiles ──
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Company Memberships ──
CREATE TABLE public.company_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'collaborator',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- ── User Roles (for has_role pattern) ──
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- ── Sector Permissions ──
CREATE TABLE public.user_sector_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sector public.sector_enum NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id, sector)
);

-- ── Clients ──
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cnpj TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  contact_name TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Deals ──
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  stage public.deal_stage NOT NULL DEFAULT 'lead',
  probability INTEGER NOT NULL DEFAULT 0,
  owner_id UUID REFERENCES auth.users(id),
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  source TEXT,
  expected_close_date DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── CRM Activities ──
CREATE TABLE public.crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type public.activity_type NOT NULL DEFAULT 'note',
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Projects ──
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  status public.project_status NOT NULL DEFAULT 'active',
  owner_id UUID REFERENCES auth.users(id),
  start_date DATE,
  end_date DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Project Deliverables ──
CREATE TABLE public.project_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Tasks ──
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_deliverable_id UUID NOT NULL REFERENCES public.project_deliverables(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status public.task_status NOT NULL DEFAULT 'todo',
  priority public.task_priority NOT NULL DEFAULT 'medium',
  assignee_id UUID REFERENCES auth.users(id),
  tags TEXT[] DEFAULT '{}',
  start_date DATE,
  due_date DATE,
  position INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Transactions ──
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type public.transaction_type NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  value NUMERIC NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  status public.transaction_status NOT NULL DEFAULT 'pending',
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  recurrence public.recurrence_frequency NOT NULL DEFAULT 'none',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── NFS-e Invoices ──
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  number TEXT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  status public.invoice_status NOT NULL DEFAULT 'draft',
  issued_at TIMESTAMPTZ,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Suppliers ──
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cnpj TEXT,
  email TEXT,
  phone TEXT,
  category TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Purchase Orders ──
CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]',
  total_value NUMERIC NOT NULL DEFAULT 0,
  status public.purchase_order_status NOT NULL DEFAULT 'pending',
  expected_date DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Employees ──
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT '',
  department TEXT,
  employment_type public.employment_type NOT NULL DEFAULT 'clt',
  salary NUMERIC,
  hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Activity Log ──
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- Helper Functions (SECURITY DEFINER)
-- =====================================================

-- Check if user is member of a company
CREATE OR REPLACE FUNCTION public.is_company_member(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id AND company_id = _company_id
  );
$$;

-- Check if user is admin of a company
CREATE OR REPLACE FUNCTION public.is_company_admin(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id AND company_id = _company_id AND role IN ('admin', 'super_admin')
  );
$$;

-- Check if user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id AND role = 'super_admin'
  );
$$;

-- Get user's company_id (first membership)
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.company_memberships
  WHERE user_id = _user_id
  LIMIT 1;
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- Enable RLS on all tables
-- =====================================================
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sector_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies
-- =====================================================

-- ── Profiles ──
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can view company profiles" ON public.profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.company_memberships cm1
    JOIN public.company_memberships cm2 ON cm1.company_id = cm2.company_id
    WHERE cm1.user_id = auth.uid() AND cm2.user_id = profiles.user_id)
);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (user_id = auth.uid());

-- ── Companies ──
CREATE POLICY "Members can view company" ON public.companies FOR SELECT USING (public.is_company_member(auth.uid(), id));
CREATE POLICY "Admins can update company" ON public.companies FOR UPDATE USING (public.is_company_admin(auth.uid(), id));
CREATE POLICY "Authenticated can create company" ON public.companies FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Super admins can delete company" ON public.companies FOR DELETE USING (public.is_super_admin(auth.uid()));

-- ── Company Memberships ──
CREATE POLICY "Members can view memberships" ON public.company_memberships FOR SELECT USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins can manage memberships" ON public.company_memberships FOR INSERT WITH CHECK (
  public.is_company_admin(auth.uid(), company_id) OR user_id = auth.uid()
);
CREATE POLICY "Admins can update memberships" ON public.company_memberships FOR UPDATE USING (public.is_company_admin(auth.uid(), company_id));
CREATE POLICY "Admins can delete memberships" ON public.company_memberships FOR DELETE USING (public.is_company_admin(auth.uid(), company_id));

-- ── User Roles ──
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.is_super_admin(auth.uid()));

-- ── Sector Permissions ──
CREATE POLICY "Members can view sector permissions" ON public.user_sector_permissions FOR SELECT USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins can manage sector permissions" ON public.user_sector_permissions FOR INSERT WITH CHECK (public.is_company_admin(auth.uid(), company_id));
CREATE POLICY "Admins can update sector permissions" ON public.user_sector_permissions FOR UPDATE USING (public.is_company_admin(auth.uid(), company_id));
CREATE POLICY "Admins can delete sector permissions" ON public.user_sector_permissions FOR DELETE USING (public.is_company_admin(auth.uid(), company_id));

-- ── Clients ──
CREATE POLICY "Members can view clients" ON public.clients FOR SELECT USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create clients" ON public.clients FOR INSERT WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins or creators can update clients" ON public.clients FOR UPDATE USING (
  public.is_company_admin(auth.uid(), company_id) OR created_by = auth.uid()
);
CREATE POLICY "Admins can delete clients" ON public.clients FOR DELETE USING (public.is_company_admin(auth.uid(), company_id));

-- ── Deals ──
CREATE POLICY "Members can view deals" ON public.deals FOR SELECT USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create deals" ON public.deals FOR INSERT WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins or owners can update deals" ON public.deals FOR UPDATE USING (
  public.is_company_admin(auth.uid(), company_id) OR owner_id = auth.uid() OR created_by = auth.uid()
);
CREATE POLICY "Admins can delete deals" ON public.deals FOR DELETE USING (public.is_company_admin(auth.uid(), company_id));

-- ── CRM Activities ──
CREATE POLICY "Members can view activities" ON public.crm_activities FOR SELECT USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create activities" ON public.crm_activities FOR INSERT WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "Creator can update activities" ON public.crm_activities FOR UPDATE USING (user_id = auth.uid() OR public.is_company_admin(auth.uid(), company_id));
CREATE POLICY "Admins can delete activities" ON public.crm_activities FOR DELETE USING (public.is_company_admin(auth.uid(), company_id));

-- ── Projects ──
CREATE POLICY "Members can view projects" ON public.projects FOR SELECT USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create projects" ON public.projects FOR INSERT WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins or owners can update projects" ON public.projects FOR UPDATE USING (
  public.is_company_admin(auth.uid(), company_id) OR owner_id = auth.uid() OR created_by = auth.uid()
);
CREATE POLICY "Admins can delete projects" ON public.projects FOR DELETE USING (public.is_company_admin(auth.uid(), company_id));

-- ── Project Deliverables (inherit project access via join) ──
CREATE POLICY "Members can view deliverables" ON public.project_deliverables FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND public.is_company_member(auth.uid(), p.company_id))
);
CREATE POLICY "Members can create deliverables" ON public.project_deliverables FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND public.is_company_member(auth.uid(), p.company_id))
);
CREATE POLICY "Members can update deliverables" ON public.project_deliverables FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND public.is_company_member(auth.uid(), p.company_id))
);
CREATE POLICY "Admins can delete deliverables" ON public.project_deliverables FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND public.is_company_admin(auth.uid(), p.company_id))
);

-- ── Tasks ──
CREATE POLICY "Members can view tasks" ON public.tasks FOR SELECT USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create tasks" ON public.tasks FOR INSERT WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins or assignees can update tasks" ON public.tasks FOR UPDATE USING (
  public.is_company_admin(auth.uid(), company_id) OR assignee_id = auth.uid() OR created_by = auth.uid()
);
CREATE POLICY "Admins can delete tasks" ON public.tasks FOR DELETE USING (public.is_company_admin(auth.uid(), company_id));

-- ── Transactions ──
CREATE POLICY "Members can view transactions" ON public.transactions FOR SELECT USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create transactions" ON public.transactions FOR INSERT WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins or creators can update transactions" ON public.transactions FOR UPDATE USING (
  public.is_company_admin(auth.uid(), company_id) OR created_by = auth.uid()
);
CREATE POLICY "Admins can delete transactions" ON public.transactions FOR DELETE USING (public.is_company_admin(auth.uid(), company_id));

-- ── Invoices ──
CREATE POLICY "Members can view invoices" ON public.invoices FOR SELECT USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create invoices" ON public.invoices FOR INSERT WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins or creators can update invoices" ON public.invoices FOR UPDATE USING (
  public.is_company_admin(auth.uid(), company_id) OR created_by = auth.uid()
);
CREATE POLICY "Admins can delete invoices" ON public.invoices FOR DELETE USING (public.is_company_admin(auth.uid(), company_id));

-- ── Suppliers ──
CREATE POLICY "Members can view suppliers" ON public.suppliers FOR SELECT USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create suppliers" ON public.suppliers FOR INSERT WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins or creators can update suppliers" ON public.suppliers FOR UPDATE USING (
  public.is_company_admin(auth.uid(), company_id) OR created_by = auth.uid()
);
CREATE POLICY "Admins can delete suppliers" ON public.suppliers FOR DELETE USING (public.is_company_admin(auth.uid(), company_id));

-- ── Purchase Orders ──
CREATE POLICY "Members can view purchase orders" ON public.purchase_orders FOR SELECT USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create purchase orders" ON public.purchase_orders FOR INSERT WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins or creators can update purchase orders" ON public.purchase_orders FOR UPDATE USING (
  public.is_company_admin(auth.uid(), company_id) OR created_by = auth.uid()
);
CREATE POLICY "Admins can delete purchase orders" ON public.purchase_orders FOR DELETE USING (public.is_company_admin(auth.uid(), company_id));

-- ── Employees ──
CREATE POLICY "Members can view employees" ON public.employees FOR SELECT USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins can create employees" ON public.employees FOR INSERT WITH CHECK (public.is_company_admin(auth.uid(), company_id));
CREATE POLICY "Admins can update employees" ON public.employees FOR UPDATE USING (public.is_company_admin(auth.uid(), company_id));
CREATE POLICY "Admins can delete employees" ON public.employees FOR DELETE USING (public.is_company_admin(auth.uid(), company_id));

-- ── Activity Logs ──
CREATE POLICY "Members can view logs" ON public.activity_logs FOR SELECT USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create logs" ON public.activity_logs FOR INSERT WITH CHECK (public.is_company_member(auth.uid(), company_id));

-- ── Indexes ──
CREATE INDEX idx_memberships_user ON public.company_memberships(user_id);
CREATE INDEX idx_memberships_company ON public.company_memberships(company_id);
CREATE INDEX idx_clients_company ON public.clients(company_id);
CREATE INDEX idx_deals_company ON public.deals(company_id);
CREATE INDEX idx_deals_stage ON public.deals(stage);
CREATE INDEX idx_projects_company ON public.projects(company_id);
CREATE INDEX idx_tasks_company ON public.tasks(company_id);
CREATE INDEX idx_transactions_company ON public.transactions(company_id);
CREATE INDEX idx_invoices_company ON public.invoices(company_id);
CREATE INDEX idx_suppliers_company ON public.suppliers(company_id);
CREATE INDEX idx_purchase_orders_company ON public.purchase_orders(company_id);
CREATE INDEX idx_employees_company ON public.employees(company_id);
CREATE INDEX idx_sector_permissions_user ON public.user_sector_permissions(user_id, company_id);
