-- =============================================================================
-- Isolamento de dados por colaborador em todos os módulos CRM
-- Regra: Admin vê tudo. Colaborador vê apenas registros onde é
--        responsible_id OU created_by (ou assigned_to / user_id conforme tabela).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. crm_contacts
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view crm_contacts"          ON public.crm_contacts;
DROP POLICY IF EXISTS "Admins view all crm_contacts"           ON public.crm_contacts;
DROP POLICY IF EXISTS "Collaborators view own crm_contacts"    ON public.crm_contacts;

CREATE POLICY "Admins view all crm_contacts"
  ON public.crm_contacts FOR SELECT TO authenticated
  USING (public.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Collaborators view own crm_contacts"
  ON public.crm_contacts FOR SELECT TO authenticated
  USING (
    public.is_company_member(auth.uid(), company_id)
    AND (responsible_id = auth.uid() OR created_by = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 2. crm_companies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view crm_companies"         ON public.crm_companies;
DROP POLICY IF EXISTS "Admins view all crm_companies"          ON public.crm_companies;
DROP POLICY IF EXISTS "Collaborators view own crm_companies"   ON public.crm_companies;

CREATE POLICY "Admins view all crm_companies"
  ON public.crm_companies FOR SELECT TO authenticated
  USING (public.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Collaborators view own crm_companies"
  ON public.crm_companies FOR SELECT TO authenticated
  USING (
    public.is_company_member(auth.uid(), company_id)
    AND (responsible_id = auth.uid() OR created_by = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 3. crm_contact_company  (pivot — não tem responsible_id/created_by)
--    Colaborador vê o vínculo se for dono do contato OU da empresa.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view crm_contact_company"        ON public.crm_contact_company;
DROP POLICY IF EXISTS "Admins view all crm_contact_company"         ON public.crm_contact_company;
DROP POLICY IF EXISTS "Collaborators view own crm_contact_company"  ON public.crm_contact_company;

CREATE POLICY "Admins view all crm_contact_company"
  ON public.crm_contact_company FOR SELECT TO authenticated
  USING (public.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Collaborators view own crm_contact_company"
  ON public.crm_contact_company FOR SELECT TO authenticated
  USING (
    public.is_company_member(auth.uid(), company_id)
    AND (
      EXISTS (
        SELECT 1 FROM public.crm_contacts c
        WHERE c.id = crm_contact_company.contact_id
          AND (c.responsible_id = auth.uid() OR c.created_by = auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM public.crm_companies co
        WHERE co.id = crm_contact_company.crm_company_id
          AND (co.responsible_id = auth.uid() OR co.created_by = auth.uid())
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 4. crm_interactions
--    user_id = autor da interação.
--    Colaborador vê: interações que criou (user_id) OU interações em
--    contatos/empresas/deals que lhe pertencem.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view crm_interactions"        ON public.crm_interactions;
DROP POLICY IF EXISTS "Admins view all crm_interactions"         ON public.crm_interactions;
DROP POLICY IF EXISTS "Collaborators view own crm_interactions"  ON public.crm_interactions;

CREATE POLICY "Admins view all crm_interactions"
  ON public.crm_interactions FOR SELECT TO authenticated
  USING (public.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Collaborators view own crm_interactions"
  ON public.crm_interactions FOR SELECT TO authenticated
  USING (
    public.is_company_member(auth.uid(), company_id)
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.crm_contacts c
        WHERE c.id = crm_interactions.contact_id
          AND (c.responsible_id = auth.uid() OR c.created_by = auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM public.crm_companies co
        WHERE co.id = crm_interactions.crm_company_id
          AND (co.responsible_id = auth.uid() OR co.created_by = auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM public.crm_pipeline_deals d
        WHERE d.id = crm_interactions.deal_id
          AND (d.responsible_id = auth.uid() OR d.created_by = auth.uid())
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 5. crm_followups
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view crm_followups"          ON public.crm_followups;
DROP POLICY IF EXISTS "Admins view all crm_followups"           ON public.crm_followups;
DROP POLICY IF EXISTS "Collaborators view own crm_followups"    ON public.crm_followups;

CREATE POLICY "Admins view all crm_followups"
  ON public.crm_followups FOR SELECT TO authenticated
  USING (public.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Collaborators view own crm_followups"
  ON public.crm_followups FOR SELECT TO authenticated
  USING (
    public.is_company_member(auth.uid(), company_id)
    AND (assigned_to = auth.uid() OR created_by = auth.uid())
  );
