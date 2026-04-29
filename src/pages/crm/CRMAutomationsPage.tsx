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
  Tag, ChevronDown, ChevronUp, Eye,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { CRMFlowsManager } from '@/components/crm/CRMFlowsManager';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────
interface TargetFilters {
  recipient_type: 'contacts' | 'companies';
  selection_mode: 'all' | 'filter' | 'manual';
  filters: {
    temperature: string;
    status: string;
    tags: string[];      // filter: must have ALL selected tags
  };
  manual_ids: string[];
}

interface CRMContact {
  id: string; name: string; temperature: string; status: string; tags: string[] | null;
}
interface CRMCompany {
  id: string; razao_social: string; temperature: string; status: string; tags: string[] | null;
}

const defaultTargetFilters: TargetFilters = {
  recipient_type: 'contacts',
  selection_mode: 'all',
  filters: { temperature: 'all', status: 'all', tags: [] },
  manual_ids: [],
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function applyFilters(
  list: (CRMContact | CRMCompany)[],
  filters: TargetFilters['filters'],
): (CRMContact | CRMCompany)[] {
  return list.filter(r => {
    if (filters.temperature !== 'all' && r.temperature !== filters.temperature) return false;
    if (filters.status !== 'all' && r.status !== filters.status) return false;
    if (filters.tags.length > 0) {
      const rt = r.tags ?? [];
      if (!filters.tags.every(tag => rt.includes(tag))) return false;
    }
    return true;
  });
}

function resolveRecipients(
  tf: TargetFilters,
  contacts: CRMContact[],
  companies: CRMCompany[],
): (CRMContact | CRMCompany)[] {
  const list: (CRMContact | CRMCompany)[] = tf.recipient_type === 'contacts' ? contacts : companies;
  if (tf.selection_mode === 'manual') return list.filter(r => tf.manual_ids.includes(r.id));
  if (tf.selection_mode === 'all') return list;
  return applyFilters(list, tf.filters);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CRMAutomationsPage() {
  const { currentCompany, supabaseUser } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();

  const CHANNEL_LABELS: Record<string, string> = { email: t.crm.email, whatsapp: 'WhatsApp', both: t.crm.both };
  const STATUS_LABELS: Record<string, string> = {
    draft: t.crm.draft, scheduled: t.crm.scheduled, sent: t.crm.sentStatus,
  };
  const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    scheduled: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    sent: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  };
  const TEMP_LABELS: Record<string, string> = { hot: t.crm.hot, warm: t.crm.warm, cold: t.crm.cold };

  // ── State ──
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [flows, setFlows] = useState<any[]>([]);
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [companies, setCompanies] = useState<CRMCompany[]>([]);
  const [loading, setLoading] = useState(true);

  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Form
  const [formName, setFormName] = useState('');
  const [formChannel, setFormChannel] = useState('email');
  const [formSubject, setFormSubject] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formSendMode, setFormSendMode] = useState<'now' | 'scheduled'>('now');
  const [formScheduledAt, setFormScheduledAt] = useState('');
  const [formTF, setFormTF] = useState<TargetFilters>(defaultTargetFilters);
  const [manualSearch, setManualSearch] = useState('');

  // ── Fetch ──
  const fetchData = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const [{ data: c }, { data: f }, { data: ct }, { data: co }] = await Promise.all([
        supabase.from('crm_campaigns').select('*').eq('company_id', currentCompany.id).order('created_at', { ascending: false }),
        supabase.from('crm_flows').select('*').eq('company_id', currentCompany.id).order('created_at', { ascending: false }),
        supabase.from('crm_contacts').select('id, name, temperature, status, tags').eq('company_id', currentCompany.id).order('name').limit(2000),
        supabase.from('crm_companies').select('id, razao_social, temperature, status, tags').eq('company_id', currentCompany.id).order('razao_social').limit(2000),
      ]);
      if (c) setCampaigns(c);
      if (f) setFlows(f);
      if (ct) setContacts(ct as CRMContact[]);
      if (co) setCompanies(co as CRMCompany[]);
    } catch { } finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, [currentCompany]);

  // ── Derived tag lists ──
  const allContactTags = useMemo(() => {
    const s = new Set<string>();
    contacts.forEach(c => (c.tags ?? []).forEach(t => s.add(t)));
    return Array.from(s).sort();
  }, [contacts]);

  const allCompanyTags = useMemo(() => {
    const s = new Set<string>();
    companies.forEach(c => (c.tags ?? []).forEach(t => s.add(t)));
    return Array.from(s).sort();
  }, [companies]);

  const availableTags = formTF.recipient_type === 'contacts' ? allContactTags : allCompanyTags;

  // ── Resolved recipients for form ──
  const resolvedRecipients = useMemo(
    () => resolveRecipients(formTF, contacts, companies),
    [formTF, contacts, companies],
  );

  // ── Manual list (searchable) ──
  const manualList = useMemo(() => {
    const q = manualSearch.toLowerCase();
    const list: (CRMContact | CRMCompany)[] = formTF.recipient_type === 'contacts' ? contacts : companies;
    return list.filter(r => {
      const label = 'name' in r ? r.name : r.razao_social;
      return !q || label.toLowerCase().includes(q);
    });
  }, [formTF.recipient_type, contacts, companies, manualSearch]);

  // ── Helpers ──
  const patchTF = (patch: Partial<TargetFilters>) =>
    setFormTF(prev => ({ ...prev, ...patch }));

  const patchFilter = (key: keyof TargetFilters['filters'], val: any) =>
    setFormTF(prev => ({ ...prev, filters: { ...prev.filters, [key]: val } }));

  const toggleTag = (tag: string) => {
    const cur = formTF.filters.tags;
    patchFilter('tags', cur.includes(tag) ? cur.filter(x => x !== tag) : [...cur, tag]);
  };

  const toggleManual = (id: string) => {
    const ids = formTF.manual_ids;
    patchTF({ manual_ids: ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id] });
  };

  const selectAllVisible = () =>
    patchTF({ manual_ids: [...new Set([...formTF.manual_ids, ...manualList.map(r => r.id)])] });

  const clearManual = () => patchTF({ manual_ids: [] });

  // ── Form reset / open ──
  const resetForm = () => {
    setFormName(''); setFormChannel('email'); setFormSubject(''); setFormBody('');
    setFormSendMode('now'); setFormScheduledAt('');
    setFormTF(defaultTargetFilters); setManualSearch(''); setEditingCampaign(null);
  };

  const openCreate = () => { resetForm(); setCampaignDialogOpen(true); };

  const openEdit = (camp: any) => {
    setEditingCampaign(camp);
    setFormName(camp.name);
    setFormChannel(camp.channel || 'email');
    setFormSubject(camp.template_subject || '');
    setFormBody(camp.template_body || '');
    const tf = camp.target_filters as TargetFilters | null;
    setFormTF(tf
      ? {
        ...defaultTargetFilters, ...tf,
        filters: { ...defaultTargetFilters.filters, ...(tf.filters ?? {}), tags: tf.filters?.tags ?? [] },
      }
      : defaultTargetFilters,
    );
    setFormSendMode(camp.scheduled_at ? 'scheduled' : 'now');
    setFormScheduledAt(camp.scheduled_at ? camp.scheduled_at.slice(0, 16) : '');
    setCampaignDialogOpen(true);
  };

  // ── Save ──
  const handleSaveCampaign = async () => {
    if (!formName.trim() || !currentCompany) return;
    setSaving(true);
    const status: any = formSendMode === 'now' ? 'sent' : formScheduledAt ? 'scheduled' : 'draft';
    const payload = {
      company_id: currentCompany.id, name: formName.trim(),
      channel: formChannel as any,
      template_subject: formSubject || null, template_body: formBody || null,
      target_filters: formTF as any,
      scheduled_at: formSendMode === 'scheduled' && formScheduledAt ? formScheduledAt : null,
      status, created_by: supabaseUser?.id,
    };
    const { error } = editingCampaign
      ? await supabase.from('crm_campaigns').update(payload).eq('id', editingCampaign.id)
      : await supabase.from('crm_campaigns').insert(payload);
    setSaving(false);
    if (error) { toast({ title: t.crm.errorCreatingCampaign, variant: 'destructive' }); return; }
    toast({ title: editingCampaign ? t.crm.campaignUpdated : formSendMode === 'now' ? t.crm.campaignSent : t.crm.campaignCreated });
    setCampaignDialogOpen(false); resetForm(); fetchData();
  };

  // ── Delete ──
  const handleDeleteCampaign = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('crm_campaigns').delete().eq('id', deleteTarget.id);
    if (error) toast({ title: t.crm.errorDeletingCampaign, variant: 'destructive' });
    else { toast({ title: t.crm.campaignDeleted }); fetchData(); }
    setDeleteTarget(null);
  };

  // ── Recipient count for existing campaigns ──
  function campaignRecipientCount(tf: TargetFilters | null) {
    if (!tf) return null;
    return resolveRecipients(tf, contacts, companies).length;
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Zap className="w-6 h-6 text-primary" /> {t.crm.automations}
        </h1>
        <p className="text-sm text-muted-foreground">{t.crm.automationsDesc}</p>
      </div>

      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns" className="gap-1.5">
            <Send className="w-3.5 h-3.5" /> {t.crm.campaigns}
          </TabsTrigger>
          <TabsTrigger value="flows" className="gap-1.5">
            <Workflow className="w-3.5 h-3.5" /> {t.crm.flows}
          </TabsTrigger>
        </TabsList>

        {/* ── Campaigns tab ── */}
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
                const rc = campaignRecipientCount(tf);
                const tagFilters: string[] = tf?.filters?.tags ?? [];
                return (
                  <Card key={camp.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0 space-y-2">
                          {/* Title row */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-foreground">{camp.name}</p>
                            <Badge variant="outline" className="text-xs">{CHANNEL_LABELS[camp.channel] ?? camp.channel}</Badge>
                            <Badge className={cn('text-xs', STATUS_COLORS[camp.status])}>{STATUS_LABELS[camp.status] ?? camp.status}</Badge>
                          </div>

                          {/* Meta row */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                            {rc !== null && (
                              <span className="flex items-center gap-1 font-medium text-foreground/70">
                                {tf?.recipient_type === 'companies'
                                  ? <Building2 className="w-3 h-3" />
                                  : <Users className="w-3 h-3" />}
                                {rc} {tf?.recipient_type === 'companies' ? t.crm.companiesSelected : t.crm.contactsSelected}
                              </span>
                            )}
                            {camp.scheduled_at && camp.status === 'scheduled' && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {t.crm.scheduledFor}: {format(parseISO(camp.scheduled_at), 'dd/MM/yyyy HH:mm')}
                              </span>
                            )}
                            {camp.status === 'sent' && (
                              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-3 h-3" /> {t.crm.sentStatus}
                              </span>
                            )}
                            {(camp.stats?.sent > 0 || camp.stats?.opened > 0) && (
                              <>
                                <span>{t.crm.sent}: {camp.stats.sent ?? 0}</span>
                                <span>{t.crm.opened}: {camp.stats.opened ?? 0}</span>
                              </>
                            )}
                          </div>

                          {/* Tags row */}
                          {tagFilters.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Tag className="w-3 h-3 text-muted-foreground" />
                              {tagFilters.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                              ))}
                            </div>
                          )}

                          {/* Selection mode info */}
                          {tf && (
                            <p className="text-xs text-muted-foreground">
                              {tf.selection_mode === 'all' && t.crm.selectionAll}
                              {tf.selection_mode === 'filter' && t.crm.selectionFilter}
                              {tf.selection_mode === 'manual' && t.crm.selectionManual}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => openEdit(camp)} title={t.crm.editCampaign}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 px-2 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(camp)} title={t.crm.deleteCampaign}>
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

        {/* ── Flows tab ── */}
        <TabsContent value="flows" className="mt-4">
          <CRMFlowsManager flows={flows} onRefresh={fetchData} />
        </TabsContent>
      </Tabs>

      {/* ══════════════ Campaign Dialog ══════════════ */}
      <Dialog open={campaignDialogOpen} onOpenChange={open => { if (!open) resetForm(); setCampaignDialogOpen(open); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCampaign ? t.crm.editCampaign : t.crm.newCampaign}</DialogTitle>
            <DialogDescription>{t.crm.automationsDesc}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-1">

            {/* ── 1. Conteúdo ── */}
            <section className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">1. {t.common.name} / {t.crm.message}</p>
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
            </section>

            <Separator />

            {/* ── 2. Destinatários ── */}
            <section className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">2. {t.crm.recipients}</p>

              {/* Classificação: Contatos vs Empresas */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t.crm.classificationLabel}</Label>
                <div className="flex gap-2">
                  {(['contacts', 'companies'] as const).map(type => (
                    <Button
                      key={type}
                      size="sm"
                      variant={formTF.recipient_type === type ? 'default' : 'outline'}
                      className="gap-1.5 flex-1 sm:flex-none"
                      onClick={() => patchTF({ recipient_type: type, manual_ids: [], filters: { ...formTF.filters, tags: [] } })}
                    >
                      {type === 'contacts' ? <Users className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                      {type === 'contacts' ? t.crm.recipientContacts : t.crm.recipientCompanies}
                      <Badge variant="secondary" className="ml-1 h-4 text-[10px] px-1">
                        {type === 'contacts' ? contacts.length : companies.length}
                      </Badge>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Modo de seleção */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t.crm.selectionMode}</Label>
                <RadioGroup
                  value={formTF.selection_mode}
                  onValueChange={v => patchTF({ selection_mode: v as TargetFilters['selection_mode'], manual_ids: [] })}
                  className="flex flex-wrap gap-4"
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

              {/* ── Por filtro ── */}
              {formTF.selection_mode === 'filter' && (
                <div className="p-3 rounded-lg border bg-muted/30 space-y-3">

                  {/* Temperatura + Status */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1">
                        <Filter className="w-3 h-3" />{t.crm.filterTemperature}
                      </Label>
                      <Select value={formTF.filters.temperature} onValueChange={v => patchFilter('temperature', v)}>
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
                      <Label className="text-xs flex items-center gap-1">
                        <Filter className="w-3 h-3" />{t.crm.filterStatus}
                      </Label>
                      <Select value={formTF.filters.status} onValueChange={v => patchFilter('status', v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t.crm.allStatuses}</SelectItem>
                          <SelectItem value="lead">Lead</SelectItem>
                          <SelectItem value="client">{t.crm.client}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Filtro por tags */}
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1">
                      <Tag className="w-3 h-3" />{t.crm.filterByTag}
                    </Label>
                    {availableTags.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-1">{t.crm.noTagsAvailable}</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {availableTags.map(tag => {
                          const active = formTF.filters.tags.includes(tag);
                          return (
                            <button
                              key={tag}
                              onClick={() => toggleTag(tag)}
                              className={cn(
                                'px-2 py-0.5 rounded-full text-xs border transition-colors',
                                active
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'bg-background text-foreground border-border hover:border-primary/50',
                              )}
                            >
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Contagem */}
                  <div className="flex items-center justify-between pt-1 border-t">
                    <span className="text-xs font-medium text-foreground">
                      {resolvedRecipients.length} {formTF.recipient_type === 'companies' ? t.crm.companiesSelected : t.crm.contactsSelected}
                    </span>
                    <Button size="sm" variant="ghost" className="h-6 text-xs gap-1 text-muted-foreground" onClick={() => setPreviewOpen(v => !v)}>
                      <Eye className="w-3 h-3" /> {t.crm.previewRecipients}
                    </Button>
                  </div>

                  {/* Preview list */}
                  {previewOpen && (
                    <div className="border rounded-md max-h-36 overflow-y-auto divide-y">
                      {resolvedRecipients.length === 0
                        ? <p className="text-xs text-muted-foreground text-center py-3">{t.crm.noRecipientsSelected}</p>
                        : resolvedRecipients.map(r => (
                          <div key={r.id} className="px-3 py-1.5 text-xs flex items-center gap-2">
                            {'name' in r ? <Users className="w-3 h-3 text-muted-foreground" /> : <Building2 className="w-3 h-3 text-muted-foreground" />}
                            <span className="truncate">{'name' in r ? r.name : r.razao_social}</span>
                            <span className="ml-auto text-muted-foreground shrink-0">{TEMP_LABELS[r.temperature] ?? r.temperature}</span>
                          </div>
                        ))
                      }
                    </div>
                  )}
                </div>
              )}

              {/* ── Seleção manual ── */}
              {formTF.selection_mode === 'manual' && (
                <div className="border rounded-lg overflow-hidden">
                  {/* Search bar + actions */}
                  <div className="p-2 border-b bg-muted/30 flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <Input
                      className="h-7 border-0 bg-transparent p-0 text-sm focus-visible:ring-0 flex-1"
                      placeholder={formTF.recipient_type === 'contacts' ? t.crm.searchContacts : t.crm.searchCompanies}
                      value={manualSearch}
                      onChange={e => setManualSearch(e.target.value)}
                    />
                  </div>

                  {/* Quick actions */}
                  <div className="px-3 py-1.5 border-b bg-muted/10 flex items-center gap-3">
                    <button onClick={selectAllVisible} className="text-xs text-primary hover:underline">
                      {t.crm.selectAllVisible} ({manualList.length})
                    </button>
                    <span className="text-muted-foreground">·</span>
                    <button onClick={clearManual} className="text-xs text-muted-foreground hover:underline">
                      {t.crm.clearSelection}
                    </button>
                  </div>

                  {/* Checkbox list */}
                  <div className="max-h-52 overflow-y-auto divide-y">
                    {manualList.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">{t.crm.noRecipientsSelected}</p>
                    ) : manualList.map(item => {
                      const label = 'name' in item ? item.name : item.razao_social;
                      const itemTags = item.tags ?? [];
                      const checked = formTF.manual_ids.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30 cursor-pointer"
                          onClick={() => toggleManual(item.id)}
                        >
                          <Checkbox checked={checked} onCheckedChange={() => toggleManual(item.id)} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{label}</p>
                            {itemTags.length > 0 && (
                              <div className="flex gap-1 mt-0.5 flex-wrap">
                                {itemTags.slice(0, 3).map(tag => (
                                  <span key={tag} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">{tag}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">{TEMP_LABELS[item.temperature] ?? ''}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer count */}
                  <div className="px-3 py-1.5 border-t bg-muted/20 text-xs font-medium text-foreground/70">
                    {formTF.manual_ids.length} {formTF.recipient_type === 'companies' ? t.crm.companiesSelected : t.crm.contactsSelected}
                  </div>
                </div>
              )}

              {/* All mode count */}
              {formTF.selection_mode === 'all' && (
                <p className="text-xs text-muted-foreground">
                  {formTF.recipient_type === 'contacts' ? contacts.length : companies.length}{' '}
                  {formTF.recipient_type === 'companies' ? t.crm.companiesSelected : t.crm.contactsSelected}
                </p>
              )}
            </section>

            <Separator />

            {/* ── 3. Envio ── */}
            <section className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">3. {t.crm.sendMode}</p>
              <RadioGroup value={formSendMode} onValueChange={v => setFormSendMode(v as 'now' | 'scheduled')} className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="now" id="send-now" />
                  <label htmlFor="send-now" className="text-sm cursor-pointer flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-emerald-600" /> {t.crm.sendNow}
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="scheduled" id="send-scheduled" />
                  <label htmlFor="send-scheduled" className="text-sm cursor-pointer flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" /> {t.crm.sendScheduled}
                  </label>
                </div>
              </RadioGroup>

              {formSendMode === 'scheduled' && (
                <div className="space-y-1.5">
                  <Label>{t.crm.scheduling} *</Label>
                  <Input type="datetime-local" value={formScheduledAt} onChange={e => setFormScheduledAt(e.target.value)} />
                </div>
              )}

              {/* Summary */}
              <div className="p-3 rounded-lg border bg-muted/20 text-xs space-y-1 text-muted-foreground">
                <p className="font-semibold text-foreground text-sm">{t.crm.recipientSummary}</p>
                <p>
                  {formTF.recipient_type === 'contacts' ? <Users className="w-3 h-3 inline mr-1" /> : <Building2 className="w-3 h-3 inline mr-1" />}
                  <strong>{resolvedRecipients.length}</strong>{' '}
                  {formTF.recipient_type === 'companies' ? t.crm.companiesSelected : t.crm.contactsSelected}
                </p>
                <p>
                  {formSendMode === 'now'
                    ? `📤 ${t.crm.sendNow}`
                    : formScheduledAt
                      ? `📅 ${t.crm.scheduledFor}: ${format(new Date(formScheduledAt), 'dd/MM/yyyy HH:mm')}`
                      : `📅 ${t.crm.sendScheduled} — ${t.crm.scheduling}`}
                </p>
              </div>
            </section>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button variant="outline" onClick={() => { setCampaignDialogOpen(false); resetForm(); }}>
              {t.common.cancel}
            </Button>
            <Button
              onClick={handleSaveCampaign}
              disabled={!formName.trim() || (formSendMode === 'scheduled' && !formScheduledAt) || saving}
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              {formSendMode === 'now' ? t.crm.sendCampaign : editingCampaign ? t.crm.saveCampaign : t.crm.createCampaign}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Delete ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.crm.deleteCampaign}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.name}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCampaign}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t.crm.deleteCampaign}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
