import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Workflow, Plus, Trash2, Edit2, Play, Pause, GitBranch, Mail, MessageSquare, Clock, UserPlus, ArrowRightLeft, Loader2 } from 'lucide-react';
import { AISparklesPopover, useFlowsAIActions } from '@/components/shared/AISparklesPopover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { useToast } from '@/hooks/use-toast';

interface FlowAction { type: string; config: Record<string, string>; }
interface CRMFlowsManagerProps { flows: any[]; onRefresh: () => void; }

export function CRMFlowsManager({ flows, onRefresh }: CRMFlowsManagerProps) {
  const { currentCompany, supabaseUser } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const flowsAIActions = useFlowsAIActions();

  const TRIGGER_TYPES = [
    { value: 'deal_stage_change', label: t.crm.dealStageChange, icon: ArrowRightLeft },
    { value: 'new_contact', label: t.crm.newContactCreated, icon: UserPlus },
    { value: 'deal_created', label: t.crm.newDealCreated, icon: GitBranch },
    { value: 'followup_overdue', label: t.crm.followupOverdue, icon: Clock },
    { value: 'contact_inactive', label: t.crm.contactInactive, icon: Clock },
  ];

  const ACTION_TYPES = [
    { value: 'send_email', label: t.crm.sendEmail, icon: Mail },
    { value: 'send_whatsapp', label: t.crm.sendWhatsApp, icon: MessageSquare },
    { value: 'create_followup', label: t.crm.createFollowup, icon: Clock },
    { value: 'change_stage', label: t.crm.moveStage, icon: ArrowRightLeft },
    { value: 'assign_responsible', label: t.crm.assignResponsible, icon: UserPlus },
  ];

  const TRIGGER_LABELS: Record<string, string> = Object.fromEntries(TRIGGER_TYPES.map(tr => [tr.value, tr.label]));

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFlow, setEditingFlow] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [formName, setFormName] = useState('');
  const [formTrigger, setFormTrigger] = useState('');
  const [formTriggerConfig, setFormTriggerConfig] = useState<Record<string, string>>({});
  const [formActions, setFormActions] = useState<FlowAction[]>([]);

  const resetForm = () => { setFormName(''); setFormTrigger(''); setFormTriggerConfig({}); setFormActions([]); setEditingFlow(null); };
  const openCreate = () => { resetForm(); setDialogOpen(true); };
  const openEdit = (flow: any) => {
    setEditingFlow(flow); setFormName(flow.name); setFormTrigger(flow.trigger_type);
    setFormTriggerConfig(flow.trigger_config || {}); setFormActions(Array.isArray(flow.actions) ? flow.actions : []);
    setDialogOpen(true);
  };

  const addAction = () => setFormActions([...formActions, { type: '', config: {} }]);
  const updateAction = (index: number, field: string, value: string) => {
    const updated = [...formActions];
    if (field === 'type') updated[index] = { type: value, config: {} };
    else updated[index] = { ...updated[index], config: { ...updated[index].config, [field]: value } };
    setFormActions(updated);
  };
  const removeAction = (index: number) => setFormActions(formActions.filter((_, i) => i !== index));

  const handleSave = async () => {
    if (!formName.trim() || !formTrigger || !currentCompany) return;
    setSaving(true);
    const payload = { company_id: currentCompany.id, name: formName.trim(), trigger_type: formTrigger, trigger_config: formTriggerConfig as any, actions: formActions as any, created_by: supabaseUser?.id };
    let error;
    if (editingFlow) ({ error } = await supabase.from('crm_flows').update(payload).eq('id', editingFlow.id));
    else ({ error } = await supabase.from('crm_flows').insert(payload));
    if (error) toast({ title: t.crm.errorSavingFlow, description: error.message, variant: 'destructive' });
    else { toast({ title: editingFlow ? t.crm.flowUpdated : t.crm.flowCreated }); setDialogOpen(false); resetForm(); onRefresh(); }
    setSaving(false);
  };

  const toggleFlow = async (flowId: string, currentActive: boolean) => {
    await supabase.from('crm_flows').update({ is_active: !currentActive }).eq('id', flowId);
    onRefresh();
  };

  const deleteFlow = async (flowId: string) => {
    const { error } = await supabase.from('crm_flows').delete().eq('id', flowId);
    if (error) toast({ title: t.crm.errorDeletingFlow, variant: 'destructive' });
    else { toast({ title: t.crm.flowDeleted }); onRefresh(); }
  };

  const renderTriggerConfig = () => {
    if (formTrigger === 'deal_stage_change') return (
      <div className="space-y-1.5">
        <Label className="text-xs">{t.crm.targetStageOptional}</Label>
        <Input placeholder={t.crm.stageName} value={formTriggerConfig.target_stage || ''} onChange={e => setFormTriggerConfig({ ...formTriggerConfig, target_stage: e.target.value })} />
      </div>
    );
    if (formTrigger === 'contact_inactive') return (
      <div className="space-y-1.5">
        <Label className="text-xs">{t.crm.daysWithoutInteraction}</Label>
        <Input type="number" placeholder="30" value={formTriggerConfig.days || ''} onChange={e => setFormTriggerConfig({ ...formTriggerConfig, days: e.target.value })} />
      </div>
    );
    return null;
  };

  const renderActionConfig = (action: FlowAction, index: number) => {
    if (action.type === 'send_email') return (
      <div className="space-y-2 mt-2">
        <Input placeholder={t.crm.emailSubjectPlaceholder} value={action.config.subject || ''} onChange={e => updateAction(index, 'subject', e.target.value)} />
        <Textarea placeholder={t.crm.messagePlaceholder} value={action.config.body || ''} onChange={e => updateAction(index, 'body', e.target.value)} rows={2} />
      </div>
    );
    if (action.type === 'send_whatsapp') return (
      <div className="mt-2">
        <Textarea placeholder={t.crm.messagePlaceholder} value={action.config.message || ''} onChange={e => updateAction(index, 'message', e.target.value)} rows={2} />
      </div>
    );
    if (action.type === 'create_followup') return (
      <div className="space-y-2 mt-2">
        <Input placeholder={t.crm.followupDescription} value={action.config.description || ''} onChange={e => updateAction(index, 'description', e.target.value)} />
        <Select value={action.config.followup_type || ''} onValueChange={v => updateAction(index, 'followup_type', v)}>
          <SelectTrigger><SelectValue placeholder={t.crm.type} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="call">{t.crm.call}</SelectItem>
            <SelectItem value="email">{t.crm.email}</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="meeting">{t.crm.meeting}</SelectItem>
          </SelectContent>
        </Select>
        <Input type="number" placeholder={t.crm.daysAfterTrigger} value={action.config.delay_days || ''} onChange={e => updateAction(index, 'delay_days', e.target.value)} />
      </div>
    );
    if (action.type === 'change_stage') return (
      <div className="mt-2">
        <Input placeholder={t.crm.targetStageName} value={action.config.stage_name || ''} onChange={e => updateAction(index, 'stage_name', e.target.value)} />
      </div>
    );
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <AISparklesPopover actions={flowsAIActions} />
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="w-3.5 h-3.5" /> {t.crm.newFlow}
        </Button>
      </div>

      {flows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Workflow className="w-12 h-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">{t.crm.noFlows}</p>
            <p className="text-xs text-muted-foreground mt-1">{t.crm.noFlowsDesc}</p>
            <Button size="sm" className="mt-4 gap-1.5" onClick={openCreate}>
              <Plus className="w-3.5 h-3.5" /> {t.crm.createFirstFlow}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {flows.map(f => {
            const actionsCount = Array.isArray(f.actions) ? f.actions.length : 0;
            return (
              <Card key={f.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${f.is_active ? 'bg-primary/10' : 'bg-muted'}`}>
                      <Workflow className={`w-4 h-4 ${f.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{f.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs gap-1">
                          <GitBranch className="w-3 h-3" />
                          {TRIGGER_LABELS[f.trigger_type] || f.trigger_type}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {actionsCount} {actionsCount === 1 ? t.crm.action : t.crm.actionPlural}
                        </Badge>
                        {f.is_active ? (
                          <Badge className="text-xs bg-green-100 text-green-700 gap-1"><Play className="w-3 h-3" /> {t.crm.activeFlow}</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs gap-1"><Pause className="w-3 h-3" /> {t.crm.inactiveFlow}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={f.is_active} onCheckedChange={() => toggleFlow(f.id, f.is_active)} />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(f)}><Edit2 className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteFlow(f.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) resetForm(); setDialogOpen(v); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingFlow ? t.crm.editFlow : t.crm.newFlow}</DialogTitle>
            <DialogDescription>{t.crm.configureActions}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t.crm.flowName} *</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder={t.crm.flowName} />
            </div>
            <div className="space-y-1.5">
              <Label>{t.crm.trigger} *</Label>
              <Select value={formTrigger} onValueChange={v => { setFormTrigger(v); setFormTriggerConfig({}); }}>
                <SelectTrigger><SelectValue placeholder={t.crm.selectTrigger} /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map(tr => (
                    <SelectItem key={tr.value} value={tr.value}>
                      <div className="flex items-center gap-2"><tr.icon className="w-4 h-4" /> {tr.label}</div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {renderTriggerConfig()}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t.crm.actions}</Label>
                <Button type="button" variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={addAction}>
                  <Plus className="w-3 h-3" /> {t.crm.addAction}
                </Button>
              </div>
              {formActions.length === 0 && <p className="text-xs text-muted-foreground py-2">{t.crm.noActions}</p>}
              {formActions.map((action, i) => (
                <Card key={i} className="border-dashed">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">{t.crm.actionLabel} {i + 1}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeAction(i)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                    <Select value={action.type} onValueChange={v => updateAction(i, 'type', v)}>
                      <SelectTrigger><SelectValue placeholder={t.crm.actionType} /></SelectTrigger>
                      <SelectContent>
                        {ACTION_TYPES.map(a => (
                          <SelectItem key={a.value} value={a.value}>
                            <div className="flex items-center gap-2"><a.icon className="w-4 h-4" /> {a.label}</div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {renderActionConfig(action, i)}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>{t.common.cancel}</Button>
            <Button onClick={handleSave} disabled={saving || !formName.trim() || !formTrigger}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingFlow ? t.common.save : t.crm.createFlow}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
