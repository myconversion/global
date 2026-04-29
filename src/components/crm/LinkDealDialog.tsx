import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/contexts/I18nContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface LinkDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId?: string;
  crmCompanyId?: string;
  defaultTitle: string;
  companyId: string;
  onSuccess?: () => void;
}

interface PipelineStage { name: string; probability: number; }

export function LinkDealDialog({ open, onOpenChange, contactId, crmCompanyId, defaultTitle, companyId, onSuccess }: LinkDealDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();

  const [pipelines, setPipelines] = useState<any[]>([]);
  const [loadingPipelines, setLoadingPipelines] = useState(false);
  const [saving, setSaving] = useState(false);

  const [pipelineId, setPipelineId] = useState('');
  const [stageName, setStageName] = useState('');
  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [expectedCloseDate, setExpectedCloseDate] = useState('');

  const selectedPipeline = pipelines.find(p => p.id === pipelineId);
  const stages: PipelineStage[] = selectedPipeline
    ? (Array.isArray(selectedPipeline.stages) ? selectedPipeline.stages : [])
    : [];

  useEffect(() => {
    if (!open) return;
    setTitle(`${t.crm.deal} - ${defaultTitle}`);
    setPipelineId(''); setStageName(''); setValue(''); setExpectedCloseDate('');
    fetchPipelines();
  }, [open, defaultTitle]);

  const fetchPipelines = async () => {
    setLoadingPipelines(true);
    const { data } = await supabase.from('crm_pipelines').select('id, name, stages').eq('company_id', companyId).order('is_default', { ascending: false });
    setPipelines(data || []);
    if (data && data.length === 1) setPipelineId(data[0].id);
    setLoadingPipelines(false);
  };

  useEffect(() => { setStageName(''); }, [pipelineId]);

  const handleSubmit = async () => {
    if (!pipelineId || !stageName || !title.trim()) {
      toast({ title: t.crm.fillPipelineStageTitle, variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('crm_pipeline_deals').insert({
      title: title.trim(), pipeline_id: pipelineId, stage_name: stageName,
      company_id: companyId, contact_id: contactId || null, crm_company_id: crmCompanyId || null,
      value: value ? parseFloat(value) : 0, expected_close_date: expectedCloseDate || null,
      created_by: user?.id || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: t.crm.errorCreatingLinkedDeal, description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t.crm.dealLinkedSuccess });
      onOpenChange(false);
      onSuccess?.();
    }
  };

  const isValid = pipelineId && stageName && title.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.crm.linkDealTitle}</DialogTitle>
          <DialogDescription>{t.crm.linkDealDesc}</DialogDescription>
        </DialogHeader>

        {loadingPipelines ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : pipelines.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">{t.crm.noPipelines}</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.crm.pipeline} *</Label>
              <Select value={pipelineId} onValueChange={setPipelineId}>
                <SelectTrigger><SelectValue placeholder={t.crm.selectPipeline} /></SelectTrigger>
                <SelectContent>
                  {pipelines.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            {pipelineId && (
              <div className="space-y-2">
                <Label>{t.crm.stage} *</Label>
                <Select value={stageName} onValueChange={setStageName}>
                  <SelectTrigger><SelectValue placeholder={t.crm.selectStage} /></SelectTrigger>
                  <SelectContent>
                    {stages.map(s => (<SelectItem key={s.name} value={s.name}>{s.name} ({s.probability}%)</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>{t.crm.dealTitle} *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t.crm.valueLabel}</Label>
                <Input type="number" min="0" step="0.01" value={value} onChange={e => setValue(e.target.value)} placeholder="0,00" />
              </div>
              <div className="space-y-2">
                <Label>{t.crm.expectedCloseDate}</Label>
                <Input type="date" value={expectedCloseDate} onChange={e => setExpectedCloseDate(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleSubmit} disabled={!isValid || saving} className="w-full bg-[#4084F2] text-white hover:bg-[#3070D9]" loading={saving} loadingText={t.crm.creating}>
              {t.crm.linkDealButton}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
