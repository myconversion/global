import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface IntegrationAccessInfo {
  id: string;
  type: string;
  name: string;
  is_active: boolean;
  access_type: string;
}

/**
 * Hook que verifica quais integrações ativas o usuário atual tem acesso.
 * Admins têm acesso a todas. Colaboradores só veem integrações company_wide
 * ou aquelas onde foram explicitamente vinculados em integration_user_access.
 */
export function useIntegrationAccess() {
  const { currentCompany, supabaseUser, role } = useAuth();
  const [accessibleIntegrations, setAccessibleIntegrations] = useState<IntegrationAccessInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const companyId = currentCompany?.id;
  const userId = supabaseUser?.id;
  const isAdmin = role === 'admin' || role === 'super_admin';

  const load = useCallback(async () => {
    if (!companyId || !userId) {
      setAccessibleIntegrations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Admins query the table directly (RLS allows it)
      if (isAdmin) {
        const { data } = await supabase
          .from('integration_configs')
          .select('id, type, name, is_active, access_type')
          .eq('company_id', companyId)
          .eq('is_active', true);
        setAccessibleIntegrations((data || []) as IntegrationAccessInfo[]);
      } else {
        // Non-admins use the secure RPC that excludes sensitive config field
        const { data: allConfigs } = await supabase
          .rpc('get_company_integrations', { _company_id: companyId });

        if (!allConfigs || allConfigs.length === 0) {
          setAccessibleIntegrations([]);
          setLoading(false);
          return;
        }

        const companyWide = (allConfigs as IntegrationAccessInfo[]).filter(c => c.access_type === 'company_wide');

        const restrictedIds = (allConfigs as IntegrationAccessInfo[])
          .filter(c => c.access_type === 'restricted')
          .map(c => c.id);

        let userRestricted: IntegrationAccessInfo[] = [];
        if (restrictedIds.length > 0) {
          const { data: accessRows } = await supabase
            .from('integration_user_access')
            .select('integration_id')
            .eq('user_id', userId)
            .in('integration_id', restrictedIds);

          if (accessRows && accessRows.length > 0) {
            const allowedIds = new Set(accessRows.map((r: any) => r.integration_id));
            userRestricted = (allConfigs as IntegrationAccessInfo[]).filter(
              c => c.access_type === 'restricted' && allowedIds.has(c.id)
            );
          }
        }

        setAccessibleIntegrations([...companyWide, ...userRestricted]);
      }
    } catch (err) {
      console.error('Error loading integration access:', err);
      setAccessibleIntegrations([]);
    }
    setLoading(false);
  }, [companyId, userId, isAdmin]);

  useEffect(() => { load(); }, [load]);

  /** Verifica se o usuário tem acesso a pelo menos uma integração do tipo informado */
  const hasAccessToType = useCallback((type: string): boolean => {
    return accessibleIntegrations.some(i => i.type === type || i.type.startsWith(type));
  }, [accessibleIntegrations]);

  /** Retorna integrações acessíveis filtradas por tipo */
  const getByType = useCallback((type: string): IntegrationAccessInfo[] => {
    return accessibleIntegrations.filter(i => i.type === type || i.type.startsWith(type));
  }, [accessibleIntegrations]);

  /**
   * Mapeia canal de comunicação para tipo(s) de integração.
   * Retorna true se o usuário tem acesso a pelo menos uma integração do canal.
   */
  const hasChannelAccess = useCallback((channel: string): boolean => {
    const channelTypeMap: Record<string, string[]> = {
      whatsapp: ['whatsapp'],
      email: ['email_smtp', 'email_resend'],
      instagram: ['instagram_direct'],
      facebook: ['facebook_messenger'],
      voip: ['voip'],
    };
    const types = channelTypeMap[channel];
    if (!types) return true; // canal desconhecido = sem restrição
    return types.some(t => hasAccessToType(t));
  }, [hasAccessToType]);

  return {
    accessibleIntegrations,
    loading,
    hasAccessToType,
    getByType,
    hasChannelAccess,
    reload: load,
  };
}
