import { supabase } from '@/integrations/supabase/client';

// Conversion CRM backup JSON types
interface ConversionClient {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string; // "LEAD" | "CLIENT"
  tags: string[];
  source: string | null;
  leadScore: number;
  customFields: Record<string, any> | null;
  notes: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  company: string | null;
  jobTitle: string | null;
  cpf?: string | null;
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ConversionFunnel {
  id: string;
  name: string;
  description: string | null;
  color: string;
}

interface ConversionFunnelStage {
  id: string;
  funnelId: string;
  name: string;
  color: string;
  order: number;
  isFixed: boolean;
}

interface ConversionLead {
  id: string;
  funnelId: string;
  stageId: string;
  clientId: string | null;
  title: string;
  value: number;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  expectedCloseDate: string | null;
  probability: number;
  lostReason: string | null;
  source: string | null;
  status: string;
  tags: string[];
  customFields: Record<string, any>;
  observations: string | null;
  notes: string | null;
  createdAt: string;
}

interface ConversionFollowUp {
  id: string;
  leadId: string;
  userId: string | null;
  title: string;
  description: string;
  type: string;
  priority: string;
  status: string;
  dueDate: string;
  completedAt: string | null;
  createdAt: string;
}

interface ConversionTeam {
  id: string;
  name: string;
  description: string;
  color: string;
  leaderId: string | null;
}

interface ConversionCustomRole {
  id: string;
  name: string;
  description: string;
  color: string;
  permissions: Record<string, any>;
}

export interface ConversionBackup {
  version: string;
  exportedAt: string;
  workspace: {
    name: string;
    slug: string;
    description: string;
  };
  data: {
    members: any[];
    teams: ConversionTeam[];
    customRoles: ConversionCustomRole[];
    clients: ConversionClient[];
    funnels: ConversionFunnel[];
    funnelStages: ConversionFunnelStage[];
    leads: ConversionLead[];
    leadFollowUps: ConversionFollowUp[];
    leadHistory: any[];
    leadComments: any[];
    leadCollaborators: any[];
    clientCustomFields?: any[];
    companyCustomFields?: any[];
    [key: string]: any;
  };
  statistics: Record<string, number>;
}

export interface ImportResult {
  contacts: number;
  pipelines: number;
  deals: number;
  followups: number;
  teams: number;
  roles: number;
  notes: number;
  errors: string[];
}

function mapSource(source: string | null): 'indicacao' | 'inbound' | 'outbound' | 'social_media' | 'evento' | 'other' | 'facebook' | 'instagram' | 'site' | 'prospeccao_ativa' | 'midia_offline' {
  if (!source) return 'other';
  const s = source.toUpperCase();
  if (s.includes('INDICACAO') || s.includes('INDICAÇÃO') || s.includes('REFERRAL')) return 'indicacao';
  if (s.includes('FACEBOOK') || s.includes('FB')) return 'facebook';
  if (s.includes('INSTAGRAM') || s.includes('IG')) return 'instagram';
  if (s.includes('SITE') || s.includes('LANDING') || s.includes('WEBSITE')) return 'site';
  if (s.includes('PROSPECÇÃO') || s.includes('PROSPECCAO') || s.includes('OUTBOUND') || s.includes('COLD')) return 'prospeccao_ativa';
  if (s.includes('OFFLINE') || s.includes('MÍDIA') || s.includes('MIDIA')) return 'midia_offline';
  if (s.includes('INBOUND')) return 'inbound';
  if (s.includes('SOCIAL')) return 'social_media';
  if (s.includes('EVENTO') || s.includes('EVENT')) return 'evento';
  return 'other';
}

function mapFollowUpType(type: string): 'call' | 'email' | 'whatsapp' | 'meeting' | 'visit' | 'proposal' {
  const t = type.toUpperCase();
  if (t === 'WHATSAPP') return 'whatsapp';
  if (t === 'EMAIL') return 'email';
  if (t === 'CALL' || t === 'PHONE') return 'call';
  if (t === 'MEETING') return 'meeting';
  if (t === 'VISIT') return 'visit';
  if (t === 'PROPOSAL') return 'proposal';
  return 'call';
}

export async function importConversionBackup(
  backup: ConversionBackup,
  companyId: string,
  responsibleUserId?: string,
  onProgress?: (step: string, count: number) => void
): Promise<ImportResult> {
  const result: ImportResult = { contacts: 0, pipelines: 0, deals: 0, followups: 0, teams: 0, roles: 0, notes: 0, errors: [] };

  // 1. Import teams
  if (backup.data.teams?.length) {
    onProgress?.('Importing teams...', 0);
    for (const team of backup.data.teams) {
      const { error } = await supabase.from('teams').insert({
        company_id: companyId,
        name: team.name,
        description: team.description || null,
        color: team.color || '#6B7280',
      });
      if (error) result.errors.push(`Time "${team.name}": ${error.message}`);
      else result.teams++;
    }
    onProgress?.('Times importados', result.teams);
  }

  // 2. Import custom roles
  if (backup.data.customRoles?.length) {
    onProgress?.('Importing roles...', 0);
    for (const role of backup.data.customRoles) {
      const { error } = await supabase.from('custom_roles').insert({
        company_id: companyId,
        name: role.name,
        description: role.description || null,
        color: role.color || '#6B7280',
        permissions: role.permissions || {},
      });
      if (error) result.errors.push(`Role "${role.name}": ${error.message}`);
      else result.roles++;
    }
    onProgress?.('Roles importados', result.roles);
  }

  // 3. Import clients -> crm_contacts
  const clientIdMap = new Map<string, string>(); // old ID -> new ID
  if (backup.data.clients?.length) {
    onProgress?.('Importing contacts...', 0);
    const BATCH_SIZE = 50;
    for (let i = 0; i < backup.data.clients.length; i += BATCH_SIZE) {
      const batch = backup.data.clients.slice(i, i + BATCH_SIZE);
      const rows = batch.map(c => ({
        company_id: companyId,
        name: c.name || 'Unnamed',
        email: c.email || null,
        phone: c.phone || null,
        cpf: c.cpf || null,
        status: (c.status === 'CLIENT' ? 'client' : 'lead') as 'lead' | 'client',
        tags: c.tags || [],
        origin: mapSource(c.source),
        score: c.leadScore || 0,
        custom_fields: c.customFields || {},
        position: c.jobTitle || null,
        temperature: 'cold' as const,
        responsible_id: responsibleUserId || null,
      }));

      const { data: inserted, error } = await supabase.from('crm_contacts').insert(rows).select('id');
      if (error) {
        result.errors.push(`Contatos batch ${i}: ${error.message}`);
      } else if (inserted) {
        batch.forEach((c, idx) => {
          if (inserted[idx]) clientIdMap.set(c.id, inserted[idx].id);
        });
        result.contacts += inserted.length;
      }
      onProgress?.('Importing contacts...', result.contacts);
    }
  }

  // 4. Import funnels -> crm_pipelines
  const funnelIdMap = new Map<string, string>();
  const stageNameMap = new Map<string, string>(); // old stageId -> stage name
  if (backup.data.funnels?.length) {
    onProgress?.('Importing pipelines...', 0);
    const stages = backup.data.funnelStages || [];

    for (const funnel of backup.data.funnels) {
      const funnelStages = stages
        .filter(s => s.funnelId === funnel.id)
        .sort((a, b) => a.order - b.order);

      const stagesJson = funnelStages.map(s => ({
        name: s.name,
        color: s.color || '#3B82F6',
        probability: s.isFixed && s.name === 'Ganho' ? 100 : s.isFixed && s.name === 'Perdido' ? 0 : Math.round((1 - s.order / Math.max(funnelStages.length, 1)) * 100),
        order: s.order,
      }));

      const { data: inserted, error } = await supabase.from('crm_pipelines').insert({
        company_id: companyId,
        name: funnel.name,
        product_service: funnel.description || null,
        stages: stagesJson,
        is_default: result.pipelines === 0,
      }).select('id').single();

      if (error) {
        result.errors.push(`Pipeline "${funnel.name}": ${error.message}`);
      } else if (inserted) {
        funnelIdMap.set(funnel.id, inserted.id);
        funnelStages.forEach(s => stageNameMap.set(s.id, s.name));
        result.pipelines++;
      }
    }
    onProgress?.('Pipelines imported', result.pipelines);
  }

  // 5. Import leads -> crm_pipeline_deals
  const leadIdMap = new Map<string, string>();
  if (backup.data.leads?.length) {
    onProgress?.('Importing deals...', 0);
    for (const lead of backup.data.leads) {
      const pipelineId = funnelIdMap.get(lead.funnelId);
      const stageName = stageNameMap.get(lead.stageId);
      if (!pipelineId || !stageName) {
        result.errors.push(`Lead "${lead.title}": pipeline/stage not found`);
        continue;
      }

      const contactId = lead.clientId ? clientIdMap.get(lead.clientId) : null;

      const { data: inserted, error } = await supabase.from('crm_pipeline_deals').insert({
        company_id: companyId,
        pipeline_id: pipelineId,
        stage_name: stageName,
        title: lead.title || 'Untitled',
        value: lead.value || 0,
        contact_id: contactId || null,
        expected_close_date: lead.expectedCloseDate || null,
        loss_reason: lead.lostReason || null,
        responsible_id: responsibleUserId || null,
      }).select('id').single();

      if (error) {
        result.errors.push(`Lead "${lead.title}": ${error.message}`);
      } else if (inserted) {
        leadIdMap.set(lead.id, inserted.id);
        result.deals++;
      }
    }
    onProgress?.('Deals imported', result.deals);
  }

  // 6. Import leadFollowUps -> crm_followups
  if (backup.data.leadFollowUps?.length) {
    onProgress?.('Importing follow-ups...', 0);
    for (const fu of backup.data.leadFollowUps) {
      const dealId = leadIdMap.get(fu.leadId);

      const { error } = await supabase.from('crm_followups').insert({
        company_id: companyId,
        deal_id: dealId || null,
        description: fu.title ? `${fu.title}${fu.description ? ' - ' + fu.description : ''}` : fu.description || null,
        type: mapFollowUpType(fu.type),
        scheduled_at: fu.dueDate,
        is_completed: fu.status === 'COMPLETED' || !!fu.completedAt,
        completed_at: fu.completedAt || null,
      });

      if (error) result.errors.push(`FollowUp: ${error.message}`);
      else result.followups++;
    }
    onProgress?.('Follow-ups imported', result.followups);
  }

  // 7. Import notes/annotations -> crm_interactions
  let notesCount = 0;

  // 7a. Client notes
  if (backup.data.clients?.length) {
    onProgress?.('Importing contact notes...', 0);
    for (const c of backup.data.clients) {
      if (!c.notes) continue;
      const contactId = clientIdMap.get(c.id);
      if (!contactId) continue;

      const { error } = await supabase.from('crm_interactions').insert({
        company_id: companyId,
        contact_id: contactId,
        title: 'Imported note',
        description: c.notes,
        type: 'note' as const,
        user_id: responsibleUserId || null,
      });
      if (error) result.errors.push(`Contact note: ${error.message}`);
      else notesCount++;
    }
  }

  // 7b. Lead notes and observations
  if (backup.data.leads?.length) {
    onProgress?.('Importing deal notes...', notesCount);
    for (const lead of backup.data.leads) {
      const dealId = leadIdMap.get(lead.id);
      const contactId = lead.clientId ? clientIdMap.get(lead.clientId) : null;

      const texts: { title: string; body: string }[] = [];
      if (lead.notes) texts.push({ title: 'Deal note', body: lead.notes });
      if (lead.observations) texts.push({ title: 'Deal observation', body: lead.observations });

      for (const t of texts) {
        const { error } = await supabase.from('crm_interactions').insert({
          company_id: companyId,
          deal_id: dealId || null,
          contact_id: contactId || null,
          title: t.title,
          description: t.body,
          type: 'note' as const,
          user_id: responsibleUserId || null,
        });
        if (error) result.errors.push(`Deal note: ${error.message}`);
        else notesCount++;
      }
    }
  }

  // 7c. Lead comments
  if (backup.data.leadComments?.length) {
    onProgress?.('Importing comments...', notesCount);
    for (const comment of backup.data.leadComments) {
      const dealId = comment.leadId ? leadIdMap.get(comment.leadId) : null;

      const { error } = await supabase.from('crm_interactions').insert({
        company_id: companyId,
        deal_id: dealId || null,
        title: 'Imported comment',
        description: comment.content || comment.text || comment.body || JSON.stringify(comment),
        type: 'note' as const,
        user_id: responsibleUserId || null,
      });
      if (error) result.errors.push(`Comment: ${error.message}`);
      else notesCount++;
    }
  }

  onProgress?.('Notes imported', notesCount);
  result.notes = notesCount;

  return result;
}
