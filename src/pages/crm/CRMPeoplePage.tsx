import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { getDateLocale } from '@/i18n/date-locale';
import { withBuFilter } from '@/lib/bu-filter';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, Plus, Search, X, Download, Upload, FileSpreadsheet, SlidersHorizontal, ChevronDown, LayoutGrid, List, UserPlus, UserCheck, TrendingUp, TrendingDown, Minus, DollarSign, Crown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { exportToCSV } from '@/lib/export-utils';
import { computeTemperature, CadenceSettings, DEFAULT_CADENCE } from '@/components/crm/crm-temperature';
import { cn } from '@/lib/utils';
import { KPICard } from '@/components/shared/KPICard';
import { ContactCard } from '@/components/crm/CRMCardGrid';
import { BulkActionBar } from '@/components/crm/BulkActionBar';
import { ImportContactsDialog } from '@/components/crm/ImportContactsDialog';
import { formatCurrency } from '@/lib/format-utils';

const TEMP_COLORS: Record<string, string> = {
  cold: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  warm: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  hot: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

interface CRMContact {
  id: string;
  name: string;
  cpf: string | null;
  email: string | null;
  phone: string | null;
  position: string | null;
  origin: string;
  temperature: string;
  status: string;
  score: number;
  responsible_id: string | null;
  tags: string[];
  custom_fields: any;
  last_interaction_at: string | null;
  created_at: string;
}

export default function CRMPeoplePage() {
  const { currentCompany, supabaseUser, currentBusinessUnit } = useAuth();
  const { toast } = useToast();
  const { t, language } = useI18n();
  const navigate = useNavigate();

  const TEMP_LABELS: Record<string, string> = { cold: t.crm.cold, warm: t.crm.warm, hot: t.crm.hot };
  const STATUS_LABELS: Record<string, string> = { lead: 'Lead', client: t.crm.client };
  const ORIGIN_LABELS: Record<string, string> = {
    indicacao: t.crm.indicacao, inbound: 'Inbound', outbound: 'Outbound',
    social_media: 'Social Media', evento: t.crm.evento, other: t.crm.other,
    facebook: t.crm.facebook, instagram: t.crm.instagram, site: t.crm.site,
    prospeccao_ativa: t.crm.prospeccao_ativa, midia_offline: t.crm.midia_offline,
  };

  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [cadence, setCadence] = useState<CadenceSettings>(DEFAULT_CADENCE);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => (localStorage.getItem('crm-people-view') as any) || 'list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deals, setDeals] = useState<{ id: string; title: string; value: number; stage_name: string; pipeline_id: string; contact_id: string; expected_close_date: string | null; created_at: string }[]>([]);
  const [pipelinesMap, setPipelinesMap] = useState<Record<string, { name: string; stages: { name: string; probability: number }[] }>>({});
  const [breakdownContact, setBreakdownContact] = useState<CRMContact | null>(null);

  // Basic filters
  const [search, setSearch] = useState('');
  const [filterTemp, setFilterTemp] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterOrigin, setFilterOrigin] = useState('all');

  // Advanced filters
  const [filterScoreMin, setFilterScoreMin] = useState('');
  const [filterScoreMax, setFilterScoreMax] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterHasEmail, setFilterHasEmail] = useState('all');
  const [filterHasPhone, setFilterHasPhone] = useState('all');
  const [filterCreatedFrom, setFilterCreatedFrom] = useState('');
  const [filterCreatedTo, setFilterCreatedTo] = useState('');
  const [filterLastInterFrom, setFilterLastInterFrom] = useState('');
  const [filterLastInterTo, setFilterLastInterTo] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterPosition, setFilterPosition] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formCpf, setFormCpf] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPosition, setFormPosition] = useState('');
  const [formOrigin, setFormOrigin] = useState<string>('other');
  const [formTags, setFormTags] = useState('');

  const buId = currentBusinessUnit?.id;

  const fetchContacts = async () => {
    if (!currentCompany) return;
    setLoading(true);
    const [{ data }, { data: cadenceData }, { data: dealsData }, { data: pipesData }] = await Promise.all([
      withBuFilter(supabase.from('crm_contacts').select('*').eq('company_id', currentCompany.id).order('created_at', { ascending: false }), buId),
      supabase.from('crm_cadence_settings').select('*').eq('company_id', currentCompany.id).maybeSingle(),
      supabase.from('crm_pipeline_deals').select('id, title, value, stage_name, pipeline_id, contact_id, expected_close_date, created_at').eq('company_id', currentCompany.id).not('contact_id', 'is', null),
      supabase.from('crm_pipelines').select('id, name, stages').eq('company_id', currentCompany.id),
    ]);
    if (cadenceData) setCadence({ warm_after_days: cadenceData.warm_after_days, cold_after_days: cadenceData.cold_after_days });
    if (data) setContacts(data as any);
    if (dealsData) setDeals(dealsData as any);
    if (pipesData) {
      const map: Record<string, { name: string; stages: { name: string; probability: number }[] }> = {};
      pipesData.forEach(p => { map[p.id] = { name: p.name, stages: Array.isArray(p.stages) ? p.stages as any : [] }; });
      setPipelinesMap(map);
    }
    setLoading(false);
  };

  useEffect(() => { fetchContacts(); }, [currentCompany, buId]);

  // Compute per-contact deal metrics
  const dealMetricsByContact = useMemo(() => {
    const map: Record<string, { totalValue: number; openCount: number; wonCount: number; ltv: number; trend: 'up' | 'down' | 'stable'; deals: typeof deals }> = {};
    contacts.forEach(c => {
      const cDeals = deals.filter(d => d.contact_id === c.id);
      let wonValue = 0, openValue = 0, openProbSum = 0, openCount = 0, wonCount = 0;
      cDeals.forEach(d => {
        const pipe = pipelinesMap[d.pipeline_id];
        const stage = pipe?.stages.find(s => s.name === d.stage_name);
        const prob = stage?.probability ?? 0;
        const isWon = prob === 100;
        const isLost = prob === 0 && (d.stage_name?.toLowerCase().includes('lost') || d.stage_name?.toLowerCase().includes('perd'));
        if (isWon) { wonValue += Number(d.value); wonCount++; }
        else if (!isLost) { openValue += Number(d.value); openProbSum += prob; openCount++; }
      });
      const totalValue = wonValue + openValue;
      const avgOpenProb = openCount ? openProbSum / openCount / 100 : 0;
      const avgOpenValue = openCount ? openValue / openCount : 0;
      const ltv = wonValue + (avgOpenValue * avgOpenProb * openCount);
      // Trend: compare deals created in last 30 days vs prior 30 days by value
      const now = Date.now();
      const recent = cDeals.filter(d => now - new Date(d.created_at).getTime() < 30 * 86400000).reduce((s, d) => s + Number(d.value), 0);
      const prior = cDeals.filter(d => { const age = now - new Date(d.created_at).getTime(); return age >= 30 * 86400000 && age < 60 * 86400000; }).reduce((s, d) => s + Number(d.value), 0);
      const trend: 'up' | 'down' | 'stable' = recent > prior * 1.1 ? 'up' : recent < prior * 0.9 ? 'down' : 'stable';
      map[c.id] = { totalValue, openCount: openCount + wonCount, wonCount, ltv, trend, deals: cDeals };
    });
    return map;
  }, [contacts, deals, pipelinesMap]);

  // Extract unique tags for filter dropdown
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    contacts.forEach(c => (c.tags ?? []).forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [contacts]);

  // Apply dynamic temperature
  const contactsWithTemp = useMemo(() =>
    contacts.map(c => ({ ...c, temperature: computeTemperature(c.created_at, c.last_interaction_at, cadence) })),
    [contacts, cadence]
  );

  const filtered = useMemo(() => {
    let result = contactsWithTemp;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.includes(q) || c.cpf?.includes(q));
    }
    if (filterTemp !== 'all') result = result.filter(c => c.temperature === filterTemp);
    if (filterStatus !== 'all') result = result.filter(c => c.status === filterStatus);
    if (filterOrigin !== 'all') result = result.filter(c => c.origin === filterOrigin);
    if (filterScoreMin) result = result.filter(c => c.score >= Number(filterScoreMin));
    if (filterScoreMax) result = result.filter(c => c.score <= Number(filterScoreMax));
    if (filterTag) result = result.filter(c => (c.tags ?? []).includes(filterTag));
    if (filterHasEmail === 'yes') result = result.filter(c => !!c.email);
    if (filterHasEmail === 'no') result = result.filter(c => !c.email);
    if (filterHasPhone === 'yes') result = result.filter(c => !!c.phone);
    if (filterHasPhone === 'no') result = result.filter(c => !c.phone);
    if (filterCreatedFrom) result = result.filter(c => c.created_at >= filterCreatedFrom);
    if (filterCreatedTo) result = result.filter(c => c.created_at <= filterCreatedTo + 'T23:59:59');
    if (filterLastInterFrom) result = result.filter(c => c.last_interaction_at && c.last_interaction_at >= filterLastInterFrom);
    if (filterLastInterTo) result = result.filter(c => c.last_interaction_at && c.last_interaction_at <= filterLastInterTo + 'T23:59:59');
    if (filterPriority !== 'all') result = result.filter(c => (c.custom_fields as any)?.priority === filterPriority);
    if (filterPosition) {
      const q = filterPosition.toLowerCase();
      result = result.filter(c => c.position?.toLowerCase().includes(q));
    }
    return result;
  }, [contactsWithTemp, search, filterTemp, filterStatus, filterOrigin, filterScoreMin, filterScoreMax, filterTag, filterHasEmail, filterHasPhone, filterCreatedFrom, filterCreatedTo, filterLastInterFrom, filterLastInterTo, filterPriority, filterPosition]);

  const resetForm = () => {
    setFormName(''); setFormCpf(''); setFormEmail(''); setFormPhone('');
    setFormPosition(''); setFormOrigin('other'); setFormTags('');
  };

  const handleCreate = async () => {
    if (!formName.trim() || !currentCompany) return;
    if (formEmail || formCpf || formPhone) {
      const orConds: string[] = [];
      if (formEmail) orConds.push(`email.eq.${formEmail}`);
      if (formCpf) orConds.push(`cpf.eq.${formCpf}`);
      if (formPhone) orConds.push(`phone.eq.${formPhone}`);
      const { data: dupes } = await supabase
        .from('crm_contacts').select('id, name, email, cpf, phone')
        .eq('company_id', currentCompany.id).or(orConds.join(','));
    if (dupes && dupes.length > 0) {
        toast({ title: t.crm.possibleDuplicate, description: `${t.crm.alreadyExists}: ${dupes[0].name}`, variant: 'destructive' });
        return;
      }
    }
    const tags = formTags ? formTags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const { error } = await supabase.from('crm_contacts').insert({
      company_id: currentCompany.id, name: formName.trim(), cpf: formCpf || null,
      email: formEmail || null, phone: formPhone || null, position: formPosition || null,
      origin: formOrigin as any, tags, created_by: supabaseUser?.id, responsible_id: supabaseUser?.id,
    });
    if (error) toast({ title: t.crm.errorCreatingContact, variant: 'destructive' });
    else { toast({ title: t.crm.contactCreated }); setDialogOpen(false); resetForm(); fetchContacts(); }
  };

  const columns = [
    { header: 'Nome', accessor: (r: CRMContact) => r.name },
    { header: 'Status', accessor: (r: CRMContact) => STATUS_LABELS[r.status] ?? r.status },
    { header: 'Temperatura', accessor: (r: CRMContact) => TEMP_LABELS[r.temperature] ?? r.temperature },
    { header: 'Origem', accessor: (r: CRMContact) => ORIGIN_LABELS[r.origin] ?? r.origin },
    { header: 'Score', accessor: (r: CRMContact) => String(r.score) },
    { header: 'E-mail', accessor: (r: CRMContact) => r.email ?? '' },
    { header: 'Telefone', accessor: (r: CRMContact) => r.phone ?? '' },
  ];

  const hasBasicFilters = search || filterTemp !== 'all' || filterStatus !== 'all' || filterOrigin !== 'all';
  const hasAdvancedFilters = filterScoreMin || filterScoreMax || filterTag || filterHasEmail !== 'all' || filterHasPhone !== 'all' || filterCreatedFrom || filterCreatedTo || filterLastInterFrom || filterLastInterTo || filterPriority !== 'all' || filterPosition;
  const hasFilters = hasBasicFilters || hasAdvancedFilters;
  const activeFilterCount = [
    filterTemp !== 'all', filterStatus !== 'all', filterOrigin !== 'all',
    filterScoreMin, filterScoreMax, filterTag, filterHasEmail !== 'all', filterHasPhone !== 'all',
    filterCreatedFrom, filterCreatedTo, filterLastInterFrom, filterLastInterTo,
    filterPriority !== 'all', filterPosition,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearch(''); setFilterTemp('all'); setFilterStatus('all'); setFilterOrigin('all');
    setFilterScoreMin(''); setFilterScoreMax(''); setFilterTag(''); setFilterHasEmail('all');
    setFilterHasPhone('all'); setFilterCreatedFrom(''); setFilterCreatedTo('');
    setFilterLastInterFrom(''); setFilterLastInterTo(''); setFilterPriority('all'); setFilterPosition('');
  };

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filtered.map(c => c.id)));
  }, [filtered]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleBulkDelete = async () => {
    if (!currentCompany || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from('crm_contacts').delete().in('id', ids).eq('company_id', currentCompany.id);
    if (error) toast({ title: t.crm.errorDeletingContacts, variant: 'destructive' });
    else { toast({ title: `${ids.length} ${t.crm.contactsDeleted}` }); clearSelection(); fetchContacts(); }
  };

  const handleBulkStatus = async (status: 'lead' | 'client') => {
    if (!currentCompany || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from('crm_contacts').update({ status }).in('id', ids).eq('company_id', currentCompany.id);
    if (error) toast({ title: t.crm.errorChangingStatus, variant: 'destructive' });
    else { toast({ title: `${ids.length} ${t.crm.contactsUpdatedTo} ${status === 'client' ? t.crm.client : 'Lead'}` }); clearSelection(); fetchContacts(); }
  };

  const handleBulkExport = () => {
    const selected = filtered.filter(c => selectedIds.has(c.id));
    exportToCSV('crm-pessoas-selecionados', columns, selected);
    toast({ title: `${selected.length} ${t.crm.contactsExported}` });
  };

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard label="Total" value={String(contacts.length)} icon={<Users className="w-5 h-5" />} gradient="from-blue-500 to-blue-600" />
          <KPICard label={t.crmPeopleFilters.clients} value={String(contactsWithTemp.filter(c => c.status === 'client').length)} icon={<UserCheck className="w-5 h-5" />} gradient="from-emerald-500 to-emerald-600" />
          <KPICard label="Leads" value={String(contactsWithTemp.filter(c => c.status === 'lead').length)} icon={<UserPlus className="w-5 h-5" />} gradient="from-violet-500 to-violet-600" />
          <KPICard label={t.crmPeopleFilters.new30d} value={String(contacts.filter(c => { const d = new Date(c.created_at); const ago = new Date(); ago.setDate(ago.getDate() - 30); return d >= ago; }).length)} icon={<TrendingUp className="w-5 h-5" />} gradient="from-amber-500 to-amber-600" />
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" /> {t.crm.people}
          </h1>
          <p className="text-sm text-muted-foreground">{t.crm.managePeople}</p>
        </div>
        <div className="flex gap-2">
          <div className="flex border border-border rounded-md overflow-hidden">
            <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" className="h-8 w-8 rounded-none" onClick={() => { setViewMode('list'); localStorage.setItem('crm-people-view', 'list'); }}>
              <List className="w-4 h-4" />
            </Button>
            <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" className="h-8 w-8 rounded-none" onClick={() => { setViewMode('grid'); localStorage.setItem('crm-people-view', 'grid'); }}>
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5"><Download className="w-3.5 h-3.5" /> {t.crm.exportLabel}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => exportToCSV('crm-pessoas', columns, filtered)}>
                <FileSpreadsheet className="w-4 h-4 mr-2" /> CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setImportOpen(true)}>
            <Upload className="w-3.5 h-3.5" /> {t.common.import}
          </Button>
          <Button type="button" size="sm" className="gap-1.5" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDialogOpen(true); }} aria-label={t.crm.newContact}>
            <Plus className="w-3.5 h-3.5" /> {t.crm.newContact}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder={t.crm.searchNameEmailPhoneCpf} value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[120px] h-8 text-sm"><SelectValue placeholder={t.crm.status} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.common.all}</SelectItem>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="client">{t.crm.client}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterTemp} onValueChange={setFilterTemp}>
            <SelectTrigger className="w-[130px] h-8 text-sm"><SelectValue placeholder={t.crm.temperature} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.crm.allTemps}</SelectItem>
              <SelectItem value="cold">{t.crm.cold}</SelectItem>
              <SelectItem value="warm">{t.crm.warm}</SelectItem>
              <SelectItem value="hot">{t.crm.hot}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterOrigin} onValueChange={setFilterOrigin}>
            <SelectTrigger className="w-[130px] h-8 text-sm"><SelectValue placeholder={t.crm.origin} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.crm.allOrigins}</SelectItem>
              {Object.entries(ORIGIN_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-sm" onClick={() => setFiltersOpen(!filtersOpen)}>
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {t.crm.advancedFilters}
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{activeFilterCount}</Badge>
            )}
            <ChevronDown className={`w-3 h-3 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
          </Button>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8">
              <X className="w-3 h-3 mr-1" /> {t.crm.clear} ({filtered.length})
            </Button>
          )}
        </div>

        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleContent>
            <Card className="mt-2">
              <CardContent className="pt-4 pb-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">{t.crmPeopleFilters.scoreMin}</Label>
                    <Input type="number" min="0" max="100" value={filterScoreMin} onChange={e => setFilterScoreMin(e.target.value)} className="h-8 text-sm" placeholder="0" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t.crmPeopleFilters.scoreMax}</Label>
                    <Input type="number" min="0" max="100" value={filterScoreMax} onChange={e => setFilterScoreMax(e.target.value)} className="h-8 text-sm" placeholder="100" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t.crmPeopleFilters.tag}</Label>
                    <Select value={filterTag} onValueChange={setFilterTag}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder={t.crmPeopleFilters.allFem} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t.crmPeopleFilters.allFem}</SelectItem>
                        {allTags.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t.crmPeopleFilters.priority}</Label>
                    <Select value={filterPriority} onValueChange={setFilterPriority}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder={t.crmPeopleFilters.allFem} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t.crmPeopleFilters.allFem}</SelectItem>
                        <SelectItem value="baixa">{t.crmPeopleFilters.low}</SelectItem>
                        <SelectItem value="media">{t.crmPeopleFilters.medium}</SelectItem>
                        <SelectItem value="alta">{t.crmPeopleFilters.high}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t.crmPeopleFilters.hasEmail}</Label>
                    <Select value={filterHasEmail} onValueChange={setFilterHasEmail}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t.common.all}</SelectItem>
                        <SelectItem value="yes">{t.common.yes}</SelectItem>
                        <SelectItem value="no">{t.common.no}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t.crmPeopleFilters.hasPhone}</Label>
                    <Select value={filterHasPhone} onValueChange={setFilterHasPhone}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t.common.all}</SelectItem>
                        <SelectItem value="yes">{t.common.yes}</SelectItem>
                        <SelectItem value="no">{t.common.no}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t.crmPeopleFilters.position}</Label>
                    <Input value={filterPosition} onChange={e => setFilterPosition(e.target.value)} className="h-8 text-sm" placeholder={t.crmPeopleFilters.searchPosition} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t.crmPeopleFilters.createdFrom}</Label>
                    <Input type="date" value={filterCreatedFrom} onChange={e => setFilterCreatedFrom(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t.crmPeopleFilters.createdTo}</Label>
                    <Input type="date" value={filterCreatedTo} onChange={e => setFilterCreatedTo(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t.crmPeopleFilters.lastInterFrom}</Label>
                    <Input type="date" value={filterLastInterFrom} onChange={e => setFilterLastInterFrom(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t.crmPeopleFilters.lastInterTo}</Label>
                    <Input type="date" value={filterLastInterTo} onChange={e => setFilterLastInterTo(e.target.value)} className="h-8 text-sm" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Results count */}
      {!loading && (
        <p className="text-xs text-muted-foreground">
          {hasFilters
            ? `${filtered.length} / ${contacts.length} ${t.crm.contactsOf}`
            : `${contacts.length} ${t.crm.contactsOf}`}
        </p>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4 flex gap-4 items-center">
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                <div className="h-3 w-48 bg-muted rounded animate-pulse" />
              </div>
            </CardContent></Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <svg width="64" height="64" viewBox="0 0 80 80" fill="none" className="mb-3 opacity-25">
              <rect x="10" y="20" width="60" height="45" rx="8" stroke="currentColor" strokeWidth="2" className="text-muted-foreground" />
              <path d="M10 32h60" stroke="currentColor" strokeWidth="2" className="text-muted-foreground" />
              <rect x="18" y="40" width="18" height="4" rx="2" fill="currentColor" className="text-muted-foreground" />
              <rect x="18" y="48" width="12" height="4" rx="2" fill="currentColor" className="text-muted-foreground" />
            </svg>
            <p className="text-sm font-semibold text-muted-foreground">{t.crm.noContactFound}</p>
            <p className="text-xs text-muted-foreground/70 mt-1">{t.crm.createFirstContact}</p>
            <Button type="button" variant="outline" size="sm" className="mt-4 text-xs" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDialogOpen(true); }}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> {t.crm.newContact}
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(c => (
            <ContactCard
              key={c.id}
              id={c.id}
              name={c.name}
              subtitle={c.position}
              email={c.email}
              phone={c.phone}
              statusLabel={STATUS_LABELS[c.status]}
              statusVariant={c.status === 'client' ? 'default' : 'secondary'}
              tempLabel={TEMP_LABELS[c.temperature]}
              tempClass={TEMP_COLORS[c.temperature]}
              tags={c.tags}
              score={c.score}
              extraInfo={ORIGIN_LABELS[c.origin] ?? c.origin}
              createdAt={c.created_at}
              selected={selectedIds.has(c.id)}
              onSelect={toggleSelect}
              onView={() => navigate(`/crm/people/${c.id}`)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={filtered.length > 0 && filtered.every(c => selectedIds.has(c.id))}
                      onCheckedChange={checked => { if (checked) selectAll(); else clearSelection(); }}
                    />
                  </TableHead>
                  <TableHead>{t.crm.name}</TableHead>
                  <TableHead>{t.crm.status}</TableHead>
                  <TableHead>{t.crm.temperature}</TableHead>
                  <TableHead className="text-right">{t.crmPeopleColumns.totalValue}</TableHead>
                  <TableHead className="text-right">{t.crmPeopleColumns.dealsCount}</TableHead>
                  <TableHead className="text-right">{t.crmPeopleColumns.ltv}</TableHead>
                  <TableHead className="hidden md:table-cell">{t.crm.lastInteraction}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(c => {
                  const m = dealMetricsByContact[c.id] || { totalValue: 0, openCount: 0, wonCount: 0, ltv: 0, trend: 'stable' as const, deals: [] };
                  const totalValueColor = m.totalValue > 5000 ? 'text-green-600 font-bold'
                    : m.totalValue >= 1000 ? 'text-amber-600 font-semibold'
                    : 'text-muted-foreground';
                  const ltvColor = m.ltv > 10000 ? 'text-amber-500 font-bold'
                    : m.ltv >= 5000 ? 'text-green-600 font-bold'
                    : m.ltv >= 1000 ? 'text-blue-600 font-semibold'
                    : 'text-muted-foreground';
                  const TrendIcon = m.trend === 'up' ? TrendingUp : m.trend === 'down' ? TrendingDown : Minus;
                  const trendColor = m.trend === 'up' ? 'text-green-500' : m.trend === 'down' ? 'text-red-500' : 'text-muted-foreground';
                  return (
                    <TableRow key={c.id} className={cn('cursor-pointer', selectedIds.has(c.id) && 'bg-primary/5')} onClick={() => navigate(`/crm/people/${c.id}`)}>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Checkbox checked={selectedIds.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} />
                      </TableCell>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>
                        <Badge variant={c.status === 'client' ? 'default' : 'secondary'} className="text-xs">
                          {STATUS_LABELS[c.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('text-xs', TEMP_COLORS[c.temperature])}>{TEMP_LABELS[c.temperature]}</Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={e => { e.stopPropagation(); if (m.openCount > 0) setBreakdownContact(c); }}>
                        <span className={cn('text-sm hover:underline', totalValueColor, m.openCount > 0 && 'cursor-pointer')}>
                          {formatCurrency(m.totalValue, language)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold">{m.openCount}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {m.ltv > 10000 && <Crown className="w-3 h-3 text-amber-500" />}
                          <span className={cn('text-sm', ltvColor)}>{formatCurrency(m.ltv, language)}</span>
                          <TrendIcon className={cn('w-3 h-3', trendColor)} />
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {c.last_interaction_at ? new Date(c.last_interaction_at).toLocaleDateString(language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'pt-BR') : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <BulkActionBar
        count={selectedIds.size}
        totalCount={filtered.length}
        onSelectAll={selectAll}
        onClear={clearSelection}
        onDelete={handleBulkDelete}
        onChangeStatus={handleBulkStatus}
        onExport={handleBulkExport}
      />

      {/* Deals breakdown modal */}
      <Dialog open={!!breakdownContact} onOpenChange={v => { if (!v) setBreakdownContact(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              {breakdownContact?.name} — {t.crmPeopleColumns.dealsBreakdown}
            </DialogTitle>
          </DialogHeader>
          {breakdownContact && (() => {
            const m = dealMetricsByContact[breakdownContact.id];
            if (!m || m.deals.length === 0) {
              return <p className="text-sm text-muted-foreground py-4">{t.crmDetail.noDealsLinked}</p>;
            }
            return (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {m.deals.map(d => {
                  const pipe = pipelinesMap[d.pipeline_id];
                  const stage = pipe?.stages.find(s => s.name === d.stage_name);
                  const prob = stage?.probability ?? 0;
                  return (
                    <div key={d.id} className="flex items-center justify-between p-3 rounded-md border border-border hover:bg-accent/30 cursor-pointer" onClick={() => { setBreakdownContact(null); navigate('/crm/pipeline'); }}>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{d.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5">{d.stage_name}</Badge>
                          <span className="text-xs text-muted-foreground">{prob}%</span>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-primary ml-2">{formatCurrency(Number(d.value), language)}</span>
                    </div>
                  );
                })}
                <div className="pt-3 border-t mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">{t.crmPeopleColumns.totalValue}:</span> <span className="font-bold">{formatCurrency(m.totalValue, language)}</span></div>
                  <div><span className="text-muted-foreground">{t.crmPeopleColumns.ltv}:</span> <span className="font-bold">{formatCurrency(m.ltv, language)}</span></div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>


      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) resetForm(); setDialogOpen(v); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t.crm.newContact}</DialogTitle>
            <DialogDescription>{t.crm.registerPerson}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label>{t.crm.fullName} *</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder={t.crm.fullName} />
            </div>
            <div className="space-y-1.5">
              <Label>{t.crm.cpf}</Label>
              <Input value={formCpf} onChange={e => setFormCpf(e.target.value)} placeholder="000.000.000-00" />
            </div>
            <div className="space-y-1.5">
              <Label>{t.crm.email}</Label>
              <Input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="email@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>{t.crm.phoneWhatsApp}</Label>
              <Input value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <div className="space-y-1.5">
              <Label>{t.crm.position}</Label>
              <Input value={formPosition} onChange={e => setFormPosition(e.target.value)} placeholder={t.crm.position} />
            </div>
            <div className="space-y-1.5">
              <Label>{t.crm.origin}</Label>
              <Select value={formOrigin} onValueChange={setFormOrigin}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ORIGIN_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>{t.crm.tagsSeparatedByComma}</Label>
              <Input value={formTags} onChange={e => setFormTags(e.target.value)} placeholder={t.placeholders.crmTags} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>{t.common.cancel}</Button>
            <Button onClick={handleCreate} disabled={!formName.trim()}>{t.common.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportContactsDialog open={importOpen} onOpenChange={setImportOpen} onSuccess={fetchContacts} />
    </div>
  );
}

