import { useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { withBuFilter } from '@/lib/bu-filter';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Users, Plus, Search, X, Download, Upload, FileSpreadsheet,
  SlidersHorizontal, ChevronDown, LayoutGrid, List, UserPlus,
  UserCheck, TrendingUp, TrendingDown, Minus, DollarSign, Crown,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { exportToCSV } from '@/lib/export-utils';
import { computeTemperature, CadenceSettings, DEFAULT_CADENCE } from '@/components/crm/crm-temperature';
import { cn } from '@/lib/utils';
import { KPICard } from '@/components/shared/KPICard';
import { ContactCard } from '@/components/crm/CRMCardGrid';
import { BulkActionBar } from '@/components/crm/BulkActionBar';
import { ImportContactsDialog } from '@/components/crm/ImportContactsDialog';
import { formatCurrency } from '@/lib/format-utils';

const PAGE_SIZE = 50;

const TEMP_COLORS: Record<string, string> = {
  cold: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  warm: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  hot:  'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
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

// ---------------------------------------------------------------------------
// Debounce hook
// ---------------------------------------------------------------------------
function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const update = useCallback((v: T) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setDebounced(v), delay);
  }, [delay]);
  // keep reference in sync for controlled input — call update in onChange
  return debounced;
}

export default function CRMPeoplePage() {
  const { currentCompany, supabaseUser, currentBusinessUnit, role } = useAuth();
  const { toast } = useToast();
  const { t, language } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isCollaborator = role === 'collaborator';

  const buId = currentBusinessUnit?.id;

  const TEMP_LABELS: Record<string, string> = { cold: t.crm.cold, warm: t.crm.warm, hot: t.crm.hot };
  const STATUS_LABELS: Record<string, string> = { lead: 'Lead', client: t.crm.client };
  const ORIGIN_LABELS: Record<string, string> = {
    indicacao: t.crm.indicacao, inbound: 'Inbound', outbound: 'Outbound',
    social_media: 'Social Media', evento: t.crm.evento, other: t.crm.other,
    facebook: t.crm.facebook, instagram: t.crm.instagram, site: t.crm.site,
    prospeccao_ativa: t.crm.prospeccao_ativa, midia_offline: t.crm.midia_offline,
    indicacao_gestor: t.crm.indicacao_gestor, parcerias: t.crm.parcerias,
    indicacao_cliente: t.crm.indicacao_cliente,
  };

  // ── UI state ──────────────────────────────────────────────────────────────
  const [filtersOpen, setFiltersOpen]   = useState(false);
  const [viewMode, setViewMode]         = useState<'list' | 'grid'>(() => (localStorage.getItem('crm-people-view') as any) || 'list');
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set());
  const [breakdownContact, setBreakdownContact] = useState<CRMContact | null>(null);
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [importOpen, setImportOpen]     = useState(false);
  const [page, setPage]                 = useState(0);

  // Form fields
  const [formName, setFormName]         = useState('');
  const [formCpf, setFormCpf]           = useState('');
  const [formEmail, setFormEmail]       = useState('');
  const [formPhone, setFormPhone]       = useState('');
  const [formPosition, setFormPosition] = useState('');
  const [formOrigin, setFormOrigin]     = useState<string>('other');
  const [formTags, setFormTags]         = useState('');

  // ── Filters ───────────────────────────────────────────────────────────────
  const [search, setSearch]             = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const onSearchChange = (v: string) => {
    setSearch(v);
    setPage(0);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(v), 300);
  };

  const [filterTemp, setFilterTemp]     = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterOrigin, setFilterOrigin] = useState('all');

  // Advanced
  const [filterScoreMin, setFilterScoreMin]         = useState('');
  const [filterScoreMax, setFilterScoreMax]         = useState('');
  const [filterTag, setFilterTag]                   = useState('');
  const [filterHasEmail, setFilterHasEmail]         = useState('all');
  const [filterHasPhone, setFilterHasPhone]         = useState('all');
  const [filterCreatedFrom, setFilterCreatedFrom]   = useState('');
  const [filterCreatedTo, setFilterCreatedTo]       = useState('');
  const [filterLastInterFrom, setFilterLastInterFrom] = useState('');
  const [filterLastInterTo, setFilterLastInterTo]   = useState('');
  const [filterPriority, setFilterPriority]         = useState('all');
  const [filterPosition, setFilterPosition]         = useState('');

  // ── Data fetching with TanStack Query (cached) ────────────────────────────
  const { data: contacts = [], isLoading: loadingContacts } = useQuery({
    queryKey: ['crm-contacts', currentCompany?.id, buId, isCollaborator ? supabaseUser?.id : 'all'],
    enabled: !!currentCompany,
    staleTime: 60_000,          // cache 60 s — avoid refetch on tab-switch
    queryFn: async () => {
      // Select only columns used in the UI — skip company_id, updated_at, etc.
      let q = withBuFilter(
        supabase.from('crm_contacts')
          .select('id,name,cpf,email,phone,position,origin,temperature,status,score,responsible_id,tags,custom_fields,last_interaction_at,created_at')
          .eq('company_id', currentCompany!.id)
          .order('created_at', { ascending: false }),
        buId,
      );
      // Colaboradores veem apenas seus próprios contatos (belt-and-suspenders ao lado do RLS)
      if (isCollaborator && supabaseUser) {
        q = q.or(`responsible_id.eq.${supabaseUser.id},created_by.eq.${supabaseUser.id}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CRMContact[];
    },
  });

  const { data: cadence = DEFAULT_CADENCE } = useQuery({
    queryKey: ['crm-cadence', currentCompany?.id],
    enabled: !!currentCompany,
    staleTime: 300_000,
    queryFn: async () => {
      const { data } = await supabase.from('crm_cadence_settings').select('warm_after_days,cold_after_days').eq('company_id', currentCompany!.id).maybeSingle();
      return data ? { warm_after_days: data.warm_after_days, cold_after_days: data.cold_after_days } as CadenceSettings : DEFAULT_CADENCE;
    },
  });

  const { data: deals = [] } = useQuery({
    queryKey: ['crm-deals-people', currentCompany?.id, isCollaborator ? supabaseUser?.id : 'all'],
    enabled: !!currentCompany,
    staleTime: 60_000,
    queryFn: async () => {
      let q = supabase
        .from('crm_pipeline_deals')
        .select('id,title,value,stage_name,pipeline_id,contact_id,expected_close_date,created_at')
        .eq('company_id', currentCompany!.id)
        .not('contact_id', 'is', null)
        .limit(5000);         // safety cap — avoids unbounded fetch
      if (isCollaborator && supabaseUser) {
        q = q.or(`responsible_id.eq.${supabaseUser.id},created_by.eq.${supabaseUser.id}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as { id: string; title: string; value: number; stage_name: string; pipeline_id: string; contact_id: string; expected_close_date: string | null; created_at: string }[];
    },
  });

  const { data: pipelinesMap = {} } = useQuery({
    queryKey: ['crm-pipelines-map', currentCompany?.id],
    enabled: !!currentCompany,
    staleTime: 300_000,
    queryFn: async () => {
      const { data } = await supabase.from('crm_pipelines').select('id,name,stages').eq('company_id', currentCompany!.id);
      const map: Record<string, { name: string; stages: { name: string; probability: number }[] }> = {};
      (data ?? []).forEach((p: any) => { map[p.id] = { name: p.name, stages: Array.isArray(p.stages) ? p.stages : [] }; });
      return map;
    },
  });

  const loading = loadingContacts;

  // ── O(n+m) deals grouping — replaces the O(n²) filter-inside-forEach ─────
  const dealsByContact = useMemo(() => {
    const map: Record<string, typeof deals> = {};
    deals.forEach(d => {
      if (!d.contact_id) return;
      (map[d.contact_id] ??= []).push(d);
    });
    return map;
  }, [deals]);

  // ── Deal metrics — now O(m) total instead of O(n×m) ──────────────────────
  const dealMetricsByContact = useMemo(() => {
    const result: Record<string, {
      totalValue: number; openCount: number; wonCount: number;
      ltv: number; trend: 'up' | 'down' | 'stable'; deals: typeof deals;
    }> = {};

    const now = Date.now();

    Object.entries(dealsByContact).forEach(([contactId, cDeals]) => {
      let wonValue = 0, openValue = 0, openProbSum = 0, openCount = 0, wonCount = 0;
      cDeals.forEach(d => {
        const stage = pipelinesMap[d.pipeline_id]?.stages.find(s => s.name === d.stage_name);
        const prob = stage?.probability ?? 0;
        const isWon  = prob === 100;
        const isLost = prob === 0 && (d.stage_name?.toLowerCase().includes('lost') || d.stage_name?.toLowerCase().includes('perd'));
        if (isWon)       { wonValue  += Number(d.value); wonCount++; }
        else if (!isLost){ openValue += Number(d.value); openProbSum += prob; openCount++; }
      });

      const totalValue  = wonValue + openValue;
      const avgOpenProb = openCount ? openProbSum / openCount / 100 : 0;
      const avgOpenVal  = openCount ? openValue / openCount : 0;
      const ltv         = wonValue + (avgOpenVal * avgOpenProb * openCount);

      const recent = cDeals.filter(d => now - new Date(d.created_at).getTime() < 30 * 86_400_000).reduce((s, d) => s + Number(d.value), 0);
      const prior  = cDeals.filter(d => { const age = now - new Date(d.created_at).getTime(); return age >= 30 * 86_400_000 && age < 60 * 86_400_000; }).reduce((s, d) => s + Number(d.value), 0);
      const trend: 'up' | 'down' | 'stable' = recent > prior * 1.1 ? 'up' : recent < prior * 0.9 ? 'down' : 'stable';

      result[contactId] = { totalValue, openCount: openCount + wonCount, wonCount, ltv, trend, deals: cDeals };
    });
    return result;
  }, [dealsByContact, pipelinesMap]);

  // ── Dynamic temperature ───────────────────────────────────────────────────
  const contactsWithTemp = useMemo(() =>
    contacts.map(c => ({ ...c, temperature: computeTemperature(c.created_at, c.last_interaction_at, cadence) })),
    [contacts, cadence],
  );

  // ── Unique tags ───────────────────────────────────────────────────────────
  const allTags = useMemo(() => {
    const s = new Set<string>();
    contacts.forEach(c => (c.tags ?? []).forEach(tag => s.add(tag)));
    return Array.from(s).sort();
  }, [contacts]);

  // ── Filtering (uses debouncedSearch to avoid per-keystroke recompute) ─────
  const filtered = useMemo(() => {
    let result = contactsWithTemp;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.cpf?.includes(q),
      );
    }
    if (filterTemp   !== 'all') result = result.filter(c => c.temperature === filterTemp);
    if (filterStatus !== 'all') result = result.filter(c => c.status      === filterStatus);
    if (filterOrigin !== 'all') result = result.filter(c => c.origin      === filterOrigin);
    if (filterScoreMin) result = result.filter(c => c.score >= Number(filterScoreMin));
    if (filterScoreMax) result = result.filter(c => c.score <= Number(filterScoreMax));
    if (filterTag)  result = result.filter(c => (c.tags ?? []).includes(filterTag));
    if (filterHasEmail === 'yes') result = result.filter(c =>  !!c.email);
    if (filterHasEmail === 'no')  result = result.filter(c => !c.email);
    if (filterHasPhone === 'yes') result = result.filter(c =>  !!c.phone);
    if (filterHasPhone === 'no')  result = result.filter(c => !c.phone);
    if (filterCreatedFrom)  result = result.filter(c => c.created_at >= filterCreatedFrom);
    if (filterCreatedTo)    result = result.filter(c => c.created_at <= filterCreatedTo + 'T23:59:59');
    if (filterLastInterFrom) result = result.filter(c => c.last_interaction_at && c.last_interaction_at >= filterLastInterFrom);
    if (filterLastInterTo)   result = result.filter(c => c.last_interaction_at && c.last_interaction_at <= filterLastInterTo + 'T23:59:59');
    if (filterPriority !== 'all') result = result.filter(c => (c.custom_fields as any)?.priority === filterPriority);
    if (filterPosition) {
      const q = filterPosition.toLowerCase();
      result = result.filter(c => c.position?.toLowerCase().includes(q));
    }
    return result;
  }, [contactsWithTemp, debouncedSearch, filterTemp, filterStatus, filterOrigin,
      filterScoreMin, filterScoreMax, filterTag, filterHasEmail, filterHasPhone,
      filterCreatedFrom, filterCreatedTo, filterLastInterFrom, filterLastInterTo,
      filterPriority, filterPosition]);

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages   = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage     = Math.min(page, totalPages - 1);
  const paginated    = useMemo(
    () => filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE),
    [filtered, safePage],
  );

  // Reset page when filters change
  const resetPage = () => setPage(0);

  // ── Filter helpers ────────────────────────────────────────────────────────
  const hasBasicFilters    = search || filterTemp !== 'all' || filterStatus !== 'all' || filterOrigin !== 'all';
  const hasAdvancedFilters = filterScoreMin || filterScoreMax || filterTag ||
    filterHasEmail !== 'all' || filterHasPhone !== 'all' ||
    filterCreatedFrom || filterCreatedTo || filterLastInterFrom || filterLastInterTo ||
    filterPriority !== 'all' || filterPosition;
  const hasFilters = hasBasicFilters || hasAdvancedFilters;

  const activeFilterCount = [
    filterTemp !== 'all', filterStatus !== 'all', filterOrigin !== 'all',
    filterScoreMin, filterScoreMax, filterTag,
    filterHasEmail !== 'all', filterHasPhone !== 'all',
    filterCreatedFrom, filterCreatedTo, filterLastInterFrom, filterLastInterTo,
    filterPriority !== 'all', filterPosition,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearch(''); setDebouncedSearch('');
    setFilterTemp('all'); setFilterStatus('all'); setFilterOrigin('all');
    setFilterScoreMin(''); setFilterScoreMax(''); setFilterTag('');
    setFilterHasEmail('all'); setFilterHasPhone('all');
    setFilterCreatedFrom(''); setFilterCreatedTo('');
    setFilterLastInterFrom(''); setFilterLastInterTo('');
    setFilterPriority('all'); setFilterPosition('');
    resetPage();
  };

  // ── Create contact ────────────────────────────────────────────────────────
  const resetForm = () => {
    setFormName(''); setFormCpf(''); setFormEmail(''); setFormPhone('');
    setFormPosition(''); setFormOrigin('other'); setFormTags('');
  };

  const handleCreate = async () => {
    if (!formName.trim() || !currentCompany) return;
    if (formEmail || formCpf || formPhone) {
      const orConds: string[] = [];
      if (formEmail) orConds.push(`email.eq.${formEmail}`);
      if (formCpf)   orConds.push(`cpf.eq.${formCpf}`);
      if (formPhone) orConds.push(`phone.eq.${formPhone}`);
      const { data: dupes } = await supabase
        .from('crm_contacts').select('id,name,email,cpf,phone')
        .eq('company_id', currentCompany.id).or(orConds.join(','));
      if (dupes && dupes.length > 0) {
        toast({ title: t.crm.possibleDuplicate, description: `${t.crm.alreadyExists}: ${dupes[0].name}`, variant: 'destructive' });
        return;
      }
    }
    const tags = formTags ? formTags.split(',').map(s => s.trim()).filter(Boolean) : [];
    const { error } = await supabase.from('crm_contacts').insert({
      company_id: currentCompany.id, name: formName.trim(),
      cpf: formCpf || null, email: formEmail || null,
      phone: formPhone || null, position: formPosition || null,
      origin: formOrigin as any, tags,
      created_by: supabaseUser?.id, responsible_id: supabaseUser?.id,
    });
    if (error) {
      toast({ title: t.crm.errorCreatingContact, variant: 'destructive' });
    } else {
      toast({ title: t.crm.contactCreated });
      setDialogOpen(false);
      resetForm();
      qc.invalidateQueries({ queryKey: ['crm-contacts', currentCompany.id] });
    }
  };

  // ── Bulk actions ──────────────────────────────────────────────────────────
  const toggleSelect  = useCallback((id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);
  const selectAll     = useCallback(() => setSelectedIds(new Set(filtered.map(c => c.id))), [filtered]);
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleBulkDelete = async () => {
    if (!currentCompany || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from('crm_contacts').delete().in('id', ids).eq('company_id', currentCompany.id);
    if (error) toast({ title: t.crm.errorDeletingContacts, variant: 'destructive' });
    else {
      toast({ title: `${ids.length} ${t.crm.contactsDeleted}` });
      clearSelection();
      qc.invalidateQueries({ queryKey: ['crm-contacts', currentCompany.id] });
    }
  };

  const handleBulkStatus = async (status: 'lead' | 'client') => {
    if (!currentCompany || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from('crm_contacts').update({ status }).in('id', ids).eq('company_id', currentCompany.id);
    if (error) toast({ title: t.crm.errorChangingStatus, variant: 'destructive' });
    else {
      toast({ title: `${ids.length} ${t.crm.contactsUpdatedTo} ${status === 'client' ? t.crm.client : 'Lead'}` });
      clearSelection();
      qc.invalidateQueries({ queryKey: ['crm-contacts', currentCompany.id] });
    }
  };

  const columns = [
    { header: 'Nome',       accessor: (r: CRMContact) => r.name },
    { header: 'Status',     accessor: (r: CRMContact) => STATUS_LABELS[r.status] ?? r.status },
    { header: 'Temperatura',accessor: (r: CRMContact) => TEMP_LABELS[r.temperature] ?? r.temperature },
    { header: 'Origem',     accessor: (r: CRMContact) => ORIGIN_LABELS[r.origin] ?? r.origin },
    { header: 'Score',      accessor: (r: CRMContact) => String(r.score) },
    { header: 'E-mail',     accessor: (r: CRMContact) => r.email ?? '' },
    { header: 'Telefone',   accessor: (r: CRMContact) => r.phone ?? '' },
  ];

  const handleBulkExport = () => {
    const selected = filtered.filter(c => selectedIds.has(c.id));
    exportToCSV('crm-pessoas-selecionados', columns, selected);
    toast({ title: `${selected.length} ${t.crm.contactsExported}` });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard label="Total" value={String(contacts.length)} icon={<Users className="w-5 h-5" />} gradient="from-blue-500 to-blue-600" />
          <KPICard label={t.crmPeopleFilters.clients} value={String(contactsWithTemp.filter(c => c.status === 'client').length)} icon={<UserCheck className="w-5 h-5" />} gradient="from-emerald-500 to-emerald-600" />
          <KPICard label="Leads" value={String(contactsWithTemp.filter(c => c.status === 'lead').length)} icon={<UserPlus className="w-5 h-5" />} gradient="from-violet-500 to-violet-600" />
          <KPICard
            label={t.crmPeopleFilters.new30d}
            value={String(contacts.filter(c => { const d = new Date(c.created_at); const ago = new Date(); ago.setDate(ago.getDate() - 30); return d >= ago; }).length)}
            icon={<TrendingUp className="w-5 h-5" />}
            gradient="from-amber-500 to-amber-600"
          />
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
          <Button type="button" size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
            <Plus className="w-3.5 h-3.5" /> {t.crm.newContact}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder={t.crm.searchNameEmailPhoneCpf}
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); resetPage(); }}>
            <SelectTrigger className="w-[120px] h-8 text-sm"><SelectValue placeholder={t.crm.status} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.common.all}</SelectItem>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="client">{t.crm.client}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterTemp} onValueChange={v => { setFilterTemp(v); resetPage(); }}>
            <SelectTrigger className="w-[130px] h-8 text-sm"><SelectValue placeholder={t.crm.temperature} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.crm.allTemps}</SelectItem>
              <SelectItem value="cold">{t.crm.cold}</SelectItem>
              <SelectItem value="warm">{t.crm.warm}</SelectItem>
              <SelectItem value="hot">{t.crm.hot}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterOrigin} onValueChange={v => { setFilterOrigin(v); resetPage(); }}>
            <SelectTrigger className="w-[130px] h-8 text-sm"><SelectValue placeholder={t.crm.origin} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.crm.allOrigins}</SelectItem>
              {Object.entries(ORIGIN_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-sm" onClick={() => setFiltersOpen(v => !v)}>
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
                    <Input type="number" min="0" max="100" value={filterScoreMin} onChange={e => { setFilterScoreMin(e.target.value); resetPage(); }} className="h-8 text-sm" placeholder="0" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t.crmPeopleFilters.scoreMax}</Label>
                    <Input type="number" min="0" max="100" value={filterScoreMax} onChange={e => { setFilterScoreMax(e.target.value); resetPage(); }} className="h-8 text-sm" placeholder="100" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t.crmPeopleFilters.tag}</Label>
                    <Select value={filterTag || 'all'} onValueChange={v => { setFilterTag(v === 'all' ? '' : v); resetPage(); }}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder={t.crmPeopleFilters.allFem} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t.crmPeopleFilters.allFem}</SelectItem>
                        {allTags.map(tag => <SelectItem key={tag} value={tag}>{tag}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t.crmPeopleFilters.priority}</Label>
                    <Select value={filterPriority} onValueChange={v => { setFilterPriority(v); resetPage(); }}>
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
                    <Select value={filterHasEmail} onValueChange={v => { setFilterHasEmail(v); resetPage(); }}>
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
                    <Select value={filterHasPhone} onValueChange={v => { setFilterHasPhone(v); resetPage(); }}>
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
                    <Input value={filterPosition} onChange={e => { setFilterPosition(e.target.value); resetPage(); }} className="h-8 text-sm" placeholder={t.crmPeopleFilters.searchPosition} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t.crmPeopleFilters.createdFrom}</Label>
                    <Input type="date" value={filterCreatedFrom} onChange={e => { setFilterCreatedFrom(e.target.value); resetPage(); }} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t.crmPeopleFilters.createdTo}</Label>
                    <Input type="date" value={filterCreatedTo} onChange={e => { setFilterCreatedTo(e.target.value); resetPage(); }} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t.crmPeopleFilters.lastInterFrom}</Label>
                    <Input type="date" value={filterLastInterFrom} onChange={e => { setFilterLastInterFrom(e.target.value); resetPage(); }} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t.crmPeopleFilters.lastInterTo}</Label>
                    <Input type="date" value={filterLastInterTo} onChange={e => { setFilterLastInterTo(e.target.value); resetPage(); }} className="h-8 text-sm" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Results count */}
      {!loading && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {hasFilters
              ? `${filtered.length} / ${contacts.length} ${t.crm.contactsOf}`
              : `${contacts.length} ${t.crm.contactsOf}`}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Button variant="ghost" size="icon" className="h-6 w-6" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span>{safePage + 1} / {totalPages}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" disabled={safePage >= totalPages - 1} onClick={() => setPage(safePage + 1)}>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex gap-4 items-center">
                <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-48 bg-muted rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
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
            <Button type="button" variant="outline" size="sm" className="mt-4 text-xs" onClick={() => setDialogOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> {t.crm.newContact}
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {paginated.map(c => (
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
          {totalPages > 1 && <PaginationBar page={safePage} totalPages={totalPages} onPage={setPage} />}
        </>
      ) : (
        <>
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
                  {paginated.map(c => {
                    const m = dealMetricsByContact[c.id] || { totalValue: 0, openCount: 0, wonCount: 0, ltv: 0, trend: 'stable' as const, deals: [] };
                    const totalValueColor = m.totalValue > 5000 ? 'text-green-600 font-bold' : m.totalValue >= 1000 ? 'text-amber-600 font-semibold' : 'text-muted-foreground';
                    const ltvColor = m.ltv > 10000 ? 'text-amber-500 font-bold' : m.ltv >= 5000 ? 'text-green-600 font-bold' : m.ltv >= 1000 ? 'text-blue-600 font-semibold' : 'text-muted-foreground';
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
                          {c.last_interaction_at
                            ? new Date(c.last_interaction_at).toLocaleDateString(language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'pt-BR')
                            : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
          {totalPages > 1 && <PaginationBar page={safePage} totalPages={totalPages} onPage={setPage} />}
        </>
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
            if (!m || m.deals.length === 0) return <p className="text-sm text-muted-foreground py-4">{t.crmDetail.noDealsLinked}</p>;
            return (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {m.deals.map(d => {
                  const stage = pipelinesMap[d.pipeline_id]?.stages.find(s => s.name === d.stage_name);
                  const prob  = stage?.probability ?? 0;
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

      <ImportContactsDialog open={importOpen} onOpenChange={setImportOpen} onSuccess={() => qc.invalidateQueries({ queryKey: ['crm-contacts', currentCompany?.id] })} />
    </div>
  );
}

// ── Pagination bar ─────────────────────────────────────────────────────────
function PaginationBar({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-2 pt-2">
      <Button variant="outline" size="sm" className="h-7 px-2" disabled={page === 0} onClick={() => onPage(0)}>
        <ChevronLeft className="w-3.5 h-3.5" /><ChevronLeft className="w-3.5 h-3.5 -ml-2" />
      </Button>
      <Button variant="outline" size="sm" className="h-7 px-2" disabled={page === 0} onClick={() => onPage(page - 1)}>
        <ChevronLeft className="w-3.5 h-3.5" />
      </Button>
      <span className="text-xs text-muted-foreground px-2">{page + 1} / {totalPages}</span>
      <Button variant="outline" size="sm" className="h-7 px-2" disabled={page >= totalPages - 1} onClick={() => onPage(page + 1)}>
        <ChevronRight className="w-3.5 h-3.5" />
      </Button>
      <Button variant="outline" size="sm" className="h-7 px-2" disabled={page >= totalPages - 1} onClick={() => onPage(totalPages - 1)}>
        <ChevronRight className="w-3.5 h-3.5" /><ChevronRight className="w-3.5 h-3.5 -ml-2" />
      </Button>
    </div>
  );
}
