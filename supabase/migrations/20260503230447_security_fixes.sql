-- =============================================================================
-- Security fixes — 2026-05-03
-- =============================================================================

-- -----------------------------------------------------------------------------
-- FIX 1: company_memberships INSERT policy — privilege escalation via
--         self-enrollment.
--
--         The original policy allowed `user_id = auth.uid()` as an alternative
--         to being a company admin, meaning any authenticated user could add
--         themselves to any company simply by knowing its UUID.
--
--         Fix: remove the self-enrollment clause. Only company admins
--         (or super admins) may create memberships.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can manage memberships" ON public.company_memberships;

CREATE POLICY "Admins can manage memberships"
  ON public.company_memberships
  FOR INSERT
  WITH CHECK (public.is_company_admin(auth.uid(), company_id));


-- -----------------------------------------------------------------------------
-- FIX 2: integration_configs — add missing updated_at trigger.
--
--         The table has an updated_at column but no trigger to keep it current,
--         meaning manual updates bypass the timestamp.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_integration_configs_updated_at'
      AND tgrelid = 'public.integration_configs'::regclass
  ) THEN
    CREATE TRIGGER update_integration_configs_updated_at
      BEFORE UPDATE ON public.integration_configs
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;


-- -----------------------------------------------------------------------------
-- FIX 3: activity_logs — add admin DELETE policy so audit logs can be pruned
--         by company admins (e.g., data retention compliance).
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can delete logs" ON public.activity_logs;

CREATE POLICY "Admins can delete logs"
  ON public.activity_logs
  FOR DELETE
  USING (public.is_company_admin(auth.uid(), company_id));
