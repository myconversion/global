import { useState, useEffect, useMemo } from 'react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Save, Loader2, Phone, Mail, Globe, Pencil, Tag, Link2 } from 'lucide-react';
import { LinkDealDialog } from '@/components/crm/LinkDealDialog';
import { CRMTimeline } from '@/components/crm/CRMTimeline';
import { computeTemperature, CadenceSettings, DEFAULT_CADENCE } from '@/components/crm/crm-temperature';
import { formatCurrency } from '@/lib/format-utils';

interface CompanyCustomFields {
  secondary_email?: string;
  secondary_phone?: string;
  origin?: string;
  priority?: string;
  category?: string;
  address?: {
    street?: string; number?: string; complement?: string; neighborhood?: string;
    city?: string; state?: string; zip?: string; country?: string; timezone?: string;
  };
  social?: {
    instagram?: string; instagram_handle?: string; instagram_business_id?: string;
    instagram_followers?: number; instagram_posts?: number;
    instagram_engagement?: number; instagram_category?: string;
    facebook?: string; linkedin?: string; twitter?: string; youtube?: string;
    preferred_contact?: string; language?: string;
  };
  business?: {
    num_employees?: number; annual_revenue?: number; founded_year?: number;
    legal_form?: string; engagement_level?: string;
  };
  tracking?: {
    utm_source?: string; utm_medium?: string; utm_campaign?: string;
    utm_term?: string; utm_content?: string;
  };
  financial?: {
    ltv?: number; total_orders?: number; avg_ticket?: number;
    credit_limit?: number; payment_terms?: string;
  };
  notes?: string;
}

const defaultCf: CompanyCustomFields = {
  secondary_email: '', secondary_phone: '', origin: 'other', priority: 'media', category: '',
  address: { street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zip: '', country: 'BR', timezone: 'America/Sao_Paulo' },
  social: { instagram: '', instagram_handle: '', instagram_business_id: '', instagram_followers: 0, instagram_posts: 0, instagram_engagement: 0, instagram_category: '', facebook: '', linkedin: '', twitter: '', youtube: '', preferred_contact: '', language: 'Português (BR)' },
  business: { num_employees: 0, annual_revenue: 0, founded_year: 2020, legal_form: '', engagement_level: 'baixo' },
  tracking: { utm_source: '', utm_medium: '', utm_campaign: '', utm_term: '', utm_content: '' },
  financial: { ltv: 0, total_orders: 0, avg_ticket: 0, credit_limit: 0, payment_terms: '' },
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

function mergeCf(raw: any): CompanyCustomFields {
  return {
    ...defaultCf, ...raw,
    address: { ...defaultCf.address, ...(raw?.address || {}) },
    social: { ...defaultCf.social, ...(raw?.social || {}) },
    business: { ...defaultCf.business, ...(raw?.business || {}) },
    tracking: { ...defaultCf.tracking, ...(raw?.tracking || {}) },
    financial: { ...defaultCf.financial, ...(raw?.financial || {}) },
  };
}

export default function CRMCompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentCompany } = useAuth();
  const { toast } = useToast();
  const { t, language } = useI18n();

  const TEMP_LABELS: Record<string, string> = { cold: t.crmDetail.tempCold, warm: t.crmDetail.tempWarm, hot: t.crmDetail.tempHot };
  const TEMP_COLORS: Record<string, string> = { cold: 'bg-blue-100 text-blue-800', warm: 'bg-yellow-100 text-yellow-800', hot: 'bg-red-100 text-red-800' };
  const STATUS_LABELS: Record<string, string> = { lead: t.crmDetail.statusLead, client: t.crmDetail.statusClient };
  const SIZE_LABELS: Record<string, string> = { mei: t.crmDetail.sizeMei, small: t.crmDetail.sizeSmall, medium: t.crmDetail.sizeMedium, large: t.crmDetail.sizeLarge };
  const ORIGIN_LABELS: Record<string, string> = {
    indicacao: t.crmDetail.originIndicacao, inbound: t.crmDetail.originInbound, outbound: t.crmDetail.originOutbound,
    social_media: t.crmDetail.originSocialMedia, evento: t.crmDetail.originEvento, other: t.crmDetail.originOther,
    facebook: t.crmDetail.originFacebook, instagram: t.crmDetail.originInstagram, site: t.crmDetail.originSite,
    prospeccao_ativa: t.crmDetail.originProspeccaoAtiva, midia_offline: t.crmDetail.originMidiaOffline,
    indicacao_gestor: t.crmDetail.originIndicacaoGestor, parcerias: t.crmDetail.originParcerias, indicacao_cliente: t.crmDetail.originIndicacaoCliente,
  };

  const [company, setCompany] = useState<any>(null);
  const [customFieldDefs, setCustomFieldDefs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [linkDealOpen, setLinkDealOpen] = useState(false);
  const [editTab, setEditTab] = useState('basico');
  const [cadence, setCadence] = useState<CadenceSettings>(DEFAULT_CADENCE);

  const [razaoSocial, setRazaoSocial] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [segment, setSegment] = useState('');
  const [size, setSize] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [temperature, setTemperature] = useState('cold');
  const [status, setStatus] = useState('lead');
  const [tags, setTags] = useState('');
  const [cf, setCf] = useState<CompanyCustomFields>(defaultCf);

  useEffect(() => {
    if (!id || !currentCompany) return;
    const fetchData = async () => {
      setLoading(true);
      const [{ data: c }, { data: defs }, { data: cadenceData }] = await Promise.all([
        supabase.from('crm_companies').select('*').eq('id', id).single(),
        supabase.from('custom_field_definitions').select('*').eq('company_id', currentCompany.id).eq('entity_type', 'crm_company').order('sort_order'),
        supabase.from('crm_cadence_settings').select('*').eq('company_id', currentCompany.id).maybeSingle(),
      ]);
      if (cadenceData) setCadence({ warm_after_days: cadenceData.warm_after_days, cold_after_days: cadenceData.cold_after_days });
      if (c) {
        setCompany(c);
        setRazaoSocial(c.razao_social); setNomeFantasia(c.nome_fantasia ?? '');
        setCnpj(c.cnpj ?? ''); setSegment(c.segment ?? ''); setSize(c.size ?? '');
        setEmail(c.email ?? ''); setPhone(c.phone ?? ''); setWebsite(c.website ?? '');
        setTemperature(c.temperature ?? 'cold'); setStatus(c.status ?? 'lead');
        setTags((c.tags ?? []).join(', '));
        setCf(mergeCf(c.custom_fields));
      }
      if (defs) setCustomFieldDefs(defs);
      setLoading(false);
    };
    fetchData();
  }, [id, currentCompany]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    const { error } = await supabase.from('crm_companies').update({
      razao_social: razaoSocial, nome_fantasia: nomeFantasia || null,
      cnpj: cnpj || null, segment: segment || null,
      size: size ? size as any : null, email: email || null,
      phone: phone || null, website: website || null,
      temperature: temperature as any, status: status as any,
      tags: tags ? tags.split(',').map(tg => tg.trim()).filter(Boolean) : [],
      custom_fields: cf as any,
    }).eq('id', id);
    setSaving(false);
    if (error) toast({ title: t.crmDetail.errorSaving, variant: 'destructive' });
    else {
      toast({ title: t.crmDetail.companyUpdated });
      setEditOpen(false);
      const { data: c } = await supabase.from('crm_companies').select('*').eq('id', id).single();
      if (c) setCompany(c);
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
  if (!company) return <p className="text-center py-20 text-muted-foreground">{t.crmDetail.companyNotFound}</p>;

  const d = mergeCf(company.custom_fields);
  const displayName = company.nome_fantasia || company.razao_social;

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/crm/companies')} className="gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" /> {t.crmDetail.back}
        </Button>
        <div className="flex items-center gap-2">
          <Button onClick={() => setLinkDealOpen(true)} size="sm" className="gap-1.5 bg-[#4084F2] text-white hover:bg-[#3070D9]">
            <Link2 className="w-3.5 h-3.5" /> {t.crmDetail.linkDeal}
          </Button>
          <Button onClick={() => setEditOpen(true)} variant="outline" size="sm" className="gap-1.5">
            <Pencil className="w-3.5 h-3.5" /> {t.crmDetail.editCompany}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
        <Card>
          <CardContent className="pt-6 space-y-5">
            <div className="flex flex-col items-center text-center gap-3">
              <Avatar className="w-20 h-20">
                <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-lg font-bold text-foreground">{displayName}</h2>
                {company.nome_fantasia && (
                  <p className="text-xs text-muted-foreground">{company.razao_social}</p>
                )}
                <div className="flex gap-1.5 mt-1 justify-center flex-wrap">
                  <Badge variant="secondary">{STATUS_LABELS[company.status] || company.status}</Badge>
                  {(() => {
                    const dynTemp = computeTemperature(company.created_at, company.last_interaction_at, cadence);
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
              {company.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-foreground">{company.phone}</span>
                </div>
              )}
              {company.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-foreground break-all">{company.email}</span>
                </div>
              )}
              {company.website && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-foreground break-all">{company.website}</span>
                </div>
              )}
            </div>

            <div className="border-t pt-4 space-y-3">
              <InfoField label={t.crmDetail.cnpj} value={company.cnpj} />
              <InfoField label={t.crmDetail.segment} value={company.segment} />
              <InfoField label={t.crmDetail.size} value={SIZE_LABELS[company.size] || company.size} />
              <InfoField label={t.crmDetail.leadScore} value={`${company.score} / 100`} />
              {(company.tags ?? []).length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t.crmDetail.tags}</p>
                  <div className="flex flex-wrap gap-1">
                    {(company.tags as string[]).map((tg: string) => (
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
                  <TabsTrigger value="negocio" className="text-xs shrink-0">{t.crmDetail.tabBusiness}</TabsTrigger>
                  <TabsTrigger value="tracking" className="text-xs shrink-0">{t.crmDetail.tabTracking}</TabsTrigger>
                  <TabsTrigger value="financeiro" className="text-xs shrink-0">{t.crmDetail.tabFinancial}</TabsTrigger>
                  <TabsTrigger value="personalizados" className="text-xs shrink-0">{t.crmDetail.tabCustomFields}</TabsTrigger>
                  <TabsTrigger value="notas" className="text-xs shrink-0">{t.crmDetail.tabNotes}</TabsTrigger>
                  <TabsTrigger value="timeline" className="text-xs shrink-0">{t.crmDetail.tabTimeline}</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="basico" className="mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoField label={t.crmDetail.razaoSocial} value={company.razao_social} />
                  <InfoField label={t.crmDetail.nomeFantasia} value={company.nome_fantasia} />
                  <InfoField label={t.crmDetail.cnpj} value={company.cnpj} />
                  <InfoField label={t.crmDetail.email} value={company.email} />
                  <InfoField label={t.crmDetail.phone} value={company.phone} />
                  <InfoField label={t.crmDetail.secondaryEmail} value={d.secondary_email} />
                  <InfoField label={t.crmDetail.secondaryPhone} value={d.secondary_phone} />
                  <InfoField label={t.crmDetail.website} value={company.website} />
                  <InfoField label={t.crmDetail.origin} value={ORIGIN_LABELS[d.origin || ''] || d.origin} />
                  <InfoField label={t.crmDetail.status} value={STATUS_LABELS[company.status] || company.status} />
                  <InfoField label={t.crmDetail.priority} value={d.priority} />
                  <InfoField label={t.crmDetail.category} value={d.category} />
                </div>
              </TabsContent>

              <TabsContent value="endereco" className="mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoField label={t.crmDetail.address} value={d.address?.street} />
                  <InfoField label={t.crmDetail.number} value={d.address?.number} />
                  <InfoField label={t.crmDetail.complement} value={d.address?.complement} />
                  <InfoField label={t.crmDetail.neighborhood} value={d.address?.neighborhood} />
                  <InfoField label={t.crmDetail.city} value={d.address?.city} />
                  <InfoField label={t.crmDetail.stateUF} value={d.address?.state} />
                  <InfoField label={t.crmDetail.zipCode} value={d.address?.zip} />
                  <InfoField label={t.crmDetail.country} value={d.address?.country} />
                  <InfoField label={t.crmDetail.timezone} value={d.address?.timezone} />
                </div>
              </TabsContent>

              <TabsContent value="social" className="mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoField label="Instagram" value={d.social?.instagram} />
                  <InfoField label="Instagram Handle" value={d.social?.instagram_handle} />
                  <InfoField label="Instagram Business ID" value={d.social?.instagram_business_id} />
                  <InfoField label={t.crmDetail.followers} value={d.social?.instagram_followers?.toString()} />
                  <InfoField label={t.crmDetail.posts} value={d.social?.instagram_posts?.toString()} />
                  <InfoField label={t.crmDetail.engagementRate} value={d.social?.instagram_engagement?.toString()} />
                  <InfoField label={t.crmDetail.instagramCategory} value={d.social?.instagram_category} />
                  <InfoField label="Facebook" value={d.social?.facebook} />
                  <InfoField label="LinkedIn" value={d.social?.linkedin} />
                  <InfoField label="Twitter/X" value={d.social?.twitter} />
                  <InfoField label="YouTube" value={d.social?.youtube} />
                  <InfoField label={t.crmDetail.preferredContact} value={d.social?.preferred_contact} />
                  <InfoField label={t.crmDetail.language} value={d.social?.language} />
                </div>
              </TabsContent>

              <TabsContent value="negocio" className="mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoField label={t.crmDetail.segment} value={company.segment} />
                  <InfoField label={t.crmDetail.numEmployees} value={d.business?.num_employees?.toString()} />
                  <InfoField label={t.crmDetail.annualRevenue} value={d.business?.annual_revenue != null ? formatCurrency(Number(d.business.annual_revenue), language) : undefined} />
                  <InfoField label={t.crmDetail.foundedYear} value={d.business?.founded_year?.toString()} />
                  <InfoField label={t.crmDetail.legalForm} value={d.business?.legal_form} />
                  <InfoField label={`${t.crmDetail.leadScore} (0-100)`} value={`${company.score}`} />
                  <InfoField label={t.crmDetail.engagementLevel} value={d.business?.engagement_level} />
                </div>
              </TabsContent>

              <TabsContent value="tracking" className="mt-4">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.crmDetail.utmParams}</p>
                    <p className="text-xs text-muted-foreground">{t.crmDetail.utmParamsDesc}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoField label="UTM Source" value={d.tracking?.utm_source} />
                    <InfoField label="UTM Medium" value={d.tracking?.utm_medium} />
                    <InfoField label="UTM Campaign" value={d.tracking?.utm_campaign} />
                    <InfoField label="UTM Term" value={d.tracking?.utm_term} />
                    <InfoField label="UTM Content" value={d.tracking?.utm_content} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="financeiro" className="mt-4">
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-foreground">{t.crmDetail.financialMetrics}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoField label={t.crmDetail.ltv} value={d.financial?.ltv != null ? formatCurrency(Number(d.financial.ltv), language) : undefined} />
                    <InfoField label={t.crmDetail.totalOrders} value={d.financial?.total_orders?.toString()} />
                    <InfoField label={t.crmDetail.avgTicket} value={d.financial?.avg_ticket != null ? formatCurrency(Number(d.financial.avg_ticket), language) : undefined} />
                    <InfoField label={t.crmDetail.creditLimit} value={d.financial?.credit_limit != null ? formatCurrency(Number(d.financial.credit_limit), language) : undefined} />
                    <InfoField label={t.crmDetail.paymentTerms} value={d.financial?.payment_terms} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="personalizados" className="mt-4">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.crmDetail.customFieldsTitle}</p>
                    <p className="text-xs text-muted-foreground">{t.crmDetail.customFieldsDesc}</p>
                  </div>
                  {customFieldDefs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed rounded-lg">
                      <Tag className="w-10 h-10 text-muted-foreground/40 mb-3" />
                      <p className="text-sm font-medium text-muted-foreground">{t.crmDetail.noCustomFields}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t.crmDetail.noCustomFieldsDesc}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {customFieldDefs.map(def => (
                        <InfoField key={def.id} label={def.field_label} value={(company.custom_fields as any)?.[def.field_name]} />
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="notas" className="mt-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t.crmDetail.observations}</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{d.notes || t.crmDetail.noObservations}</p>
                </div>
              </TabsContent>

              <TabsContent value="timeline" className="mt-4">
                <CRMTimeline crmCompanyId={id} companyId={currentCompany!.id} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.crmDetail.editCompanyTitle}</DialogTitle>
            <DialogDescription>{t.crmDetail.editCompanyDesc}</DialogDescription>
          </DialogHeader>

          <Tabs value={editTab} onValueChange={setEditTab}>
            <TabsList className="w-full flex flex-wrap h-auto gap-1">
              <TabsTrigger value="basico" className="text-xs">{t.crmDetail.tabBasicEdit}</TabsTrigger>
              <TabsTrigger value="endereco" className="text-xs">{t.crmDetail.tabAddressEdit}</TabsTrigger>
              <TabsTrigger value="social" className="text-xs">{t.crmDetail.tabSocialEdit}</TabsTrigger>
              <TabsTrigger value="negocio" className="text-xs">{t.crmDetail.tabBusinessEdit}</TabsTrigger>
              <TabsTrigger value="tracking" className="text-xs">{t.crmDetail.tabTrackingEdit}</TabsTrigger>
              <TabsTrigger value="financeiro" className="text-xs">{t.crmDetail.tabFinancialEdit}</TabsTrigger>
              <TabsTrigger value="personalizados" className="text-xs">{t.crmDetail.tabCustomFieldsEdit}</TabsTrigger>
              <TabsTrigger value="notas" className="text-xs">{t.crmDetail.tabNotesEdit}</TabsTrigger>
            </TabsList>

            <TabsContent value="basico" className="mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label>{t.crmDetail.companyName} *</Label>
                  <Input value={razaoSocial} onChange={e => setRazaoSocial(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.nomeFantasia}</Label>
                  <Input value={nomeFantasia} onChange={e => setNomeFantasia(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.cnpj}</Label>
                  <Input value={cnpj} onChange={e => setCnpj(e.target.value)} />
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
                <div className="space-y-1.5 col-span-2">
                  <Label>{t.crmDetail.website}</Label>
                  <Input value={website} onChange={e => setWebsite(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.origin}</Label>
                  <Select value={cf.origin || 'other'} onValueChange={v => updateCf('origin', v)}>
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
                  <Label>{t.crmDetail.stateUF}</Label>
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
                  <Select value={cf.address?.timezone || 'America/Sao_Paulo'} onValueChange={v => updateCf('address.timezone', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Sao_Paulo">São Paulo (BRT)</SelectItem>
                      <SelectItem value="America/Manaus">Manaus (AMT)</SelectItem>
                      <SelectItem value="America/Belem">Belém (BRT)</SelectItem>
                      <SelectItem value="America/Fortaleza">Fortaleza (BRT)</SelectItem>
                      <SelectItem value="America/Cuiaba">Cuiabá (AMT)</SelectItem>
                      <SelectItem value="America/Rio_Branco">Rio Branco (ACT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="social" className="mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label>Instagram</Label>
                  <Input value={cf.social?.instagram || ''} onChange={e => updateCf('social.instagram', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Instagram Handle</Label>
                  <Input value={cf.social?.instagram_handle || ''} onChange={e => updateCf('social.instagram_handle', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Instagram Business ID</Label>
                  <Input value={cf.social?.instagram_business_id || ''} onChange={e => updateCf('social.instagram_business_id', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.followers}</Label>
                  <Input type="number" value={cf.social?.instagram_followers ?? 0} onChange={e => updateCf('social.instagram_followers', Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.posts}</Label>
                  <Input type="number" value={cf.social?.instagram_posts ?? 0} onChange={e => updateCf('social.instagram_posts', Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.engagementRate}</Label>
                  <Input type="number" step="0.01" value={cf.social?.instagram_engagement ?? 0} onChange={e => updateCf('social.instagram_engagement', Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.instagramCategory}</Label>
                  <Input value={cf.social?.instagram_category || ''} onChange={e => updateCf('social.instagram_category', e.target.value)} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Facebook</Label>
                  <Input value={cf.social?.facebook || ''} onChange={e => updateCf('social.facebook', e.target.value)} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>LinkedIn</Label>
                  <Input value={cf.social?.linkedin || ''} onChange={e => updateCf('social.linkedin', e.target.value)} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Twitter/X</Label>
                  <Input value={cf.social?.twitter || ''} onChange={e => updateCf('social.twitter', e.target.value)} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>YouTube</Label>
                  <Input value={cf.social?.youtube || ''} onChange={e => updateCf('social.youtube', e.target.value)} />
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
                  <Select value={cf.social?.language || 'Português (BR)'} onValueChange={v => updateCf('social.language', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Português (BR)">Português (BR)</SelectItem>
                      <SelectItem value="Inglês">English</SelectItem>
                      <SelectItem value="Espanhol">Español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="negocio" className="mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.segment}</Label>
                  <Input value={segment} onChange={e => setSegment(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.numEmployees}</Label>
                  <Input type="number" value={cf.business?.num_employees ?? 0} onChange={e => updateCf('business.num_employees', Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.annualRevenue}</Label>
                  <Input type="number" step="0.01" value={cf.business?.annual_revenue ?? 0} onChange={e => updateCf('business.annual_revenue', Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.foundedYear}</Label>
                  <Input type="number" value={cf.business?.founded_year ?? 2020} onChange={e => updateCf('business.founded_year', Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.legalForm}</Label>
                  <Input value={cf.business?.legal_form || ''} onChange={e => updateCf('business.legal_form', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.leadScore} (0-100)</Label>
                  <Input type="number" value={company.score} disabled className="bg-muted" />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.crmDetail.engagementLevel}</Label>
                  <Select value={cf.business?.engagement_level || 'baixo'} onValueChange={v => updateCf('business.engagement_level', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixo">{t.crmDetail.engagementLow}</SelectItem>
                      <SelectItem value="medio">{t.crmDetail.engagementMedium}</SelectItem>
                      <SelectItem value="alto">{t.crmDetail.engagementHigh}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tracking" className="mt-4">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.crmDetail.utmParams}</p>
                  <p className="text-xs text-muted-foreground">{t.crmDetail.utmParamsDesc}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>UTM Source</Label>
                    <Input value={cf.tracking?.utm_source || ''} onChange={e => updateCf('tracking.utm_source', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>UTM Medium</Label>
                    <Input value={cf.tracking?.utm_medium || ''} onChange={e => updateCf('tracking.utm_medium', e.target.value)} />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label>UTM Campaign</Label>
                    <Input value={cf.tracking?.utm_campaign || ''} onChange={e => updateCf('tracking.utm_campaign', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>UTM Term</Label>
                    <Input value={cf.tracking?.utm_term || ''} onChange={e => updateCf('tracking.utm_term', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>UTM Content</Label>
                    <Input value={cf.tracking?.utm_content || ''} onChange={e => updateCf('tracking.utm_content', e.target.value)} />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="financeiro" className="mt-4">
              <div className="space-y-4">
                <p className="text-sm font-semibold text-foreground">{t.crmDetail.financialMetrics}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{t.crmDetail.ltv}</Label>
                    <Input type="number" step="0.01" value={cf.financial?.ltv ?? 0} onChange={e => updateCf('financial.ltv', Number(e.target.value))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t.crmDetail.totalOrders}</Label>
                    <Input type="number" value={cf.financial?.total_orders ?? 0} onChange={e => updateCf('financial.total_orders', Number(e.target.value))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t.crmDetail.avgTicket}</Label>
                    <Input type="number" step="0.01" value={cf.financial?.avg_ticket ?? 0} onChange={e => updateCf('financial.avg_ticket', Number(e.target.value))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t.crmDetail.creditLimit}</Label>
                    <Input type="number" step="0.01" value={cf.financial?.credit_limit ?? 0} onChange={e => updateCf('financial.credit_limit', Number(e.target.value))} />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label>{t.crmDetail.paymentTerms}</Label>
                    <Input value={cf.financial?.payment_terms || ''} onChange={e => updateCf('financial.payment_terms', e.target.value)} />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="personalizados" className="mt-4">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.crmDetail.customFieldsTitle}</p>
                  <p className="text-xs text-muted-foreground">{t.crmDetail.customFieldsDesc}</p>
                </div>
                {customFieldDefs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed rounded-lg">
                    <Tag className="w-10 h-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">{t.crmDetail.noCustomFields}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t.crmDetail.noCustomFieldsDesc}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {customFieldDefs.map(def => (
                      <div key={def.id} className="space-y-1.5">
                        <Label>{def.field_label}</Label>
                        <Input
                          value={(cf as any)[def.field_name] || ''}
                          onChange={e => updateCf(def.field_name, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="notas" className="mt-4">
              <div className="space-y-1.5">
                <Label>{t.crmDetail.observations}</Label>
                <Textarea rows={8} value={cf.notes || ''} onChange={e => updateCf('notes', e.target.value)} />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setEditOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 gap-1.5">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {t.common.save}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <LinkDealDialog
        open={linkDealOpen}
        onOpenChange={setLinkDealOpen}
        crmCompanyId={id}
        defaultTitle={company.nome_fantasia || company.razao_social}
        companyId={currentCompany!.id}
      />
    </div>
  );
}
