import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import {
  Zap, Plus, Mail, Loader2, Send, Workflow, Users, Building2,
  Pencil, Trash2, Calendar, Clock, CheckCircle2, Search, Filter,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { CRMFlowsManager } from '@/components/crm/CRMFlowsManager';
import { cn } from '@/lib/utils';

interface TargetFilters {
  recipient_type: 'contacts' | 'companies';
  selection_mode: 'all' | 'filter' | 'manual';
  filters: { temperature: string; status: string };
  manual_ids: string[];
}

const defaultTargetFilters: TargetFilters = {
  recipient_type: 'contacts',
  selection_mode: 'all',
  filters: { temperature: 'all', status: 'all' },
  manual_ids: [],
};

function recipientCount(
  tf: TargetFilters,
  contacts: { id: string; name: string; temperature: string; status: string }[],
  companies: { id: string; razao_social: string; temperature: string; status: string }[],
): number {
  if (tf.selection_mode === 'manual') return tf.manual_ids.length;
  const list = tf.recipient_type === 'contacts' ? contacts : companies;
  if (tf.selection_mode === 'all') return list.length;
  return list.filter(r => {
    if (tf.filters.temperature !== 'all' && r.temperature !== tf.filters.temperature) return false;
    if (tf.filters.status !== 'all' && r.status !== tf.filters.status) return false;
    return true;
  }).length;
}

export default function CRMAutomationsPage() {
  const { currentCompany, supabaseUser } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();

  const CHANNEL_LABELS: Record<string, string> = { email: t.crm.email, whatsapp: 'WhatsApp', both: t.crm.both };
  const STATUS_LABELS: Record<string, string> = { draft: t.crm.draft, scheduled: t.crm.scheduled, sent: t.crm.sentStatus };
  const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    scheduled: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    sent: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  };
  const TEMP_LABELS: Record<string, string> = { hot: t.crm.hot, warm: t.crm.warm, cold: t.crm.cold };

  // Data
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [flows, setFlows] = useState<any[]>([]);
  const [contacts, setContacts] = useState<{ id: string; name: string; temperature: string; status: string }[]>([]);
  const [companies, setCompanies] = useState<{ id: string; razao_social: string; temperature: string; status: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formChannel, setFormChannel] = useState<string>('email');
  const [formSubject, setFormSubject] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formSendMode, setFormSendMode] = useState<'now' | 'scheduled'>('now');
  const [formScheduledAt, setFormScheduledAt] = useState('');
  const [formTargetFilters, setFormTargetFilters] = useState<TargetFilters>(defaultTargetFilters);
  const [manualSearch, setManualSearch] = useState('');

  const fetchData = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const [{ data: c }, { data: f }, { data: ct }, { data: co }] = await Promise.all([
        supabase.from('crm_campaigns').select('*').eq('company_id', currentCompany.id).order('created_at', { ascending: false }),
        supabase.from('crm_flows').select('*').eq('company_id', currentCompany.id).order('created_at', { ascending: false }),
        supabase.from('crm_contacts').select('id, name, temperature, status').eq('company_id', currentCompany.id).order('name').limit(1000),
        supabase.from('crm_companies').select('id, razao_social, temperature, status').eq('company_id', currentCompany.id).order('razao_social').limit(1000),
      ]);
      if (c) setCampaigns(c);
      if (f) setFlows(f);
      if (ct) setContacts(ct as any);
      if (co) setCompanies(co as any);
    } catch { } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [currentCompany]);

  const resetForm = () => {
    setFormName(''); setFormChannel('email'); setFormSubject(''); setFormBody('');
    setFormSendMode('now'); setFormScheduledAt('');
    setFormTargetFilters(defaultTargetFilters);
    setManualSearch(''); setEditingCampaign(null);
  };

  const openCreate = () => { resetForm(); setCampaignDialogOpen(true); };

  const openEdit = (campaign: any) => {
    setEditingCampaign(campaign);
    setFormName(campaign.name);
    setFormChannel(campaign.channel || 'email');
    setFormSubject(campaign.template_subject || '');
    setFormBody(campaign.template_body || '');
    const tf = campaign.target_filters as TargetFilters | null;
    setFormTargetFilters(tf ? { ...defaultTargetFilters, ...tf, filters: { ...defaultTargetFilters.filters, ...(tf.filters || {}) } } : defaultTargetFilters);
    if (campaign.scheduled_at) {
      setFormSendMode('scheduled');
      setFormScheduledAt(campaign.scheduled_at.slice(0, 16));
    } else {
      setFormSendMode('now');
      setFormScheduledAt('');
    }
    setCampaignDialogOpen(true);
  };

  const handleSaveCampaign = async () => {
    if (!formName.trim() || !currentCompany) return;
    setSaving(true);
    const payload = {
      company_id: currentCompany.id,
      name: formName.trim(),
      channel: formChannel as any,
      template_subject: formSubject || null,
      template_body: formBody || null,
      target_filters: formTargetFilters as any,
      scheduled_at: formSendMode === 'scheduled' && formScheduledAt ? formScheduledAt : null,
      status: formSendMode === 'now' ? 'sent' as any : formSendMode === 'scheduled' && formScheduledAt ? 'scheduled' as any : 'draft' as any,
      created_by: supabaseUser?.id,
    };

    let error;
    if (editingCampaign) {
      ({ error } = await supabase.from('crm_campaigns').update(payload).eq('id', editingCampaign.id));
    } else {
      ({ error } = await supabase.from('crm_campaigns').insert(payload));
    }

    setSaving(false);
    if (error) {
      toast({ title: t.crm.errorCreatingCampaign, variant: 'destructive' });
    } else {
      toast({ title: editingCampaign ? t.crm.campaignUpdated : formSendMode === 'now' ? t.crm.campaignSent : t.crm.campaignCreated });
      setCampaignDialogOpen(false);
      resetForm();
      fetchData();
    }
  };

  const handleDeleteCampaign = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('crm_campaigns').delete().eq('id', deleteTarget.id);
    if (error) toast({ title: t.crm.errorDeletingCampaign, variant: 'destructive' });
    else { toast({ title: t.crm.campaignDeleted }); fetchData(); }
    setDeleteTarget(null);
  };

  // Recipient helpers
  const updateTF = (patch: Partial<TargetFilters>) =>
    setFormTargetFilters(prev => ({ ...prev, ...patch }));

  const filteredManualList = useMemo(() => {
    const q = manualSearch.toLowerCase();
    if (formTargetFilters.recipient_type === 'contacts') {
      return contacts.filter(c => !q || c.name.toLowerCase().includes(q));
    }
    return companies.filter(c => !q || c.razao_social.toLowerCase().includes(q));
  }, [formTargetFilters.recipient_type, contacts, companies, manualSearch]);

  const filteredByFilterList = useMemo(() => {
    const f = formTargetFilters.filters;
    if (formTargetFilters.recipient_type === 'contacts') {
      return contacts.filter(c => {
        if (f.temperature !== 'all' && c.temperature !== f.temperature) return false;
        if (f.status !== 'all' && c.status !== f.status) return false;
        return true;
      });
    }
    return companies.filter(c => {
      if (f.temperature !== 'all' && c.temperature !== f.temperature) return false;
      if (f.status !== 'all' && c.status !== f.status) return false;
      return true;
    });
  }, [formTargetFilters, contacts, companies]);

  const toggleManualId = (id: string) => {
    const ids = formTargetFilters.manual_ids;
    updateTF({ manual_ids: ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id] });
  };

  const totalRecipients = recipientCount(formTargetFilters, contacts, companies);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" /> {t.crm.automations}
          </h1>
          <p className="text-sm text-muted-foreground">{t.crm.automationsDesc}</p>
        </div>
      </div>

      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns" className="gap-1.5"><Send className="w-3.5 h-3.5" /> {t.crm.campaigns}</TabsTrigger>
          <TabsTrigger value="flows" className="gap-1.5"><Workflow className="w-3.5 h-3.5" /> {t.crm.flows}</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5" onClick={openCreate}>
              <Plus className="w-3.5 h-3.5" /> {t.crm.newCampaign}
            </Button>
          </div>

          {campaigns.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Mail className="w-12 h-12 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground font-medium">{t.crm.noCampaigns}</p>
                <Button size="sm" className="mt-4 gap-1.5" onClick={openCreate}>
                  <Plus className="w-3.5 h-3.5" /> {t.crm.newCampaign}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {campaigns.map(camp => {
                const tf = camp.target_filters as TargetFilters | null;
                const rc = tf ? recipientCount(tf, contacts, companies) : null;
                return (
                  <Card key={camp.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-foreground">{camp.name}</p>
                            <Badge variant="outline" className="text-xs">{CHANNEL_LABELS[camp.channel] ?? camp.channel}</Badge>
                            <Badge className={cn('text-xs', STATUS_COLORS[camp.status])}>{STATUS_LABELS[camp.status] ?? camp.status}</Badge>
                          </div>

                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                            {rc !== null && (
                              <span className="flex items-center gap-1">
                                {tf?.recipient_type === 'companies'
                                  ? <Building2 className="w-3 h-3" />
                                  : <Users className="w-3 h-3" />}
                                {rc} {t.crm.recipientCount}
                              </span>
                            )}
                            {camp.scheduled_at && camp.status === 'scheduled' && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {t.crm.scheduledFor}: {format(parseISO(camp.scheduled_at), 'dd/MM/yyyy HH:mm')}
                              </span>
                            )}
                            {camp.status === 'sent' && (
                              <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle2 className="w-3 h-3" /> {t.crm.sentStatus}
                              </span>
                            )}
                          </div>

                          {(camp.stats?.sent > 0 || camp.stats?.opened > 0) && (
                            <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                              <span>{t.crm.sent}: {camp.stats.sent ?? 0}</span>
                              <span>{t.crm.opened}: {camp.stats.opened ?? 0}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => openEdit(camp)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1.5 h-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(camp)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="flows" className="mt-4">
          <CRMFlowsManager flows={flows} onRefresh={fetchData} />
        </TabsContent>
      </Tabs>

      {/* ── Campaign Dialog ── */}
      <Dialog open={campaignDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setCampaignDialogOpen(open); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCampaign ? t.crm.editCampaign : t.crm.newCampaign}</DialogTitle>
            <DialogDescription>{t.crm.automationsDesc}</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-1">
            {/* ── Básico ── */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>{t.common.name} *</Label>
                <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder={t.crm.campaignName} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t.crm.channel}</Label>
                  <Select value={formChannel} onValueChange={setFormChannel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">{t.crm.email}</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="both">{t.crm.both}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(formChannel === 'email' || formChannel === 'both') && (
                  <div className="space-y-1.5">
                    <Label>{t.crm.emailSubject}</Label>
                    <Input value={formSubject} onChange={e => setFormSubject(e.target.value)} placeholder={t.crm.emailSubjectPlaceholder} />
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>{t.crm.message}</Label>
                <Textarea value={formBody} onChange={e => setFormBody(e.target.value)} placeholder={t.crm.messagePlaceholder} rows={4} />
              </div>
            </div>

            <Separator />

            {/* ── Destinatários ── */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4" /> {t.crm.recipients}
              </p>

              {/* Tipo */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t.crm.recipientType}</Label>
                <div className="flex gap-2">
                  {(['contacts', 'companies'] as const).map(type => (
                    <Button
                      key={type}
                      size="sm"
                      variant={formTargetFilters.recipient_type === type ? 'default' : 'outline'}
                      className="gap-1.5"
                      onClick={() => updateTF({ recipient_type: type, manual_ids: [] })}
                    >
                      {type === 'contacts' ? <Users className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                      {type === 'contacts' ? t.crm.recipientContacts : t.crm.recipientCompanies}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Modo de seleção */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t.crm.selectionMode}</Label>
                <RadioGroup
                  value={formTargetFilters.selection_mode}
                  onValueChange={v => updateTF({ selection_mode: v as TargetFilters['selection_mode'], manual_ids: [] })}
                  className="flex gap-4"
                >
                  {([
                    { value: 'all', label: t.crm.selectionAll },
                    { value: 'filter', label: t.crm.selectionFilter },
                    { value: 'manual', label: t.crm.selectionManual },
                  ] as const).map(opt => (
                    <div key={opt.value} className="flex items-center gap-2">
                      <RadioGroupItem value={opt.value} id={`mode-${opt.value}`} />
                      <label htmlFor={`mode-${opt.value}`} className="text-sm cursor-pointer">{opt.label}</label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Filtros */}
              {formTargetFilters.selection_mode === 'filter' && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border bg-muted/30">
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1"><Filter className="w-3 h-3" />{t.crm.filterTemperature}</Label>
                    <Select value={formTargetFilters.filters.temperature} onValueChange={v => updateTF({ filters: { ...formTargetFilters.filters, temperature: v } })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t.crm.allTemperatures}</SelectItem>
                        <SelectItem value="hot">{TEMP_LABELS.hot}</SelectItem>
                        <SelectItem value="warm">{TEMP_LABELS.warm}</SelectItem>
                        <SelectItem value="cold">{TEMP_LABELS.cold}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1"><Filter className="w-3 h-3" />{t.crm.filterStatus}</Label>
                    <Select value={formTargetFilters.filters.status} onValueChange={v => updateTF({ filters: { ...formTargetFilters.filters, status: v } })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t.crm.allStatuses}</SelectItem>
                        <SelectItem value="lead">Lead</SelectItem>
                        <SelectItem value="client">{t.crm.client}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 text-xs text-muted-foreground">
                    {filteredByFilterList.length} {t.crm.recipientCount}
                  </div>
                </div>
              )}

              {/* Seleção manual */}
              {formTargetFilters.selection_mode === 'manual' && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="p-2 border-b bg-muted/30 flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      className="h-7 border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
                      placeholder={formTargetFilters.recipient_type === 'contacts' ? t.crm.searchContacts : t.crm.searchCompanies}
                      value={manualSearch}
                      onChange={e => setManualSearch(e.target.value)}
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y">
                    {filteredManualList.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">{t.crm.noRecipientsSelected}</p>
                    ) : filteredManualList.map(item => {
                      const id = item.id;
                      const label = 'name' in item ? item.name : item.razao_social;
                      const checked = formTargetFilters.manual_ids.includes(id);
                      return (
                        <div key={id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30 cursor-pointer" onClick={() => toggleManualId(id)}>
                          <Checkbox checked={checked} onCheckedChange={() => toggleManualId(id)} />
                          <span className="text-sm flex-1 truncate">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="px-3 py-1.5 border-t bg-muted/20 text-xs text-muted-foreground">
                    {formTargetFilters.manual_ids.length} {t.crm.recipientCount}
                  </div>
                </div>
              )}

              {/* Contagem total */}
              {formTargetFilters.selection_mode === 'all' && (
                <p className="text-xs text-muted-foreground">
                  {formTargetFilters.recipient_type === 'contacts' ? contacts.length : companies.length} {t.crm.recipientCount}
                </p>
              )}
            </div>

            <Separator />

            {/* ── Envio ── */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" /> {t.crm.sendMode}
              </p>
              <RadioGroup value={formSendMode} onValueChange={v => setFormSendMode(v as 'now' | 'scheduled')} className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="now" id="send-now" />
                  <label htmlFor="send-now" className="text-sm cursor-pointer flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5" /> {t.crm.sendNow}
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="scheduled" id="send-scheduled" />
                  <label htmlFor="send-scheduled" className="text-sm cursor-pointer flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> {t.crm.sendScheduled}
                  </label>
                </div>
              </RadioGroup>

              {formSendMode === 'scheduled' && (
                <div className="space-y-1.5">
                  <Label>{t.crm.scheduling}</Label>
                  <Input type="datetime-local" value={formScheduledAt} onChange={e => setFormScheduledAt(e.target.value)} />
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => { setCampaignDialogOpen(false); resetForm(); }}>{t.common.cancel}</Button>
            <Button
              onClick={handleSaveCampaign}
              disabled={!formName.trim() || (formSendMode === 'scheduled' && !formScheduledAt) || saving}
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              {formSendMode === 'now'
                ? t.crm.sendCampaign
                : editingCampaign ? t.crm.saveCampaign : t.crm.createCampaign}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.crm.deleteCampaign}</AlertDialogTitle>
            <AlertDialogDescription>{deleteTarget?.name}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCampaign} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t.crm.deleteCampaign}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
