import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Loader2, Save, Plus, Trash2, ChevronUp, ChevronDown, Phone, Mail, MessageSquare, Linkedin, Instagram, Facebook } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

// ── Types ────────────────────────────────────────────────────────
interface CadenceStep {
  id?: string;
  channel: string;
  delay_days: number;
  template_name: string;
  template_script: string;
}

interface Pipeline {
  id: string;
  name: string;
}

const CHANNEL_ICONS: Record<string, any> = {
  call: Phone,
  whatsapp: MessageSquare,
  email: Mail,
  linkedin: Linkedin,
  facebook_messenger: Facebook,
  instagram_direct: Instagram,
};

export default function CRMCadenceTab() {
  const { currentCompany, role } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();

  const CHANNELS = [
    { value: 'call', label: t.settingsCadence.channelCall, icon: Phone },
    { value: 'whatsapp', label: t.settingsCadence.channelWhatsApp, icon: MessageSquare },
    { value: 'email', label: t.settingsCadence.channelEmail, icon: Mail },
    { value: 'linkedin', label: t.settingsCadence.channelLinkedIn, icon: Linkedin },
    { value: 'facebook_messenger', label: t.settingsCadence.channelFacebookMessenger, icon: Facebook },
    { value: 'instagram_direct', label: t.settingsCadence.channelInstagramDirect, icon: Instagram },
  ] as const;

  function channelMeta(ch: string) {
    return CHANNELS.find(c => c.value === ch) ?? CHANNELS[0];
  }

  const [warmDays, setWarmDays] = useState(3);
  const [coldDays, setColdDays] = useState(7);
  const [monthlySalesGoal, setMonthlySalesGoal] = useState('100000');
  const [monthlySalesGoalType, setMonthlySalesGoalType] = useState('amount');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
  const [steps, setSteps] = useState<CadenceStep[]>([]);
  const [loadingSteps, setLoadingSteps] = useState(false);
  const [savingSteps, setSavingSteps] = useState(false);
  const [showNewStep, setShowNewStep] = useState(false);
  const [newStep, setNewStep] = useState<CadenceStep>({ channel: 'call', delay_days: 1, template_name: '', template_script: '' });

  const isAdmin = role === 'admin' || role === 'super_admin';

  useEffect(() => {
    if (!currentCompany) return;
    (async () => {
      setLoading(true);
      const [{ data: cadence }, { data: company }, { data: pipelineData }] = await Promise.all([
        supabase.from('crm_cadence_settings').select('*').eq('company_id', currentCompany.id).maybeSingle(),
        supabase.from('companies').select('monthly_sales_goal, monthly_sales_goal_type').eq('id', currentCompany.id).single(),
        supabase.from('crm_pipelines').select('id, name').eq('company_id', currentCompany.id).order('created_at'),
      ]);
      if (cadence) {
        setWarmDays(cadence.warm_after_days);
        setColdDays(cadence.cold_after_days);
        setExistingId(cadence.id);
      }
      if (company) {
        setMonthlySalesGoal(String(company.monthly_sales_goal ?? 100000));
        setMonthlySalesGoalType(company.monthly_sales_goal_type ?? 'amount');
      }
      if (pipelineData && pipelineData.length > 0) {
        setPipelines(pipelineData);
        setSelectedPipelineId(pipelineData[0].id);
      }
      setLoading(false);
    })();
  }, [currentCompany]);

  const loadSteps = useCallback(async (pipelineId: string) => {
    if (!currentCompany || !pipelineId) return;
    setLoadingSteps(true);
    const { data } = await supabase
      .from('crm_prospecting_cadences' as any)
      .select('*')
      .eq('company_id', currentCompany.id)
      .eq('pipeline_id', pipelineId)
      .order('step_order');
    if (data) {
      setSteps((data as any[]).map(d => ({
        id: d.id,
        channel: d.channel,
        delay_days: d.delay_days,
        template_name: d.template_name,
        template_script: d.template_script ?? '',
      })));
    }
    setLoadingSteps(false);
  }, [currentCompany]);

  useEffect(() => {
    if (selectedPipelineId) loadSteps(selectedPipelineId);
  }, [selectedPipelineId, loadSteps]);

  const handleSaveSettings = async () => {
    if (!currentCompany) return;
    if (coldDays <= warmDays) {
      toast({ title: t.settingsCadence.coldMustBeGreater, variant: 'destructive' });
      return;
    }
    setSaving(true);

    if (existingId) {
      const { error } = await supabase
        .from('crm_cadence_settings')
        .update({ warm_after_days: warmDays, cold_after_days: coldDays, updated_at: new Date().toISOString() })
        .eq('id', existingId);
      if (error) { toast({ title: t.settingsCadence.errorSavingCadence, description: error.message, variant: 'destructive' }); setSaving(false); return; }
    } else {
      const { data, error } = await supabase
        .from('crm_cadence_settings')
        .insert({ company_id: currentCompany.id, warm_after_days: warmDays, cold_after_days: coldDays })
        .select()
        .single();
      if (error) { toast({ title: t.settingsCadence.errorSavingCadence, description: error.message, variant: 'destructive' }); setSaving(false); return; }
      if (data) setExistingId(data.id);
    }

    const { error: goalError } = await supabase
      .from('companies')
      .update({ monthly_sales_goal: parseFloat(monthlySalesGoal) || 100000, monthly_sales_goal_type: monthlySalesGoalType })
      .eq('id', currentCompany.id);

    if (goalError) {
      toast({ title: t.settingsCadence.errorSavingGoal, description: goalError.message, variant: 'destructive' });
    } else {
      toast({ title: t.settingsCadence.settingsSaved });
    }
    setSaving(false);
  };

  const handleSaveSteps = async () => {
    if (!currentCompany || !selectedPipelineId) return;
    setSavingSteps(true);

    await supabase
      .from('crm_prospecting_cadences' as any)
      .delete()
      .eq('company_id', currentCompany.id)
      .eq('pipeline_id', selectedPipelineId);

    if (steps.length > 0) {
      const rows = steps.map((s, i) => ({
        company_id: currentCompany.id,
        pipeline_id: selectedPipelineId,
        step_order: i + 1,
        channel: s.channel,
        delay_days: s.delay_days,
        template_name: s.template_name,
        template_script: s.template_script || null,
      }));
      const { error } = await supabase.from('crm_prospecting_cadences' as any).insert(rows);
      if (error) {
        toast({ title: t.settingsCadence.errorSavingCadenceSteps, description: error.message, variant: 'destructive' });
        setSavingSteps(false);
        return;
      }
    }
    toast({ title: t.settingsCadence.cadenceSaved });
    await loadSteps(selectedPipelineId);
    setSavingSteps(false);
  };

  const addStep = () => {
    if (!newStep.template_name.trim()) {
      toast({ title: t.settingsCadence.fillTemplateName, variant: 'destructive' });
      return;
    }
    setSteps(prev => [...prev, { ...newStep }]);
    setNewStep({ channel: 'call', delay_days: 1, template_name: '', template_script: '' });
    setShowNewStep(false);
  };

  const removeStep = (idx: number) => setSteps(prev => prev.filter((_, i) => i !== idx));

  const moveStep = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= steps.length) return;
    setSteps(prev => {
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground py-8"><Loader2 className="w-4 h-4 animate-spin" /> {t.settingsCadence.loadingSettings}</div>;
  }

  if (!isAdmin) {
    return <p className="text-sm text-muted-foreground">{t.settingsCadence.adminOnly}</p>;
  }

  return (
    <div className="space-y-8">
      {/* ── Monthly Sales Goal ── */}
      <div className="max-w-md space-y-4">
        <div>
          <h3 className="text-sm font-semibold mb-1">{t.settingsCadence.monthlySalesGoal}</h3>
          <p className="text-xs text-muted-foreground mb-4">{t.settingsCadence.monthlySalesGoalDesc}</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t.settingsCadence.goalType}</Label>
            <Select value={monthlySalesGoalType} onValueChange={setMonthlySalesGoalType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="amount">{t.settingsCadence.goalTypeAmount}</SelectItem>
                <SelectItem value="count">{t.settingsCadence.goalTypeCount}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{monthlySalesGoalType === 'amount' ? t.settingsCadence.goalLabelAmount : t.settingsCadence.goalLabelCount}</Label>
            <Input type="number" min="0" step={monthlySalesGoalType === 'amount' ? '1000' : '1'} value={monthlySalesGoal} onChange={e => setMonthlySalesGoal(e.target.value)} placeholder={monthlySalesGoalType === 'amount' ? '100000' : '50'} />
          </div>
        </div>
      </div>

      <Button onClick={handleSaveSettings} disabled={saving}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
        {t.settingsCadence.saveSalesGoal}
      </Button>

      <Separator />

      {/* ── Alerts ── */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-bold mb-0.5 flex items-center gap-2">🔔 {t.settingsCadence.alerts}</h3>
          <p className="text-xs text-muted-foreground mb-4">{t.settingsCadence.alertsDesc}</p>
        </div>

        <div className="max-w-md space-y-4">
          <div>
            <h4 className="text-sm font-semibold mb-1">{t.settingsCadence.autoTemperature}</h4>
            <p className="text-xs text-muted-foreground mb-4">{t.settingsCadence.autoTemperatureDesc}</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="warmDays">{t.settingsCadence.warmDaysLabel} <span className="text-amber-600 font-bold">{t.settingsCadence.warmLabel}</span></Label>
              <Input id="warmDays" type="number" min={1} value={warmDays} onChange={e => setWarmDays(Number(e.target.value))} />
              <p className="text-xs text-muted-foreground">{t.settingsCadence.hotDesc} {warmDays} {t.settingsCadence.daysText}.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="coldDays">{t.settingsCadence.coldDaysLabel} <span className="text-blue-600 font-bold">{t.settingsCadence.coldLabel}</span></Label>
              <Input id="coldDays" type="number" min={2} value={coldDays} onChange={e => setColdDays(Number(e.target.value))} />
              <p className="text-xs text-muted-foreground">{t.settingsCadence.warmDesc} {warmDays} {t.settingsCadence.andText} {coldDays} {t.settingsCadence.daysText}. {t.settingsCadence.coldDesc} {coldDays} {t.settingsCadence.daysText} {t.settingsCadence.afterText} {t.settingsCadence.coldLabel}.</p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted text-xs space-y-1">
            <p>{t.settingsCadence.hotEmoji} {t.settingsCadence.lastInteractionLess} {warmDays} {t.settingsCadence.daysText}</p>
            <p>{t.settingsCadence.warmEmoji} {t.settingsCadence.betweenDays} {warmDays} {t.settingsCadence.andText} {coldDays} {t.settingsCadence.withoutContact}</p>
            <p>{t.settingsCadence.coldEmoji} {t.settingsCadence.greaterEqual} {coldDays} {t.settingsCadence.withoutContact}</p>
          </div>
          <Button onClick={handleSaveSettings} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {t.settingsCadence.saveAlerts}
          </Button>
        </div>
      </div>

      <Separator />

      {/* ── Prospecting Cadence ── */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold mb-1">{t.settingsCadence.prospectingCadence}</h3>
          <p className="text-xs text-muted-foreground mb-4">{t.settingsCadence.prospectingCadenceDesc}</p>
        </div>

        {pipelines.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.settingsCadence.noPipelinesFound}</p>
        ) : (
          <>
            <div className="max-w-xs space-y-2">
              <Label>{t.settingsCadence.pipelineLabel}</Label>
              <Select value={selectedPipelineId} onValueChange={setSelectedPipelineId}>
                <SelectTrigger><SelectValue placeholder={t.settingsCadence.selectPipeline} /></SelectTrigger>
                <SelectContent>
                  {pipelines.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {loadingSteps ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4"><Loader2 className="w-4 h-4 animate-spin" /> {t.settingsCadence.loadingSteps}</div>
            ) : (
              <div className="space-y-3">
                {steps.length === 0 && !showNewStep && (
                  <p className="text-sm text-muted-foreground py-2">{t.settingsCadence.noSteps}</p>
                )}

                {steps.map((step, idx) => {
                  const meta = channelMeta(step.channel);
                  const Icon = meta.icon;
                  return (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="flex flex-col items-center pt-1">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        {idx < steps.length - 1 && <div className="w-px flex-1 bg-border mt-1 min-h-[24px]" />}
                      </div>

                      <div className="flex-1 border rounded-lg p-3 bg-card space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-muted-foreground">{t.settingsCadence.stepLabel} {idx + 1}</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-muted">{meta.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {idx === 0 ? t.settingsCadence.dayZero : `+${step.delay_days} ${t.settingsCadence.plusDays}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveStep(idx, -1)} disabled={idx === 0}><ChevronUp className="w-3 h-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveStep(idx, 1)} disabled={idx === steps.length - 1}><ChevronDown className="w-3 h-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeStep(idx)}><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        </div>
                        <p className="text-sm font-medium">{step.template_name}</p>
                        {step.template_script && <p className="text-xs text-muted-foreground line-clamp-2">{step.template_script}</p>}
                      </div>
                    </div>
                  );
                })}

                {showNewStep && (
                  <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                    <h4 className="text-sm font-semibold">{t.settingsCadence.newStep}</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">{t.settingsCadence.channelLabel}</Label>
                        <Select value={newStep.channel} onValueChange={v => setNewStep(s => ({ ...s, channel: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CHANNELS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t.settingsCadence.intervalLabel}</Label>
                        <Input type="number" min={0} value={newStep.delay_days} onChange={e => setNewStep(s => ({ ...s, delay_days: Number(e.target.value) }))} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t.settingsCadence.templateName}</Label>
                      <Input value={newStep.template_name} onChange={e => setNewStep(s => ({ ...s, template_name: e.target.value }))} placeholder={t.settingsCadence.templateNamePlaceholder} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t.settingsCadence.templateScript}</Label>
                      <Textarea value={newStep.template_script} onChange={e => setNewStep(s => ({ ...s, template_script: e.target.value }))} placeholder={t.settingsCadence.templateScriptPlaceholder} rows={3} />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={addStep}><Plus className="w-3 h-3 mr-1" /> {t.settingsCadence.addStep}</Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowNewStep(false)}>{t.common.cancel}</Button>
                    </div>
                  </div>
                )}

                {!showNewStep && (
                  <Button variant="outline" size="sm" onClick={() => setShowNewStep(true)}>
                    <Plus className="w-3 h-3 mr-1" /> {t.settingsCadence.addStepBtn}
                  </Button>
                )}

                {steps.length > 0 && (
                  <div className="pt-2">
                    <Button onClick={handleSaveSteps} disabled={savingSteps}>
                      {savingSteps ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                      {t.settingsCadence.saveCadence}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
