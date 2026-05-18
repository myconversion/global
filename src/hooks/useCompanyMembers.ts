import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CompanyMember {
  id: string;
  name: string;
}

export function useCompanyMembers() {
  const { currentCompany } = useAuth();
  return useQuery<CompanyMember[]>({
    queryKey: ['company-members', currentCompany?.id],
    enabled: !!currentCompany,
    staleTime: 300_000,
    queryFn: async () => {
      const { data: memberships } = await supabase
        .from('company_memberships')
        .select('user_id')
        .eq('company_id', currentCompany!.id);
      if (!memberships?.length) return [];
      const uids = memberships.map((m: any) => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name')
        .in('user_id', uids);
      return (profiles ?? []).map((p: any) => ({
        id: p.user_id,
        name: p.name ?? p.user_id,
      }));
    },
  });
}
