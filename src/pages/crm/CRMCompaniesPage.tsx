import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
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
import { Building2, Plus, Search, X, Download, FileSpreadsheet, SlidersHorizontal, ChevronDown, LayoutGrid, List, TrendingUp } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { exportToCSV } from '@/lib/export-utils';
import { computeTemperature, CadenceSettings, DEFAULT_CADENCE } from '@/components/crm/crm-temperature';
import { cn } from '@/lib/utils';
import { KPICard } from '@/components/shared/KPICard';
import { ContactCard } from '@/components/crm/CRMCardGrid';
import { BulkActionBar } from '@/components/crm/BulkActionBar';
import { formatCurrency } from '@/lib/format-utils';

const TEMP_COLORS: Record<string, string> = {
  cold: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  warm: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  hot: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

interface CRMCompany {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  segment: string | null;
  size: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  temperature: string;
  status: string;
  score: number;
  tags: string[];
  custom_fields: any;
  responsible_id: string | null;
  last_interaction_at: string | null;
  created_at: string;
}

export default function CRMCompaniesPage() {
  const { currentCompany, supabaseUser, currentBusinessUnit } = useAuth();
  const { t, language } = useI18n();
  const { toast } = useToast();
  const navigate = useNavigate();

  const TEMP_LABELS: Record<string, string> = { cold: t.crm.cold, warm: t.crm.warm, hot: t.crm.hot };
  const STATUS_LABELS: Record<string, string> = { lead: 'Lead', client: t.crm.client };
  const SIZE_LABELS: Record<string, string> = { mei: t.crm.mei, small: t.crm.small, medium: t.crm.mediumSize, large: t.crm.large };

  const [companies, setCompanies] = useState<CRMCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [cadence, setCadence] = useState<CadenceSettings>(DEFAULT_CADENCE);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => (localStorage.getItem('crm-companies-view') as any) || 'list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState('');
  const [filterTemp, setFilterTemp] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSize, setFilterSize] = useState('all');
  const [filterSegment, setFilterSegment] = useState('');
  const [filterScoreMin, setFilterScoreMin] = useState('');
  const [filterScoreMax, setFilterScoreMax] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterHasEmail, setFilterHasEmail] = useState('all');
  const [filterHasPhone, setFilterHasPhone] = useState('all');
  const [filterHasWebsite, setFilterHasWebsite] = useState('all');
  const [filterCreatedFrom, setFilterCreatedFrom] = useState('');
  const [filterCreatedTo, setFilterCreatedTo] = useState('');
  const [filterLastInterFrom, setFilterLastInterFrom] = useState('');
  const [filterLastInterTo, setFilterLastInterTo] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterHasCnpj, setFilterHasCnpj] = useState('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formRazao, setFormRazao] = useState('');
  const [formFantasia, setFormFantasia] = useState('');
  const [formCnpj, setFormCnpj] = useState('');
  const [formSegment, setFormSegment] = useState('');
  const [formSize, setFormSize] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formWebsite, setFormWebsite] = useState('');

  const buId = currentBusinessUnit?.id;

  const [deals, setDeals] = useState<{ id: string; value: number; stage_name: string; pipeline_id: string; crm_company_id: string }[]>([]);
  const [pipelinesMap, setPipelinesMap] = useState<Record<string, { stages: { name: string; probability: number }[] }>>({});

  const fetchCompanies = async () => {
    if (!currentCompany) return;
    setLoading(true);
    const [{ data }, { data: cadenceData }, { data: dealsData }, { data: pipesData }] = await Promise.all([
      withBuFilter(supabase.from('crm_companies').select('*').eq('company_id', currentCompany.id).order('created_at', { ascending: false }), buId),
      supabase.from('crm_cadence_settings').select('*').eq('company_id', currentCompany.id).maybeSingle(),
      supabase.from('crm_pipeline_deals').select('id, value, stage_name, pipeline_id, crm_company_id').eq('company_id', currentCompany.id).not('crm_company_id', 'is', null),
      supabase.from('crm_pipelines').select('id, stages').eq('company_id', currentCompany.id),
    ]);
    if (cadenceData) setCadence({ warm_after_days: cadenceData.warm_after_days, cold_after_days: cadenceData.cold_after_days });
    if (data) setCompanies(data as any);
    if (dealsData) setDeals(dealsData as any);
    if (pipesData) {
      const map: Record<string, { stages: { name: string; probability: number }[] }> = {};
      pipesData.forEach(p => { map[p.id] = { stages: Array.isArray(p.stages) ? p.stages as any : [] }; });
      setPipelinesMap(map);
    }
    setLoading(false);
  };

  useEffect(() => { fetchCompanies(); }, [currentCompany, buId]);

  const dealMetricsByCompany = useMemo(() => {
    const map: Record<string, { totalValue: number; count: number }> = {};
    companies.forEach(c => {
      const cDeals = deals.filter(d => d.crm_company_id === c.id);
      const totalValue = cDeals.reduce((s, d) => {
        const stage = pipelinesMap[d.pipeline_id]?.stages.find(st => st.name === d.stage_name);
        const prob = stage?.probability ?? 0;
        const isLost = prob === 0 && (d.stage_name?.toLowerCase().includes('lost') || d.stage_name?.toLowerCase().includes('perd'));
        return isLost ? s : s + Number(d.value);
      }, 0);
      map[c.id] = { totalValue, count: cDeals.length };
    });
    return map;
  }, [companies, deals, pipelinesMap]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    companies.forEach(c => (c.tags ?? []).forEach(tg => tagSet.add(tg)));
    return Array.from(tagSet).sort();
  }, [companies]);

  const allSegments = useMemo(() => {
    const segSet = new Set<string>();
    companies.forEach(c => { if (c.segment) segSet.add(c.segment); });
    return Array.from(segSet).sort();
  }, [companies]);

  const companiesWithTemp = useMemo(() =>
    companies.map(c => ({ ...c, temperature: computeTemperature(c.created_at, c.last_interaction_at, cadence) })),
    [companies, cadence]
  );

  const filtered = useMemo(() => {
    let result = companiesWithTemp;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.razao_social.toLowerCase().includes(q) ||
        c.nome_fantasia?.toLowerCase().includes(q) ||
        c.cnpj?.includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q)
      );
    }
    if (filterTemp !== 'all') result = result.filter(c => c.temperature === filterTemp);
    if (filterStatus !== 'all') result = result.filter(c => c.status === filterStatus);
    if (filterSize !== 'all') result = result.filter(c => c.size === filterSize);
    if (filterSegment) {
      const q = filterSegment.toLowerCase();
      result = result.filter(c => c.segment?.toLowerCase().includes(q));
    }
    if (filterScoreMin) result = result.filter(c => c.score >= Number(filterScoreMin));
    if (filterScoreMax) result = result.filter(c => c.score <= Number(filterScoreMax));
    if (filterTag) result = result.filter(c => (c.tags ?? []).includes(filterTag));
    if (filterHasEmail === 'yes') result = result.filter(c => !!c.email);
    if (filterHasEmail === 'no') result = result.filter(c => !c.email);
    if (filterHasPhone === 'yes') result = result.filter(c => !!c.phone);
    if (filterHasPhone === 'no') result = result.filter(c => !c.phone);
    if (filterHasWebsite === 'yes') result = result.filter(c => !!c.website);
    if (filterHasWebsite === 'no') result = result.filter(c => !c.website);
    if (filterHasCnpj === 'yes') result = result.filter(c => !!c.cnpj);
    if (filterHasCnpj === 'no') result = result.filter(c => !c.cnpj);
    if (filterCreatedFrom) result = result.filter(c => c.created_at >= filterCreatedFrom);
    if (filterCreatedTo) result = result.filter(c => c.created_at <= filterCreatedTo + 'T23:59:59');
    if (filterLastInterFrom) result = result.filter(c => c.last_interaction_at && c.last_interaction_at >= filterLastInterFrom);
    if (filterLastInterTo) result = result.filter(c => c.last_interaction_at && c.last_interaction_at <= filterLastInterTo + 'T23:59:59');
    if (filterPriority !== 'all') result = result.filter(c => (c.custom_fields as any)?.priority === filterPriority);
    return result;
  }, [companiesWithTemp, search, filterTemp, filterStatus, filterSize, filterSegment, filterScoreMin, filterScoreMax, filterTag, filterHasEmail, filterHasPhone, filterHasWebsite, filterHasCnpj, filterCreatedFrom, filterCreatedTo, filterLastInterFrom, filterLastInterTo, filterPriority]);

  const resetForm = () => {
    setFormRazao(''); setFormFantasia(''); setFormCnpj(''); setFormSegment('');
    setFormSize(''); setFormEmail(''); setFormPhone(''); setFormWebsite('');
  };

  const handleCreate = async () => {
    if (!formRazao.trim() || !currentCompany) return;
    if (formCnpj) {
      const { data: dupes } = await supabase.from('crm_companies').select('id, razao_social')
        .eq('company_id', currentCompany.id).eq('cnpj', formCnpj);
      if (dupes && dupes.length > 0) {
        toast({ title: t.crm.cnpjAlreadyRegistered, description: `${t.crm.company}: ${dupes[0].razao_social}`, variant: 'destructive' });
        return;
      }
    }
    const { error } = await supabase.from('crm_companies').insert({
      company_id: currentCompany.id, razao_social: formRazao.trim(),
      nome_fantasia: formFantasia || null, cnpj: formCnpj || null,
      segment: formSegment || null, size: formSize ? formSize as any : null,
      email: formEmail || null, phone: formPhone || null, website: formWebsite || null,
      created_by: supabaseUser?.id, responsible_id: supabaseUser?.id,
    });
    if (error) toast({ title: t.crm.errorCreatingCompany, variant: 'destructive' });
    else { toast({ title: t.crm.companyCreated }); setDialogOpen(false); resetForm(); fetchCompanies(); }
  };

  const columns = [
    { header: t.crm.razaoSocial, accessor: (r: CRMCompany) => r.razao_social },
    { header: t.crm.nomeFantasia, accessor: (r: CRMCompany) => r.nome_fantasia ?? '' },
    { header: t.crm.status, accessor: (r: CRMCompany) => STATUS_LABELS[r.status] ?? r.status },
    { header: t.crm.temperature, accessor: (r: CRMCompany) => TEMP_LABELS[r.temperature] ?? r.temperature },
    { header: 'Score', accessor: (r: CRMCompany) => String(r.score) },
  ];

  const activeFilterCount = [
    filterTemp !== 'all', filterStatus !== 'all', filterSize !== 'all', filterSegment,
    filterScoreMin, filterScoreMax, filterTag, filterHasEmail !== 'all', filterHasPhone !== 'all',
    filterHasWebsite !== 'all', filterHasCnpj !== 'all', filterCreatedFrom, filterCreatedTo,
    filterLastInterFrom, filterLastInterTo, filterPriority !== 'all',
  ].filter(Boolean).length;

  const hasFilters = search || activeFilterCount > 0;

  const clearFilters = () => {
    setSearch(''); setFilterTemp('all'); setFilterStatus('all'); setFilterSize('all');
    setFilterSegment(''); setFilterScoreMin(''); setFilterScoreMax(''); setFilterTag('');
    setFilterHasEmail('all'); setFilterHasPhone('all'); setFilterHasWebsite('all');
    setFilterHasCnpj('all'); setFilterCreatedFrom(''); setFilterCreatedTo('');
    setFilterLastInterFrom(''); setFilterLastInterTo(''); setFilterPriority('all');
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
    const { error } = await supabase.from('crm_companies').delete().in('id', ids).eq('company_id', currentCompany.id);
    if (error) toast({ title: t.crm.errorDeletingCompanies, variant: 'destructive' });
    else { toast({ title: `${ids.length} ${t.crm.companiesDeleted}` }); clearSelection(); fetchCompanies(); }
  };

  const handleBulkStatus = async (status: 'lead' | 'client') => {
    if (!currentCompany || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from('crm_companies').update({ status }).in('id', ids).eq('company_id', currentCompany.id);
    if (error) toast({ title: t.crm.errorChangingStatus, variant: 'destructive' });
    else { toast({ title: `${ids.length} ${t.crm.companiesUpdatedTo} ${status === 'client' ? t.crm.client : 'Lead'}` }); clearSelection(); fetchCompanies(); }
  };

  const handleBulkExport = () => {
    const selected = filtered.filter(c => selectedIds.has(c.id));
    exportToCSV('crm-empresas-selecionadas', columns, selected);
    toast({ title: `${selected.length} ${t.crm.companiesExported}` });
  };

  return (
    <div className="space-y-5">
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard label={t.crm.total} value={String(companies.length)} icon={<Building2 className="w-5 h-5" />} gradient="from-blue-500 to-blue-600" />
          <KPICard label={t.crm.client + 's'} value={String(companiesWithTemp.filter(c => c.status === 'client').length)} icon={<Building2 className="w-5 h-5" />} gradient="from-emerald-500 to-emerald-600" />
          <KPICard label="Leads" value={String(companiesWithTemp.filter(c => c.status === 'lead').length)} icon={<Building2 className="w-5 h-5" />} gradient="from-violet-500 to-violet-600" />
          <KPICard label={`${t.crm.new} (30d)`} value={String(companies.filter(c => { const d = new Date(c.created_at); const ago = new Date(); ago.setDate(ago.getDate() - 30); return d >= ago; }).length)} icon={<TrendingUp className="w-5 h-5" />} gradient="from-amber-500 to-amber-600" />
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" /> {t.crm.companies}
          </h1>
          <p className="text-sm text-muted-foreground">{t.crm.manageCompanies}</p>
        </div>
        <div className="flex gap-2">
          <div className="flex border border-border rounded-md overflow-hidden">
            <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" className="h-8 w-8 rounded-none" onClick={() => { setViewMode('list'); localStorage.setItem('crm-companies-view', 'list'); }}>
              <List className="w-4 h-4" />
            </Button>
            <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" className="h-8 w-8 rounded-none" onClick={() => { setViewMode('grid'); localStorage.setItem('crm-companies-view', 'grid'); }}>
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5"><Download className="w-3.5 h-3.5" /> {t.common.export}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => exportToCSV('crm-empresas', columns, filtered)}>
                <FileSpreadsheet className="w-4 h-4 mr-2" /> CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
            <Plus className="w-3.5 h-3.5" /> {t.crm.newCompany}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder={t.crm.searchCompanies} value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
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
          <Select value={filterSize} onValueChange={setFilterSize}>
            <SelectTrigger className="w-[120px] h-8 text-sm"><SelectValue placeholder={t.crm.size} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.crm.allSizes}</SelectItem>
              {Object.entries(SIZE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
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
                    <Label className="text-xs">{t.crm.scoreMin}</Label>
                    <Input type="number" min="0" max="100" value={filterScoreMin} onChange={e => setFilterScoreMin(e.target.value)} className="h-8 text-sm" placeholder="0" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t.crm.scoreMax}</Label>
                    <Input type="number" min="0" max="100" value={filterScoreMax} onChange={e => setFilterScoreMax(e.target.value)} className="h-8 text-sm" placeholder="100" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t.crm.segment}</Label>
                    <Input value={filterSegment} onChange={e => setFilterSegment(e.target.value)} className="h-8 text-sm" placeholder={t.crm.searchSegment} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t.crm.tag}</Label>
                    <Select value={filterTag} onValueChange={setFilterTag}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder={t.crm.allTags} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t.crm.allTags}</SelectItem>
                        {allTags.map(tg => <SelectItem key={tg} value={tg}>{tg}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t.crm.priority}</Label>
                    <Select value={filterPriority} onValueChange={setFilterPriority}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder={t.crm.allPriorities} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t.crm.allPriorities}</SelectItem>
                        <SelectItem value="baixa">{t.crm.low}</SelectItem>
                        <SelectItem value="media">{t.crm.medium}</SelectItem>
                        <SelectItem value="alta">{t.crm.high}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t.crm.hasEmail}</Label>
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
                    <Label className="text-xs">{t.crm.hasPhone}</Label>
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
                    <Label className="text-xs">{t.crm.hasWebsite}</Label>
                    <Select value={filterHasWebsite} onValueChange={setFilterHasWebsite}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t.common.all}</SelectItem>
                        <SelectItem value="yes">{t.common.yes}</SelectItem>
                        <SelectItem value="no">{t.common.no}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t.crm.hasCnpj}</Label>
                    <Select value={filterHasCnpj} onValueChange={setFilterHasCnpj}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t.common.all}</SelectItem>
                        <SelectItem value="yes">{t.common.yes}</SelectItem>
                        <SelectItem value="no">{t.common.no}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t.crm.createdFrom}</Label>
                    <Input type="date" value={filterCreatedFrom} onChange={e => setFilterCreatedFrom(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t.crm.createdTo}</Label>
                    <Input type="date" value={filterCreatedTo} onChange={e => setFilterCreatedTo(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t.crm.lastInteractionFrom}</Label>
                    <Input type="date" value={filterLastInterFrom} onChange={e => setFilterLastInterFrom(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t.crm.lastInteractionTo}</Label>
                    <Input type="date" value={filterLastInterTo} onChange={e => setFilterLastInterTo(e.target.value)} className="h-8 text-sm" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {!loading && (
        <p className="text-xs text-muted-foreground">{filtered.length} / {companies.length} {t.crm.companiesOf}</p>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4 flex gap-4 items-center">
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-36 bg-muted rounded animate-pulse" />
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
            <p className="text-sm font-semibold text-muted-foreground">{t.crm.noCompanyFound}</p>
            <p className="text-xs text-muted-foreground/70 mt-1">{t.crm.registerFirstCompany}</p>
            <Button variant="outline" size="sm" className="mt-4 text-xs" onClick={() => setDialogOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> {t.crm.newCompany}
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(c => (
            <ContactCard
              key={c.id}
              id={c.id}
              name={c.razao_social}
              subtitle={c.nome_fantasia || c.segment}
              email={c.email}
              phone={c.phone}
              statusLabel={STATUS_LABELS[c.status]}
              statusVariant={c.status === 'client' ? 'default' : 'secondary'}
              tempLabel={TEMP_LABELS[c.temperature]}
              tempClass={TEMP_COLORS[c.temperature]}
              tags={c.tags}
              score={c.score}
              extraInfo={c.cnpj ?? undefined}
              createdAt={c.created_at}
              selected={selectedIds.has(c.id)}
              onSelect={toggleSelect}
              onView={() => navigate(`/crm/companies/${c.id}`)}
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
                  <TableHead>{t.crm.razaoSocial}</TableHead>
                  <TableHead>{t.crm.nomeFantasia}</TableHead>
                  <TableHead>{t.crm.status}</TableHead>
                  <TableHead>{t.crm.temperature}</TableHead>
                  <TableHead className="text-right">{t.crmPeopleColumns?.dealsCount ?? 'Deals'}</TableHead>
                  <TableHead className="text-right">{t.crmPeopleColumns?.totalValue ?? 'Total Value'}</TableHead>
                  <TableHead className="hidden md:table-cell">{t.crm.lastInteraction}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(c => {
                  const m = dealMetricsByCompany[c.id] || { totalValue: 0, count: 0 };
                  const valColor = m.totalValue > 5000 ? 'text-green-600 font-bold' : m.totalValue >= 1000 ? 'text-amber-600 font-semibold' : 'text-muted-foreground';
                  return (
                    <TableRow key={c.id} className={cn('cursor-pointer', selectedIds.has(c.id) && 'bg-primary/5')} onClick={() => navigate(`/crm/companies/${c.id}`)}>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Checkbox checked={selectedIds.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} />
                      </TableCell>
                      <TableCell className="font-medium" title={c.razao_social}>{c.razao_social}</TableCell>
                      <TableCell className="text-muted-foreground" title={c.nome_fantasia ?? ''}>{c.nome_fantasia ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={c.status === 'client' ? 'default' : 'secondary'} className="text-xs">
                          {STATUS_LABELS[c.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('text-xs', TEMP_COLORS[c.temperature])}>{TEMP_LABELS[c.temperature]}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold">{m.count}</TableCell>
                      <TableCell className={cn('text-right text-sm', valColor)}>
                        {formatCurrency(m.totalValue, language)}
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

      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) resetForm(); setDialogOpen(v); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t.crm.newCompany}</DialogTitle>
            <DialogDescription>{t.crm.registerCompanyPJ}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label>{t.crm.razaoSocial} *</Label>
              <Input value={formRazao} onChange={e => setFormRazao(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t.crm.nomeFantasia}</Label>
              <Input value={formFantasia} onChange={e => setFormFantasia(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t.crm.cnpj}</Label>
              <Input value={formCnpj} onChange={e => setFormCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
            </div>
            <div className="space-y-1.5">
              <Label>{t.crm.segment}</Label>
              <Input value={formSegment} onChange={e => setFormSegment(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t.crm.size}</Label>
              <Select value={formSize} onValueChange={setFormSize}>
                <SelectTrigger><SelectValue placeholder={t.crm.select} /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SIZE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t.crm.email}</Label>
              <Input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t.crm.phone}</Label>
              <Input value={formPhone} onChange={e => setFormPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>{t.crm.website}</Label>
              <Input value={formWebsite} onChange={e => setFormWebsite(e.target.value)} placeholder="https://" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>{t.common.cancel}</Button>
            <Button onClick={handleCreate} disabled={!formRazao.trim()}>{t.common.register}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
