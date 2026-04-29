import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/format-utils';
import { Loader2, FolderKanban, CheckCircle2 } from 'lucide-react';

interface DealLite {
  id: string;
  title: string;
  value: number;
  contact_id: string | null;
  crm_company_id: string | null;
  stage_name: string;
  pipeline_id: string;
}

interface Props {
  deal: DealLite | null;
  targetStageName: string | null;          // when triggered by drag
  contactName?: string;
  companyName?: string;                    // razão social
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (info: { dealId: string; projectId: string; newStageName: string | null }) => void;
}

export function ConvertDealToProjectDialog({ deal, targetStageName, contactName, companyName, open, onOpenChange, onSuccess }: Props) {
  const { t, language } = useI18n();
  const { currentCompany, currentBusinessUnit, supabaseUser } = useAuth();
  const { toast } = useToast();
  const [revenue, setRevenue] = useState('');
  const [labor, setLabor] = useState('');
  const [supplies, setSupplies] = useState('');
  const [createFinancials, setCreateFinancials] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (open && deal) {
      setRevenue(String(deal.value || 0));
      setLabor('');
      setSupplies('');
      setCreateFinancials(true);
      setConfirmed(false);
    }
  }, [open, deal]);

  const totalCost = (Number(labor) || 0) + (Number(supplies) || 0);
  const rev = Number(revenue) || 0;
  const margin = rev > 0 ? Math.round(((rev - totalCost) / rev) * 100) : null;

  const clientLabel = useMemo(() => companyName || contactName || (deal?.title ?? ''), [companyName, contactName, deal]);

  const handleConfirm = async () => {
    if (!deal || !currentCompany || !supabaseUser) return;
    setSubmitting(true);
    let createdClientId: string | null = null;
    let createdProjectId: string | null = null;
    try {
      // 0) Duplicate guard — re-check DB state before any writes
      const { data: dealCheck, error: checkErr } = await supabase
        .from('crm_pipeline_deals')
        .select('converted_project_id')
        .eq('id', deal.id)
        .maybeSingle();
      if (checkErr) throw checkErr;
      if (dealCheck?.converted_project_id) {
        toast({ title: t.crmPipeline.alreadyConverted, variant: 'destructive' });
        onOpenChange(false);
        return;
      }

      // 1) Find/create client (ERP)
      const clientName = (companyName || contactName || deal.title).trim();
      let clientId: string | null = null;
      const { data: existingClients } = await supabase
        .from('clients')
        .select('id')
        .eq('company_id', currentCompany.id)
        .ilike('name', clientName)
        .limit(1);
      if (existingClients && existingClients.length > 0) {
        clientId = existingClients[0].id;
      } else {
        const { data: newClient, error: clientErr } = await supabase
          .from('clients')
          .insert({
            company_id: currentCompany.id,
            business_unit_id: currentBusinessUnit?.id ?? null,
            name: clientName,
            created_by: supabaseUser.id,
          } as any)
          .select('id')
          .single();
        if (clientErr || !newClient) throw clientErr || new Error('client create failed');
        clientId = newClient.id;
        createdClientId = newClient.id;
      }

      // 2) Create project
      const today = new Date().toISOString().split('T')[0];
      const { data: project, error: projErr } = await supabase
        .from('projects')
        .insert({
          company_id: currentCompany.id,
          name: deal.title,
          client_id: clientId,
          status: 'active',
          owner_id: supabaseUser.id,
          start_date: today,
          labor_cost: Number(labor) || 0,
          supplies_cost: Number(supplies) || 0,
          revenue: rev,
          source_deal_id: deal.id,
          created_by: supabaseUser.id,
        } as any)
        .select('id')
        .single();
      if (projErr || !project) throw projErr || new Error('project create failed');
      createdProjectId = project.id;

      // 3) Financial entries
      if (createFinancials) {
        const txns: any[] = [];
        if (rev > 0) txns.push({
          company_id: currentCompany.id,
          business_unit_id: currentBusinessUnit?.id ?? null,
          type: 'income',
          category: 'Sales',
          description: deal.title,
          value: rev,
          date: today,
          status: 'paid',
          client_id: clientId,
          project_id: project.id,
          recurrence: 'none',
          created_by: supabaseUser.id,
        });
        if ((Number(labor) || 0) > 0) txns.push({
          company_id: currentCompany.id,
          business_unit_id: currentBusinessUnit?.id ?? null,
          type: 'expense',
          category: 'Labor',
          description: `${deal.title} — ${t.crmPipeline.laborCost}`,
          value: Number(labor),
          date: today,
          status: 'pending',
          client_id: clientId,
          project_id: project.id,
          recurrence: 'none',
          created_by: supabaseUser.id,
        });
        if ((Number(supplies) || 0) > 0) txns.push({
          company_id: currentCompany.id,
          business_unit_id: currentBusinessUnit?.id ?? null,
          type: 'expense',
          category: 'Supplies',
          description: `${deal.title} — ${t.crmPipeline.suppliesCost}`,
          value: Number(supplies),
          date: today,
          status: 'pending',
          client_id: clientId,
          project_id: project.id,
          recurrence: 'none',
          created_by: supabaseUser.id,
        });
        if (txns.length > 0) {
          const { error: txnErr } = await supabase.from('transactions').insert(txns);
          if (txnErr) throw txnErr;
        }
      }

      // 4) Mark deal as converted (and move stage if applicable)
      const dealUpdate: any = { converted_project_id: project.id };
      if (targetStageName) {
        dealUpdate.stage_name = targetStageName;
        dealUpdate.entered_stage_at = new Date().toISOString();
      }
      const { error: dealErr } = await supabase
        .from('crm_pipeline_deals')
        .update(dealUpdate)
        .eq('id', deal.id);
      if (dealErr) throw dealErr;

      // 5) Update CRM contact/company status & last interaction
      const nowIso = new Date().toISOString();
      if (deal.crm_company_id) {
        await supabase.from('crm_companies').update({ status: 'client', last_interaction_at: nowIso }).eq('id', deal.crm_company_id);
      }
      if (deal.contact_id) {
        await supabase.from('crm_contacts').update({ status: 'client', last_interaction_at: nowIso }).eq('id', deal.contact_id);
      }

      toast({ title: t.crmPipeline.dealConverted, description: clientLabel });
      onSuccess({ dealId: deal.id, projectId: project.id, newStageName: targetStageName });
      onOpenChange(false);
    } catch (e: any) {
      console.error('Convert deal error:', e);
      // Best-effort rollback
      if (createdProjectId) {
        await supabase.from('transactions').delete().eq('project_id', createdProjectId);
        await supabase.from('projects').delete().eq('id', createdProjectId);
      }
      if (createdClientId) {
        await supabase.from('clients').delete().eq('id', createdClientId);
      }
      toast({ title: t.crmPipeline.conversionError, description: e?.message ?? '', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-primary" />
            {t.crmPipeline.convertDealTitle}
          </DialogTitle>
          <DialogDescription>{t.crmPipeline.convertDealDesc}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border p-3 bg-muted/30">
            <p className="text-xs text-muted-foreground">{deal?.title}</p>
            {clientLabel && <p className="text-sm font-medium">{clientLabel}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>{t.crmPipeline.revenue}</Label>
            <Input type="number" min="0" value={revenue} onChange={e => setRevenue(e.target.value)} disabled={submitting} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t.crmPipeline.laborCost}</Label>
              <Input type="number" min="0" value={labor} onChange={e => setLabor(e.target.value)} placeholder="0" disabled={submitting} />
            </div>
            <div className="space-y-1.5">
              <Label>{t.crmPipeline.suppliesCost}</Label>
              <Input type="number" min="0" value={supplies} onChange={e => setSupplies(e.target.value)} placeholder="0" disabled={submitting} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="rounded-md border p-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t.crmPipeline.totalCost}</p>
              <p className="text-sm font-semibold">{formatCurrency(totalCost, language)}</p>
            </div>
            <div className="rounded-md border p-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t.crmPipeline.margin}</p>
              <p className={`text-sm font-semibold ${margin !== null && margin < 0 ? 'text-destructive' : margin !== null && margin >= 30 ? 'text-emerald-600' : ''}`}>
                {margin === null ? '—' : `${margin}%`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Checkbox id="create-fin" checked={createFinancials} onCheckedChange={(v) => setCreateFinancials(!!v)} disabled={submitting} />
            <Label htmlFor="create-fin" className="text-sm font-normal cursor-pointer">{t.crmPipeline.createFinancialEntries}</Label>
          </div>

          <div className="rounded-md border bg-muted/20 p-3 space-y-1.5">
            <p className="text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              {t.crmPipeline.summaryTitle}
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 pl-5 list-disc">
              <li>{t.crmPipeline.summaryProject}: <span className="text-foreground font-medium">{deal?.title}</span></li>
              <li>{t.crmPipeline.summaryClient}: <span className="text-foreground font-medium">{clientLabel}</span></li>
              {createFinancials && rev > 0 && (
                <li>{t.crmPipeline.summaryIncome}: <span className="text-foreground font-medium">{formatCurrency(rev, language)}</span></li>
              )}
              {createFinancials && totalCost > 0 && (
                <li>{t.crmPipeline.summaryExpenses}: <span className="text-foreground font-medium">{formatCurrency(totalCost, language)}</span></li>
              )}
              <li>{t.crmPipeline.summaryCrmStatus}</li>
            </ul>
          </div>

          <div className="flex items-start gap-2 pt-1">
            <Checkbox
              id="confirm-convert"
              checked={confirmed}
              onCheckedChange={(v) => setConfirmed(!!v)}
              disabled={submitting}
              className="mt-0.5"
            />
            <Label htmlFor="confirm-convert" className="text-sm font-normal cursor-pointer leading-snug">
              {t.crmPipeline.confirmCheckbox}
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>{t.common.cancel}</Button>
          <Button onClick={handleConfirm} disabled={submitting || !confirmed}>
            {submitting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            {submitting ? t.crmPipeline.converting : t.crmPipeline.confirmConvert}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
