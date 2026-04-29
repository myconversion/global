import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CheckSquare, Search, CalendarIcon, AlertTriangle,
  Phone, Mail, MessageCircle, MapPin, X, Filter, Users, Building2, ListTodo, Clock, Target, List, CalendarDays
} from 'lucide-react';
import { KPICard } from '@/components/shared/KPICard';
import { EmptyState } from '@/components/shared/EmptyState';
import { TableSkeleton } from '@/components/shared/TableSkeleton';
import { cn } from '@/lib/utils';
import { format, isPast, isToday } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { getDateLocale } from '@/i18n/date-locale';
import { supabase } from '@/integrations/supabase/client';
import CRMTasksCalendarView from '@/components/crm/CRMTasksCalendarView';

interface CRMFollowup {
  id: string;
  type: string;
  description: string | null;
  scheduled_at: string;
  is_completed: boolean;
  completed_at: string | null;
  contact_id: string | null;
  crm_company_id: string | null;
  deal_id: string | null;
  assigned_to: string | null;
}

const FOLLOWUP_TYPE_ICONS: Record<string, React.ElementType> = {
  call: Phone, email: Mail, meeting: Users, visit: MapPin,
  whatsapp: MessageCircle, task: CheckSquare, other: CheckSquare,
};

export default function CRMTasksPage() {
  const navigate = useNavigate();
  const { currentCompany } = useAuth();
  const { t, language } = useI18n();
  const dateLocale = getDateLocale(language);

  const FOLLOWUP_TYPE_LABELS: Record<string, string> = {
    call: t.crm.call,
    email: t.crm.email,
    meeting: t.crm.meeting,
    visit: t.crm.visit,
    whatsapp: 'WhatsApp',
    task: t.crm.crmTasks,
    other: t.crm.other,
  };

  const [followups, setFollowups] = useState<CRMFollowup[]>([]);
  const [contacts, setContacts] = useState<Record<string, string>>({});
  const [companies, setCompanies] = useState<Record<string, string>>({});
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  useEffect(() => {
    if (!currentCompany) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase.from('crm_followups').select('*').eq('company_id', currentCompany.id).order('scheduled_at', { ascending: true });
      if (data) {
        setFollowups(data);
        const contactIds = [...new Set(data.map(f => f.contact_id).filter(Boolean))] as string[];
        const companyIds = [...new Set(data.map(f => f.crm_company_id).filter(Boolean))] as string[];
        const assigneeIds = [...new Set(data.map(f => f.assigned_to).filter(Boolean))] as string[];
        if (contactIds.length > 0) {
          const { data: c } = await supabase.from('crm_contacts').select('id, name').in('id', contactIds);
          if (c) { const m: Record<string, string> = {}; c.forEach(x => { m[x.id] = x.name; }); setContacts(m); }
        }
        if (companyIds.length > 0) {
          const { data: c } = await supabase.from('crm_companies').select('id, razao_social').in('id', companyIds);
          if (c) { const m: Record<string, string> = {}; c.forEach(x => { m[x.id] = x.razao_social; }); setCompanies(m); }
        }
        if (assigneeIds.length > 0) {
          const { data: p } = await supabase.from('profiles').select('user_id, name').in('user_id', assigneeIds);
          if (p) { const m: Record<string, string> = {}; p.forEach(x => { m[x.user_id] = x.name; }); setProfiles(m); }
        }
      }
      setLoading(false);
    };
    fetch();
  }, [currentCompany]);

  const isOverdue = (f: CRMFollowup) => {
    if (f.is_completed) return false;
    const due = new Date(f.scheduled_at);
    return isPast(due) && !isToday(due);
  };

  const filtered = useMemo(() => {
    return followups.filter(f => {
      if (search) {
        const desc = (f.description || '').toLowerCase();
        const contactName = (f.contact_id ? contacts[f.contact_id] : '').toLowerCase();
        const companyName = (f.crm_company_id ? companies[f.crm_company_id] : '').toLowerCase();
        if (!desc.includes(search.toLowerCase()) && !contactName.includes(search.toLowerCase()) && !companyName.includes(search.toLowerCase())) return false;
      }
      if (typeFilter !== 'all' && f.type !== typeFilter) return false;
      if (statusFilter === 'pending' && f.is_completed) return false;
      if (statusFilter === 'completed' && !f.is_completed) return false;
      return true;
    });
  }, [followups, search, typeFilter, statusFilter, contacts, companies]);

  const counters = useMemo(() => ({
    total: followups.length,
    pending: followups.filter(f => !f.is_completed).length,
    completed: followups.filter(f => f.is_completed).length,
    overdue: followups.filter(f => isOverdue(f)).length,
  }), [followups]);

  const toggleComplete = async (f: CRMFollowup) => {
    const newCompleted = !f.is_completed;
    await supabase.from('crm_followups').update({ is_completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null }).eq('id', f.id);
    setFollowups(prev => prev.map(x => x.id === f.id ? { ...x, is_completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null } : x));
  };

  const hasFilters = search || typeFilter !== 'all' || statusFilter !== 'pending';
  const clearFilters = () => { setSearch(''); setTypeFilter('all'); setStatusFilter('pending'); };

  return (
    <div>
      <PageHeader
        title={t.crm.crmTasks}
        description={t.crm.crmTasksDesc}
        icon={<CheckSquare className="w-5 h-5 text-primary" />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label={t.crm.total} value={String(counters.total)} tooltip={t.crm.totalFollowupsTooltip} icon={<ListTodo className="w-5 h-5" />} gradient="from-blue-500 to-blue-600" sparkline />
        <KPICard label={t.crm.pending} value={String(counters.pending)} tooltip={t.crm.pendingTooltip} icon={<Clock className="w-5 h-5" />} gradient="from-amber-500 to-orange-500" sparkline />
        <KPICard label={t.crm.completed} value={String(counters.completed)} tooltip={t.crm.completedTooltip} icon={<CheckSquare className="w-5 h-5" />} gradient="from-emerald-500 to-emerald-600" sparkline />
        <KPICard label={counters.overdue > 0 ? t.crm.overdue : t.crm.onTime} value={String(counters.overdue > 0 ? counters.overdue : counters.pending)} tooltip={counters.overdue > 0 ? t.crm.overdueTooltip : t.crm.onTimeTooltip} icon={counters.overdue > 0 ? <AlertTriangle className="w-5 h-5" /> : <Target className="w-5 h-5" />} gradient={counters.overdue > 0 ? 'from-red-500 to-rose-600' : 'from-violet-500 to-purple-600'} sparkline />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t.crm.searchTasks} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
            <SelectValue placeholder={t.crm.type} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.crm.allTypes}</SelectItem>
            {Object.entries(FOLLOWUP_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* View mode toggle */}
        <div className="flex items-center border rounded-md overflow-hidden">
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-none h-9 px-3 gap-1.5"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">{t.crm.listViewLabel}</span>
          </Button>
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-none h-9 px-3 gap-1.5"
            onClick={() => setViewMode('calendar')}
          >
            <CalendarDays className="w-4 h-4" />
            <span className="hidden sm:inline">{t.crm.calendarViewLabel}</span>
          </Button>
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="w-3.5 h-3.5 mr-1" /> {t.crm.clear}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <KPICard key={i} label="" value="" loading sparkline />)}
          </div>
          <TableSkeleton columns={5} rows={6} />
        </div>
      ) : viewMode === 'calendar' ? (
        <CRMTasksCalendarView
          followups={filtered}
          typeLabels={FOLLOWUP_TYPE_LABELS}
          contacts={contacts}
          companies={companies}
          onToggleComplete={toggleComplete}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<CheckSquare className="w-9 h-9 text-muted-foreground/60" />}
          title={followups.length === 0 ? t.crm.noCrmTasks : t.crm.noResults}
          description={followups.length === 0 ? t.crm.createFollowupsToSee : t.crm.adjustFilters}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(f => {
            const overdue = isOverdue(f);
            const Icon = FOLLOWUP_TYPE_ICONS[f.type] || CheckSquare;
            const contactName = f.contact_id ? contacts[f.contact_id] : null;
            const companyName = f.crm_company_id ? companies[f.crm_company_id] : null;
            const assigneeName = f.assigned_to ? profiles[f.assigned_to] : null;

            return (
              <Card key={f.id} className={cn("hover:shadow-sm transition-shadow", overdue && "border-destructive/40")}>
                <CardContent className="p-4 flex items-center gap-4">
                  <button onClick={() => toggleComplete(f)} className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors", f.is_completed ? "bg-success border-success" : "border-muted-foreground/30 hover:border-primary")}>
                    {f.is_completed && <CheckSquare className="w-3 h-3 text-success-foreground" />}
                  </button>
                  <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium truncate", f.is_completed && "line-through text-muted-foreground")}>
                      {f.description || FOLLOWUP_TYPE_LABELS[f.type] || 'Follow-up'}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      {contactName && (
                        <span className="hover:text-primary cursor-pointer flex items-center gap-1" onClick={() => navigate(`/crm/people/${f.contact_id}`)}>
                          <Users className="w-3 h-3" /> {contactName}
                        </span>
                      )}
                      {companyName && (
                        <span className="hover:text-primary cursor-pointer flex items-center gap-1" onClick={() => navigate(`/crm/companies/${f.crm_company_id}`)}>
                          <Building2 className="w-3 h-3" /> {companyName}
                        </span>
                      )}
                      {assigneeName && <span className="text-muted-foreground">{assigneeName}</span>}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                    {FOLLOWUP_TYPE_LABELS[f.type] || f.type}
                  </Badge>
                  <span className={cn("text-xs shrink-0 flex items-center gap-1", overdue ? "text-destructive font-medium" : "text-muted-foreground")}>
                    {overdue && <AlertTriangle className="w-3 h-3" />}
                    <CalendarIcon className="w-3 h-3" />
                    {format(new Date(f.scheduled_at), "dd MMM HH:mm", { locale: dateLocale })}
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}