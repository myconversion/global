import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/contexts/I18nContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Save, Loader2, Phone, Mail, Pencil, Link2, DollarSign } from 'lucide-react';
import { LinkDealDialog } from '@/components/crm/LinkDealDialog';
import { CRMTimeline } from '@/components/crm/CRMTimeline';
import { computeTemperature, CadenceSettings, DEFAULT_CADENCE } from '@/components/crm/crm-temperature';
import { formatCurrency } from '@/lib/format-utils';

interface CustomFields {
  secondary_email?: string;
  secondary_phone?: string;
  birth_date?: string;
  gender?: string;
  department?: string;
  priority?: string;
  category?: string;
  address?: {
    street?: string; number?: string; complement?: string; neighborhood?: string;
    city?: string; state?: string; zip?: string; country?: string; timezone?: string;
  };
  social?: {
    instagram_url?: string; instagram_handle?: string; instagram_user_id?: string;
    instagram_followers?: string; instagram_engagement?: string;
    facebook?: string; linkedin?: string; twitter?: string;
    preferred_contact?: string; language?: string;
  };
  tracking?: {
    utm_source?: string; utm_medium?: string; utm_campaign?: string;
    utm_term?: string; utm_content?: string;
  };
  scoring?: {
    engagement_level?: string; ltv?: number; total_orders?: number;
    avg_ticket?: number; credit_limit?: number | null;
  };
  notes?: string;
}

const defaultCustomFields: CustomFields = {
  secondary_email: '', secondary_phone: '', birth_date: '', gender: '', department: '',
  priority: 'media', category: '',
  address: { street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zip: '', country: 'BR', timezone: 'America/Sao_Paulo' },
  social: { instagram_url: '', instagram_handle: '', instagram_user_id: '', instagram_followers: '', instagram_engagement: '', facebook: '', linkedin: '', twitter: '', preferred_contact: '', language: 'Português (Brasil)' },
  tracking: { utm_source: '', utm_medium: '', utm_campaign: '', utm_term: '', utm_content: '' },
  scoring: { engagement_level: 'baixo', ltv: 0, total_orders: 0, avg_ticket: 0, credit_limit: null },
  notes: '',
};

function InfoField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm text-foreground">{value || 'N/A'}</p>
    </div>
  );
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

export default function CRMContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentCompany } = useAuth();
  const { toast } = useToast();
  const { t, language } = useI18n();

  const TEMP_LABELS: Record<string, string> = { cold: t.crmDetail.tempCold, warm: t.crmDetail.tempWarm, hot: t.crmDetail.tempHot };
  const TEMP_COLORS: Record<string, string> = { cold: 'bg-blue-100 text-blue-800', warm: 'bg-yellow-100 text-yellow-800', hot: 'bg-red-100 text-red-800' };
  const STATUS_LABELS: Record<string, string> = { lead: t.crmDetail.statusLead, client: t.crmDetail.statusClient };
  const ORIGIN_LABELS: Record<string, string> = {
    indicacao: t.crmDetail.originIndicacao, inbound: t.crmDetail.originInbound, outbound: t.crmDetail.originOutbound,
    social_media: t.crmDetail.originSocialMedia, evento: t.crmDetail.originEvento, other: t.crmDetail.originOther,
  };

  const [contact, setContact] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [linkDealOpen, setLinkDealOpen] = useState(false);
  const [editTab, setEditTab] = useState('basico');
  const [cadence, setCadence] = useState<CadenceSettings>(DEFAULT_CADENCE);
  const [contactDeals, setContactDeals] = useState<{ id: string; title: string; value: number; stage_name: string; pipeline_id: string; expected_close_date: string | null; created_at: string }[]>([]);
  const [pipelinesMap, setPipelinesMap] = useState<Record<string, { name: string; stages: { name: string; probability: number }[] }>>({});

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [position, setPosition] = useState('');
  const [temperature, setTemperature] = useState('cold');
  const [status, setStatus] = useState('lead');
  const [origin, setOrigin] = useState('other');
  const [tags, setTags] = useState('');
  const [cf, setCf] = useState<CustomFields>(defaultCustomFields);

  useEffect(() => {
    if (!id || !currentCompany) return;
    const fetchData = async () => {
      setLoading(true);
      const [{ data: c }, { data: cadenceData }] = await Promise.all([
        supabase.from('crm_contacts').select('*').eq('id', id).single(),
        supabase.from('crm_cadence_settings').select('*').eq('company_id', currentCompany.id).maybeSingle(),
      ]);
      if (cadenceData) setCadence({ warm_after_days: cadenceData.warm_after_days, cold_after_days: cadenceData.cold_after_days });
      if (c) {
        setContact(c);
        setName(c.name); setEmail(c.email ?? ''); setPhone(c.phone ?? '');
        setCpf(c.cpf ?? ''); setPosition(c.position ?? '');
        setTemperature(c.temperature ?? 'cold'); setStatus(c.status ?? 'lead'); setOrigin(c.origin ?? 'other');
        setTags((c.tags ?? []).join(', '));
        const raw = (c.custom_fields ?? {}) as CustomFields;
        setCf({
          ...defaultCustomFields,
          ...raw,
          address: { ...defaultCustomFields.address, ...(raw.address || {}) },
          social: { ...defaultCustomFields.social, ...(raw.social || {}) },
          tracking: { ...defaultCustomFields.tracking, ...(raw.tracking || {}) },
          scoring: { ...defaultCustomFields.scoring, ...(raw.scoring || {}) },
        });
      }
      setLoading(false);
    };
    fetchData();
  }, [id, currentCompany]);

  useEffect(() => {
    if (!id || !currentCompany) return;
    (async () => {
      const { data: deals } = await supabase.from('crm_pipeline_deals')
        .select('id, title, value, stage_name, pipeline_id, expected_close_date, created_at')
        .eq('company_id', currentCompany.id).eq('contact_id', id);
      if (deals) setContactDeals(deals);
      const { data: pipes } = await supabase.from('crm_pipelines')
        .select('id, name, stages').eq('company_id', currentCompany.id);
      if (pipes) {
        const map: Record<string, { name: string; stages: { name: string; probability: number }[] }> = {};
        pipes.forEach(p => { map[p.id] = { name: p.name, stages: Array.isArray(p.stages) ? p.stages as any : [] }; });
        setPipelinesMap(map);
      }
    })();
  }, [id, currentCompany]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    const { error } = await supabase.from('crm_contacts').update({
      name, email: email || null, phone: phone || null, cpf: cpf || null,
      position: position || null, temperature: temperature as any,
      status: status as any, origin: origin as any,
      tags: tags ? tags.split(',').map(tg => tg.trim()).filter(Boolean) : [],
      custom_fields: cf as any,
    }).eq('id', id);
    setSaving(false);
    if (error) toast({ title: t.crmDetail.errorSaving, variant: 'destructive' });
    else {
      toast({ title: t.crmDetail.contactUpdated });
      setEditOpen(false);
      const { data: c } = await supabase.from('crm_contacts').select('*').eq('id', id).single();
      if (c) setContact(c);
    }
  };

  const updateCf = (path: string, value: any) => {
    setCf(prev => {
      const next = { ...prev };
      const parts = path.split('.');
      if (parts.length === 1) {
        (next as any)[parts[0]] = value;
      } else {
        (next as any)[parts[0]] = { ...(next as any)[parts[0]], [parts[1]]: value };
      }
      return next;
    });
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!contact) return <p className="text-center py-20 text-muted-foreground">{t.crmDetail.contactNotFound}</p>;

  const displayCf = {
    ...defaultCustomFields,
    ...((contact.custom_fields ?? {}) as CustomFields),
    address: { ...defaultCustomFields.address, ...((contact.custom_fields as any)?.address || {}) },
    social: { ...defaultCustomFields.social, ...((contact.custom_fields as any)?.social || {}) },
    tracking: { ...defaultCustomFields.tracking, ...((contact.custom_fields as any)?.tracking || {}) },
    scoring: { ...defaultCustomFields.scoring, ...((contact.custom_fields as any)?.scoring || {}) },
  };

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/crm/people')} className="gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" /> {t.crmDetail.back}
        </Button>
        <div className="flex items-center gap-2">
          <Button onClick={() => setLinkDealOpen(true)} size="sm" className="gap-1.5 bg-[#4084F2] text-white hover:bg-[#3070D9]">
            <Link2 className="w-3.5 h-3.5" /> {t.crmDetail.linkDeal}
          </Button>
          <Button onClick={() => setEditOpen(true)} variant="outline" size="sm" className="gap-1.5">
            <Pencil className="w-3.5 h-3.5" /> {t.crmDetail.editProfile}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
        <Card>
          <CardContent className="pt-6 space-y-5">
            <div className="flex flex-col items-center text-center gap-3">
              <Avatar className="w-20 h-20">
                <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">
                  {getInitials(contact.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-lg font-bold text-foreground">{contact.name}</h2>
                <div className="flex gap-1.5 mt-1 justify-center flex-wrap">
                  <Badge variant="secondary">{STATUS_LABELS[contact.status] || contact.status}</Badge>
                  {(() => {
                    const dynTemp = computeTemperature(contact.created_at, contact.last_interaction_at, cadence);
                    return (
                      <Badge className={TEMP_COLORS[dynTemp] || ''} variant="outline">
                        {TEMP_LABELS[dynTemp] || dynTemp}
                      </Badge>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t.crmDetail.contactSection}</p>
              {contact.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-foreground">{contact.phone}</span>
                </div>
              )}
              {contact.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-foreground break-all">{contact.email}</span>
                </div>
              )}
            </div>

            <div className="border-t pt-4 space-y-3">
              <InfoField label={t.crmDetail.origin} value={ORIGIN_LABELS[contact.origin] || contact.origin} />
              <InfoField label={t.crmDetail.leadScore} value={`${contact.score} / 100`} />
              {contact.position && <InfoField label={t.crmDetail.position} value={contact.position} />}
              {(contact.tags ?? []).length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t.crmDetail.tags}</p>
                  <div className="flex flex-wrap gap-1">
                    {(contact.tags as string[]).map(tg => (
                      <Badge key={tg} variant="outline" className="text-xs">{tg}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <Tabs value={editTab} onValueChange={setEditTab}>
              <div className="overflow-x-auto -mx-1 px-1">
                <TabsList className="inline-flex w-max whitespace-nowrap h-auto gap-1">
                  <TabsTrigger value="basico" className="text-xs shrink-0">{t.crmDetail.tabBasic}</TabsTrigger>
                  <TabsTrigger value="endereco" className="text-xs shrink-0">{t.crmDetail.tabAddress}</TabsTrigger>
                  <TabsTrigger value="social" className="text-xs shrink-0">{t.crmDetail.tabSocial}</TabsTrigger>
                  <TabsTrigger value="tracking" className="text-xs shrink-0">{t.crmDetail.tabTracking}</TabsTrigger>
                  <TabsTrigger value="scoring" className="text-xs shrink-0">{t.crmDetail.tabScoring}</TabsTrigger>
                  <TabsTrigger value="notas" className="text-xs shrink-0">{t.crmDetail.tabNotes}</TabsTrigger>
                  <TabsTrigger value="timeline" className="text-xs shrink-0">{t.crmDetail.tabTimeline}</TabsTrigger>
                  <TabsTrigger value="deals" className="text-xs shrink-0">{t.crmDetail.tabDeals} ({contactDeals.length})</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="basico" className="mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoField label={t.crmDetail.name} value={contact.name} />
                  <InfoField label={t.crmDetail.email} value={contact.email} />
                  <InfoField label={t.crmDetail.phone} value={contact.phone} />
                  <InfoField label={t.crmDetail.secondaryEmail} value={displayCf.secondary_email} />
                  <InfoField label={t.crmDetail.secondaryPhone} value={displayCf.secondary_phone} />
                  <InfoField label={t.crmDetail.birthDate} value={displayCf.birth_date} />
                  <InfoField label={t.crmDetail.gender} value={displayCf.gender} />
                  <InfoField label={t.crmDetail.position} value={contact.position} />
                  <InfoField label={t.crmDetail.department} value={displayCf.department} />
                  <InfoField label={t.crmDetail.cpf} value={contact.cpf} />
                  <InfoField label={t.crmDetail.origin} value={ORIGIN_LABELS[contact.origin] || contact.origin} />
                  <InfoField label={t.crmDetail.status} value={STATUS_LABELS[contact.status] || contact.status} />
                  <InfoField label={t.crmDetail.temperature} value={TEMP_LABELS[computeTemperature(contact.created_at, contact.last_interaction_at, cadence)] || t.crmDetail.tempCold} />
                  <InfoField label={t.crmDetail.priority} value={displayCf.priority} />
                  <InfoField label={t.crmDetail.category} value={displayCf.category} />
                </div>
              </TabsContent>

              <TabsContent value="endereco" className="mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoField label={t.crmDetail.address} value={displayCf.address?.street} />
                  <InfoField label={t.crmDetail.number} value={displayCf.address?.number} />
                  <InfoField label={t.crmDetail.complement} value={displayCf.address?.complement} />
                  <InfoField label={t.crmDetail.neighborhood} value={displayCf.address?.neighborhood} />
                  <InfoField label={t.crmDetail.city} value={displayCf.address?.city} />
                  <InfoField label={t.crmDetail.state} value={displayCf.address?.state} />
                  <InfoField label={t.crmDetail.zipCode} value={displayCf.address?.zip} />
                  <InfoField label={t.crmDetail.country} value={displayCf.address?.country} />
                  <InfoField label={t.crmDetail.timezone} value={displayCf.address?.timezone} />
                </div>
              </TabsContent>

              <TabsContent value="social" className="mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoField label={t.crmDetail.instagramProfileUrl} value={displayCf.social?.instagram_url} />
                  <InfoField label={t.crmDetail.instagramHandle} value={displayCf.social?.instagram_handle} />
                  <InfoField label={t.crmDetail.instagramUserId} value={displayCf.social?.instagram_user_id} />
                  <InfoField label={t.crmDetail.instagramFollowers} value={displayCf.social?.instagram_followers} />
                  <InfoField label={t.crmDetail.instagramEngagement} value={displayCf.social?.instagram_engagement} />
                  <InfoField label={t.crmDetail.facebook} value={displayCf.social?.facebook} />
                  <InfoField label={t.crmDetail.linkedin} value={displayCf.social?.linkedin} />
                  <InfoField label={t.crmDetail.twitter} value={displayCf.social?.twitter} />
                  <InfoField label={t.crmDetail.preferredContact} value={displayCf.social?.preferred_contact} />
                  <InfoField label={t.crmDetail.language} value={displayCf.social?.language} />
                </div>
              </TabsContent>

              <TabsContent value="tracking" className="mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoField label={t.crmDetail.utmSource} value={displayCf.tracking?.utm_source} />
                  <InfoField label={t.crmDetail.utmMedium} value={displayCf.tracking?.utm_medium} />
                  <InfoField label={t.crmDetail.utmCampaign} value={displayCf.tracking?.utm_campaign} />
                  <InfoField label={t.crmDetail.utmTerm} value={displayCf.tracking?.utm_term} />
                  <InfoField label={t.crmDetail.utmContent} value={displayCf.tracking?.utm_content} />
                </div>
              </TabsContent>

              <TabsContent value="scoring" className="mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoField label={t.crmDetail.leadScore} value={`${contact.score} / 100`} />
                  <InfoField label={t.crmDetail.engagementLevel} value={displayCf.scoring?.engagement_level} />
                  <InfoField label={t.crmDetail.ltv} value={displayCf.scoring?.ltv != null ? formatCurrency(Number(displayCf.scoring.ltv), language) : undefined} />
                  <InfoField label={t.crmDetail.totalOrders} value={displayCf.scoring?.total_orders?.toString()} />
                  <InfoField label={t.crmDetail.avgTicket} value={displayCf.scoring?.avg_ticket != null ? formatCurrency(Number(displayCf.scoring.avg_ticket), language) : undefined} />
                  <InfoField label={t.crmDetail.creditLimit} value={displayCf.scoring?.credit_limit != null ? formatCurrency(Number(displayCf.scoring.credit_limit), language) : undefined} />
                </div>
              </TabsContent>

              <TabsContent value="notas" className="mt-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t.crmDetail.notes}</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{displayCf.notes || t.crmDetail.noNotes}</p>
                </div>
              </TabsContent>

              <TabsContent value="timeline" className="mt-4">
                <CRMTimeline contactId={id} companyId={currentCompany!.id} />
              </TabsContent>

              <TabsContent value="deals" className="mt-4">
                {contactDeals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <DollarSign className="w-10 h-10 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground mb-4">{t.crmDetail.noDealsLinked}</p>
                    <Button onClick={() => setLinkDealOpen(true)} size="sm" className="gap-1.5 bg-[#4084F2] text-white hover:bg-[#3070D9]">
                      <Link2 className="w-3.5 h-3.5" /> {t.crmDetail.linkDeal}
                    </Button>
                  </div>
                ) : (() => {
                  const dateFmt = (d: string) => new Date(d).toLocaleDateString(language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'pt-BR');
                  const dealsWithProb = contactDeals.map(d => {
                    const pipe = pipelinesMap[d.pipeline_id];
                    const stage = pipe?.stages.find(s => s.name === d.stage_name);
                    const probability = stage?.probability ?? 0;
                    const isWon = probability === 100;
                    const isLost = probability === 0 && (d.stage_name?.toLowerCase().includes('lost') || d.stage_name?.toLowerCase().includes('perd'));
                    const isOpen = !isWon && !isLost;
                    return { ...d, probability, pipelineName: pipe?.name ?? '', isWon, isLost, isOpen };
                  });
                  const openDeals = dealsWithProb.filter(d => d.isOpen);
                  const totalOpen = openDeals.reduce((sum, d) => sum + Number(d.value), 0);
                  const totalExpected = openDeals.reduce((sum, d) => sum + Number(d.value) * (d.probability / 100), 0);
                  const avgProb = openDeals.length ? openDeals.reduce((s, d) => s + d.probability, 0) / openDeals.length : 0;
                  const nextDue = openDeals
                    .filter(d => d.expected_close_date)
                    .sort((a, b) => (a.expected_close_date! < b.expected_close_date! ? -1 : 1))[0];

                  return (
                    <div className="space-y-4">
                      <div className="flex justify-end">
                        <Button onClick={() => setLinkDealOpen(true)} size="sm" className="gap-1.5 bg-[#4084F2] text-white hover:bg-[#3070D9]">
                          <Link2 className="w-3.5 h-3.5" /> {t.crmDetail.linkDeal}
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {dealsWithProb.map(deal => {
                          const stageColor = deal.isWon
                            ? 'bg-green-100 text-green-800 border-green-300'
                            : deal.isLost
                            ? 'bg-red-100 text-red-800 border-red-300'
                            : deal.probability >= 60
                            ? 'bg-orange-100 text-orange-800 border-orange-300'
                            : 'bg-blue-100 text-blue-800 border-blue-300';
                          return (
                            <Card key={deal.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/crm/pipeline')}>
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-semibold truncate">{deal.title}</h4>
                                    {deal.pipelineName && <p className="text-xs text-muted-foreground mt-0.5">{deal.pipelineName}</p>}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1.5 mt-3 text-xs">
                                      <div>
                                        <span className="text-muted-foreground">{t.crm.valueLabel}: </span>
                                        <span className="font-semibold text-foreground">{formatCurrency(Number(deal.value), language)}</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">{t.crm.stage}: </span>
                                        <Badge variant="outline" className={`text-[10px] py-0 px-1.5 ${stageColor}`}>{deal.stage_name}</Badge>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">{t.crmDetail.created}: </span>
                                        <span className="text-foreground">{dateFmt(deal.created_at)}</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">{t.crmDetail.winProbability}: </span>
                                        <span className="font-semibold text-foreground">{deal.probability}%</span>
                                      </div>
                                    </div>
                                    {deal.expected_close_date && (
                                      <p className="text-xs text-muted-foreground mt-1.5">
                                        {t.crm.expectedCloseDate}: {dateFmt(deal.expected_close_date)}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>

                      {openDeals.length > 0 && (
                        <Card className="bg-muted/30">
                          <CardContent className="p-4">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">📊 {t.crmDetail.dealsSummary}</p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground">{t.crmDetail.totalOpen}</p>
                                <p className="font-bold text-foreground">{formatCurrency(totalOpen, language)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">{t.crmDetail.totalExpected}</p>
                                <p className="font-bold text-foreground">{formatCurrency(totalExpected, language)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">{t.crmDetail.avgProbability}</p>
                                <p className="font-bold text-foreground">{avgProb.toFixed(1)}%</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">{t.crmDetail.nextDueDate}</p>
                                <p className="font-bold text-foreground">{nextDue?.expected_close_date ? dateFmt(nextDue.expected_close_date) : '—'}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  );
                })()}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.crmDetail.editProfileTitle}</DialogTitle>
          </DialogHeader>

          <Tabs value={editTab} onValueChange={setEditTab}>
            <TabsList className="w-full flex flex-wrap h-auto gap-1">
              <TabsTrigger value="basico" className="text-xs">{t.crmDetail.tabBasic}</TabsTrigger>
              <TabsTrigger value="endereco" className="text-xs">{t.crmDetail.tabAddress}</TabsTrigger>
              <TabsTrigger value="social" className="text-xs">{t.crmDetail.tabSocial}</TabsTrigger>
              <TabsTrigger value="tracking" className="text-xs">{t.crmDetail.tabTracking}</TabsTrigger>
              <TabsTrigger value="scoring" className="text-xs">{t.crmDetail.tabScoring}</TabsTrigger>
              <TabsTrigger value="notas" className="text-xs">{t.crmDetail.tabNotes}</TabsTrigger>
            </TabsList>

            <TabsContent value="basico" className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label>{t.crmDetail.name}</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.email}</Label>
                  <Input value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.phone}</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.secondaryEmail}</Label>
                  <Input value={cf.secondary_email || ''} onChange={e => updateCf('secondary_email', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.secondaryPhone}</Label>
                  <Input value={cf.secondary_phone || ''} onChange={e => updateCf('secondary_phone', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.birthDate}</Label>
                  <Input type="date" value={cf.birth_date || ''} onChange={e => updateCf('birth_date', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.gender}</Label>
                  <Select value={cf.gender || ''} onValueChange={v => updateCf('gender', v)}>
                    <SelectTrigger><SelectValue placeholder={t.common.select || 'Select'} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculino">{t.crmDetail.genderMale}</SelectItem>
                      <SelectItem value="feminino">{t.crmDetail.genderFemale}</SelectItem>
                      <SelectItem value="outro">{t.crmDetail.genderOther}</SelectItem>
                      <SelectItem value="nao_informado">{t.crmDetail.genderNotInformed}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.position}</Label>
                  <Input value={position} onChange={e => setPosition(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.department}</Label>
                  <Input value={cf.department || ''} onChange={e => updateCf('department', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.cpf}</Label>
                  <Input value={cpf} onChange={e => setCpf(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.origin}</Label>
                  <Select value={origin} onValueChange={setOrigin}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ORIGIN_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.status}</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lead">{t.crmDetail.statusLead}</SelectItem>
                      <SelectItem value="client">{t.crmDetail.statusClient}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.temperature}</Label>
                  <Select value={temperature} onValueChange={setTemperature}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cold">{t.crmDetail.tempCold}</SelectItem>
                      <SelectItem value="warm">{t.crmDetail.tempWarm}</SelectItem>
                      <SelectItem value="hot">{t.crmDetail.tempHot}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.priority}</Label>
                  <Select value={cf.priority || 'media'} onValueChange={v => updateCf('priority', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">{t.crmDetail.priorityLow}</SelectItem>
                      <SelectItem value="media">{t.crmDetail.priorityMedium}</SelectItem>
                      <SelectItem value="alta">{t.crmDetail.priorityHigh}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.category}</Label>
                  <Input value={cf.category || ''} onChange={e => updateCf('category', e.target.value)} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>{t.crmDetail.tagsSeparated}</Label>
                  <Input value={tags} onChange={e => setTags(e.target.value)} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="endereco" className="mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label>{t.crmDetail.address}</Label>
                  <Input value={cf.address?.street || ''} onChange={e => updateCf('address.street', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.number}</Label>
                  <Input value={cf.address?.number || ''} onChange={e => updateCf('address.number', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.complement}</Label>
                  <Input value={cf.address?.complement || ''} onChange={e => updateCf('address.complement', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.neighborhood}</Label>
                  <Input value={cf.address?.neighborhood || ''} onChange={e => updateCf('address.neighborhood', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.city}</Label>
                  <Input value={cf.address?.city || ''} onChange={e => updateCf('address.city', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.state}</Label>
                  <Input value={cf.address?.state || ''} onChange={e => updateCf('address.state', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.zipCode}</Label>
                  <Input value={cf.address?.zip || ''} onChange={e => updateCf('address.zip', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.country}</Label>
                  <Input value={cf.address?.country || ''} onChange={e => updateCf('address.country', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.timezone}</Label>
                  <Input value={cf.address?.timezone || ''} onChange={e => updateCf('address.timezone', e.target.value)} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="social" className="mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label>{t.crmDetail.instagramProfileUrl}</Label>
                  <Input value={cf.social?.instagram_url || ''} onChange={e => updateCf('social.instagram_url', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Instagram Handle</Label>
                  <Input value={cf.social?.instagram_handle || ''} onChange={e => updateCf('social.instagram_handle', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Instagram User ID</Label>
                  <Input value={cf.social?.instagram_user_id || ''} onChange={e => updateCf('social.instagram_user_id', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Instagram Followers</Label>
                  <Input value={cf.social?.instagram_followers || ''} onChange={e => updateCf('social.instagram_followers', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Instagram Engagement</Label>
                  <Input value={cf.social?.instagram_engagement || ''} onChange={e => updateCf('social.instagram_engagement', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Facebook</Label>
                  <Input value={cf.social?.facebook || ''} onChange={e => updateCf('social.facebook', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>LinkedIn</Label>
                  <Input value={cf.social?.linkedin || ''} onChange={e => updateCf('social.linkedin', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Twitter / X</Label>
                  <Input value={cf.social?.twitter || ''} onChange={e => updateCf('social.twitter', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.preferredContact}</Label>
                  <Select value={cf.social?.preferred_contact || ''} onValueChange={v => updateCf('social.preferred_contact', v)}>
                    <SelectTrigger><SelectValue placeholder={t.common.select || 'Select'} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">E-mail</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="telefone">{t.crmDetail.phone}</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.language}</Label>
                  <Input value={cf.social?.language || ''} onChange={e => updateCf('social.language', e.target.value)} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tracking" className="mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>UTM Source</Label>
                  <Input value={cf.tracking?.utm_source || ''} onChange={e => updateCf('tracking.utm_source', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>UTM Medium</Label>
                  <Input value={cf.tracking?.utm_medium || ''} onChange={e => updateCf('tracking.utm_medium', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>UTM Campaign</Label>
                  <Input value={cf.tracking?.utm_campaign || ''} onChange={e => updateCf('tracking.utm_campaign', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>UTM Term</Label>
                  <Input value={cf.tracking?.utm_term || ''} onChange={e => updateCf('tracking.utm_term', e.target.value)} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>UTM Content</Label>
                  <Input value={cf.tracking?.utm_content || ''} onChange={e => updateCf('tracking.utm_content', e.target.value)} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="scoring" className="mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.engagementLevel}</Label>
                  <Select value={cf.scoring?.engagement_level || 'baixo'} onValueChange={v => updateCf('scoring.engagement_level', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixo">{t.crmDetail.engagementLow}</SelectItem>
                      <SelectItem value="medio">{t.crmDetail.engagementMedium}</SelectItem>
                      <SelectItem value="alto">{t.crmDetail.engagementHigh}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.ltv}</Label>
                  <Input type="number" value={cf.scoring?.ltv ?? 0} onChange={e => updateCf('scoring.ltv', Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.totalOrders}</Label>
                  <Input type="number" value={cf.scoring?.total_orders ?? 0} onChange={e => updateCf('scoring.total_orders', Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.avgTicket}</Label>
                  <Input type="number" value={cf.scoring?.avg_ticket ?? 0} onChange={e => updateCf('scoring.avg_ticket', Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.creditLimit}</Label>
                  <Input type="number" value={cf.scoring?.credit_limit ?? ''} onChange={e => updateCf('scoring.credit_limit', e.target.value ? Number(e.target.value) : null)} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notas" className="mt-4">
              <div className="space-y-1.5">
                <Label>{t.crmDetail.notes}</Label>
                <Textarea rows={8} value={cf.notes || ''} onChange={e => updateCf('notes', e.target.value)} placeholder={t.crmDetail.writeNotes} />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end mt-4">
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {t.common.save}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <LinkDealDialog
        open={linkDealOpen}
        onOpenChange={setLinkDealOpen}
        contactId={id}
        defaultTitle={contact.name}
        companyId={currentCompany!.id}
      />
    </div>
  );
}
