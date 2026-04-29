import { supabase } from '@/integrations/supabase/client';

export interface ExportResult {
  version: string;
  exportedAt: string;
  workspace: {
    name: string;
    companyId: string;
  };
  data: {
    contacts: any[];
    companies: any[];
    pipelines: any[];
    deals: any[];
    followups: any[];
    interactions: any[];
    teams: any[];
    customRoles: any[];
    customFieldDefinitions: any[];
  };
  statistics: Record<string, number>;
}

export async function exportWorkspaceBackup(companyId: string, companyName: string): Promise<ExportResult> {
  const [
    { data: contacts },
    { data: crmCompanies },
    { data: pipelines },
    { data: deals },
    { data: followups },
    { data: interactions },
    { data: teams },
    { data: customRoles },
    { data: customFields },
  ] = await Promise.all([
    supabase.from('crm_contacts').select('*').eq('company_id', companyId),
    supabase.from('crm_companies').select('*').eq('company_id', companyId),
    supabase.from('crm_pipelines').select('*').eq('company_id', companyId),
    supabase.from('crm_pipeline_deals').select('*').eq('company_id', companyId),
    supabase.from('crm_followups').select('*').eq('company_id', companyId),
    supabase.from('crm_interactions').select('*').eq('company_id', companyId),
    supabase.from('teams').select('*').eq('company_id', companyId),
    supabase.from('custom_roles').select('*').eq('company_id', companyId),
    supabase.from('custom_field_definitions').select('*').eq('company_id', companyId),
  ]);

  const result: ExportResult = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    workspace: { name: companyName, companyId },
    data: {
      contacts: contacts || [],
      companies: crmCompanies || [],
      pipelines: pipelines || [],
      deals: deals || [],
      followups: followups || [],
      interactions: interactions || [],
      teams: teams || [],
      customRoles: customRoles || [],
      customFieldDefinitions: customFields || [],
    },
    statistics: {
      contacts: contacts?.length || 0,
      companies: crmCompanies?.length || 0,
      pipelines: pipelines?.length || 0,
      deals: deals?.length || 0,
      followups: followups?.length || 0,
      interactions: interactions?.length || 0,
      teams: teams?.length || 0,
      customRoles: customRoles?.length || 0,
    },
  };

  return result;
}

export function downloadBackupFile(data: ExportResult, companyName: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  a.href = url;
  a.download = `workspace-backup-${slug}-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
