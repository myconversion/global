import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Target, DollarSign, TrendingUp, CalendarCheck, Flame, Filter,
  Plus, ArrowUpRight, ArrowDownRight, Users, Building2, ChevronRight,
  CalendarIcon, UserCircle, UserPlus, CheckCircle2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { getDateLocale } from '@/i18n/date-locale';
import { withBuFilter } from '@/lib/bu-filter';
import { formatCurrency } from '@/components/crm/crm-utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LabelList
} from 'recharts';
import { cn } from '@/lib/utils';
import { InfoTooltip } from '@/components/shared/InfoTooltip';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { DateRange } from 'react-day-picker';

interface Pipeline {
  id: string;
  name: string;
  stages: { name: string; probability: number; order: number }[];
}

interface TeamMember {
  user_id: string;
  name: string;
}

interface DashboardData {
  openDeals: number;
  pipelineTotal: number;
  conversionRate: number;
  followupsCount: number;
  wonCount: number;
  lostCount: number;
  leadsGenerated: number;
  dealsClosed: number;
  totalContacts: number;
  totalCompanies: number;
  funnelData: { stage: string; count: number; value: number; fill: string }[];
  statusData: { name: string; value: number; fill: string }[];
  topLeads: { id: string; name: string; score: number; temperature: string | null }[];
}

const FUNNEL_COLORS = [
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#EC4899', '#F43F5E',
];

const STATUS_COLORS = {
  won: '#10B981',
  open: '#3B82F6',
  lost: '#EF4444',
};

export default function CRMDashboardPage() {
  const { currentCompany, currentBusinessUnit } = useAuth();
  const { t, language } = useI18n();
  const dateLocale = getDateLocale(language);
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('all');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  useEffect(() => {
    if (!currentCompany) return;
    const fetchTeam = async () => {
      const { data: memberships } = await supabase
        .from('company_memberships')
        .select('user_id')
        .eq('company_id', currentCompany.id);
      if (!memberships) return;
      const userIds = memberships.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name')
        .in('user_id', userIds);
      setTeamMembers((profiles ?? []).map(p => ({ user_id: p.user_id, name: p.name })));
    };
    fetchTeam();
  }, [currentCompany]);

  useEffect(() => {
    if (!currentCompany) return;
    const companyId = currentCompany.id;
    const buId = currentBusinessUnit?.id;
    const fromDate = dateRange?.from ? startOfDay(dateRange.from).toISOString() : undefined;
    const toDate = dateRange?.to ? endOfDay(dateRange.to).toISOString() : undefined;

    const fetchAll = async () => {
      setLoading(true);

      // Deals are NOT date-filtered — KPIs always reflect all deals in the pipeline
      let dealsQuery = withBuFilter(supabase.from('crm_pipeline_deals').select('id, pipeline_id, stage_name, value, responsible_id, created_at').eq('company_id', companyId), buId);
      let followupsQuery = supabase.from('crm_followups').select('id, assigned_to, scheduled_at').eq('company_id', companyId).eq('is_completed', false);
      let contactsQuery = withBuFilter(supabase.from('crm_contacts').select('id, name, score, temperature, created_at, responsible_id').eq('company_id', companyId), buId);

      if (fromDate) {
        followupsQuery = followupsQuery.gte('scheduled_at', fromDate);
        contactsQuery = contactsQuery.gte('created_at', fromDate);
      }
      if (toDate) {
        followupsQuery = followupsQuery.lte('scheduled_at', toDate);
        contactsQuery = contactsQuery.lte('created_at', toDate);
      }

      if (selectedUserId !== 'all') {
        dealsQuery = dealsQuery.eq('responsible_id', selectedUserId);
        followupsQuery = followupsQuery.eq('assigned_to', selectedUserId);
        contactsQuery = contactsQuery.eq('responsible_id', selectedUserId);
      }

      const [
        { data: pipelineDeals },
        { data: pipelinesData },
        { data: followups },
        { data: contacts },
        { count: totalContactsCount },
        { count: totalCompaniesCount },
      ] = await Promise.all([
        dealsQuery,
        supabase.from('crm_pipelines').select('id, name, stages').eq('company_id', companyId),
        followupsQuery,
        contactsQuery.order('score', { ascending: false }).limit(5),
        supabase.from('crm_contacts').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('crm_companies').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      ]);

      const allDeals = pipelineDeals ?? [];
      const allPipelines = (pipelinesData ?? []) as any[];
      setPipelines(allPipelines.map((p: any) => ({ id: p.id, name: p.name, stages: p.stages ?? [] })));

      const filteredDeals = selectedPipelineId === 'all'
        ? allDeals
        : allDeals.filter(d => d.pipeline_id === selectedPipelineId);

      let wonCount = 0;
      let lostCount = 0;
      let openCount = 0;
      let pipelineTotal = 0;

      const stageMap = new Map<string, { count: number; value: number; order: number }>();

      for (const deal of filteredDeals) {
        const pipeline = allPipelines.find((p: any) => p.id === deal.pipeline_id);
        const stages = (pipeline?.stages ?? []) as { name: string; probability: number; order: number }[];
        const stageInfo = stages.find(s => s.name === deal.stage_name);
        const prob = stageInfo?.probability ?? 50;

        if (prob === 100) { wonCount++; }
        else if (prob === 0) { lostCount++; }
        else {
          openCount++;
          pipelineTotal += deal.value;
        }

        const existing = stageMap.get(deal.stage_name) ?? { count: 0, value: 0, order: stageInfo?.order ?? 99 };
        existing.count++;
        existing.value += deal.value;
        stageMap.set(deal.stage_name, existing);
      }

      // Conversion Rate = won / (won + lost) — excludes open deals still in pipeline
      const closedDeals = wonCount + lostCount;
      const conversionRate = closedDeals > 0 ? Math.round((wonCount / closedDeals) * 1000) / 10 : 0;

      const funnelData = Array.from(stageMap.entries())
        .sort((a, b) => a[1].order - b[1].order)
        .map(([stage, info], i) => ({
          stage,
          count: info.count,
          value: info.value,
          fill: FUNNEL_COLORS[i % FUNNEL_COLORS.length],
        }));

      const statusData = [
        { name: t.crm.statusWon, value: wonCount, fill: STATUS_COLORS.won },
        { name: t.crm.statusOpen, value: openCount, fill: STATUS_COLORS.open },
        { name: t.crm.statusLost, value: lostCount, fill: STATUS_COLORS.lost },
      ].filter(d => d.value > 0);

      const leadsGenerated = contacts?.length ?? 0;
      const dealsClosed = wonCount + lostCount;

      setData({
        openDeals: openCount,
        pipelineTotal,
        conversionRate,
        followupsCount: followups?.length ?? 0,
        wonCount,
        lostCount,
        leadsGenerated,
        dealsClosed,
        totalContacts: totalContactsCount ?? 0,
        totalCompanies: totalCompaniesCount ?? 0,
        funnelData,
        statusData,
        topLeads: (contacts ?? []).map((c: any) => ({ id: c.id, name: c.name, score: c.score, temperature: c.temperature })),
      });
      setLoading(false);
    };

    fetchAll();
  }, [currentCompany, currentBusinessUnit, selectedPipelineId, selectedUserId, dateRange, t]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!data) return null;

  const totalDeals = data.openDeals + data.wonCount + data.lostCount;

  const tempColor: Record<string, string> = {
    hot: 'text-red-500',
    warm: 'text-orange-500',
    cold: 'text-blue-500',
  };

  const dateLabel = dateRange?.from
    ? dateRange.to
      ? `${format(dateRange.from, 'dd/MM', { locale: dateLocale })} - ${format(dateRange.to, 'dd/MM', { locale: dateLocale })}`
      : format(dateRange.from, 'dd/MM/yyyy', { locale: dateLocale })
    : t.crm.selectPeriod;

  const kpis = [
    {
      icon: Target,
      label: t.crm.openDeals,
      tooltip: t.crm.openDealsTooltip,
      value: String(data.openDeals),
      subtitle: `${totalDeals} ${t.crm.totalInPipeline}`,
      gradient: 'from-blue-500 to-blue-600',
      link: '/crm/pipeline',
    },
    {
      icon: DollarSign,
      label: t.crm.pipelineTotal,
      tooltip: t.crm.pipelineTotalTooltip,
      value: formatCurrency(data.pipelineTotal, language),
      subtitle: t.crm.valueInNegotiation,
      gradient: 'from-emerald-500 to-emerald-600',
      link: '/crm/pipeline',
    },
    {
      icon: TrendingUp,
      label: t.crm.conversionRate,
      tooltip: t.crm.conversionRateTooltip,
      value: `${data.conversionRate}%`,
      subtitle: `${data.wonCount} ${data.wonCount !== 1 ? t.crm.wonPlural : t.crm.won}`,
      gradient: 'from-amber-500 to-orange-500',
      link: '/crm/pipeline?filter=won',
    },
    {
      icon: CalendarCheck,
      label: t.crm.followups,
      tooltip: t.crm.followupsTooltip,
      value: String(data.followupsCount),
      subtitle: t.crm.inSelectedPeriod,
      gradient: 'from-rose-500 to-pink-500',
      link: '/crm/followups',
    },
    {
      icon: UserPlus,
      label: t.crm.leadsGenerated,
      tooltip: t.crm.leadsGeneratedTooltip,
      value: String(data.leadsGenerated),
      subtitle: t.crm.contactsCreatedInPeriod,
      gradient: 'from-violet-500 to-purple-600',
      link: '/crm/people',
    },
    {
      icon: CheckCircle2,
      label: t.crm.dealsClosed,
      tooltip: t.crm.dealsClosedTooltip,
      value: String(data.dealsClosed),
      subtitle: `${data.wonCount} ${t.crm.wonDeals} · ${data.lostCount} ${t.crm.lostDeals}`,
      gradient: 'from-teal-500 to-cyan-600',
      link: '/crm/pipeline?filter=won',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span>CRM</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium">{t.crm.dashboardTitle}</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{t.crm.dashboardTitle}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t.crm.dashboardDesc}</p>
        </div>

        {/* Global Filters Bar */}
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-border/60 bg-card" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Filter className="w-3.5 h-3.5" /> {t.crm.filters}:
          </div>

          <Select value={selectedPipelineId} onValueChange={setSelectedPipelineId}>
            <SelectTrigger className="w-[180px] h-8 text-xs bg-background">
              <SelectValue placeholder={t.crm.allPipelines} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.crm.allPipelines}</SelectItem>
              {pipelines.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5" />
                {dateLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                locale={dateLocale}
                className={cn("p-3 pointer-events-auto")}
              />
              <div className="flex items-center gap-2 px-3 pb-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })}
                >
                  {t.crm.thisMonth}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    const now = new Date();
                    setDateRange({ from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: new Date(now.getFullYear(), now.getMonth(), 0) });
                  }}
                >
                  {t.crm.lastMonth}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => setDateRange(undefined)}
                >
                  {t.crm.clear}
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="w-[180px] h-8 text-xs bg-background">
              <UserCircle className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder={t.crm.allUsers} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.crm.allUsers}</SelectItem>
              {teamMembers.map(m => (
                <SelectItem key={m.user_id} value={m.user_id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map(kpi => {
          const Icon = kpi.icon;
          return (
            <Card
              key={kpi.label}
              onClick={() => kpi.link && navigate(kpi.link)}
              className={cn(
                "group transition-all duration-200 border border-border/60",
                kpi.link && "cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40"
              )}
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className={cn(
                    "w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm",
                    kpi.gradient
                  )}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">{kpi.label} <InfoTooltip text={kpi.tooltip} /></p>
                <p className="text-2xl font-extrabold text-foreground mt-1 tracking-tight truncate">{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{kpi.subtitle}</p>
                <div className="mt-3 h-6 flex items-end gap-[2px]">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      className={cn("flex-1 rounded-sm bg-gradient-to-t opacity-40 group-hover:opacity-60 transition-opacity", kpi.gradient)}
                      style={{ height: `${Math.max(15, Math.random() * 100)}%` }}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <QuickStat icon={Users} label={t.crm.contactsTotal} value={data.totalContacts} />
        <QuickStat icon={Building2} label={t.crm.companiesTotal} value={data.totalCompanies} />
        <QuickStat icon={Target} label={t.crm.dealsWon} value={data.wonCount} />
        <QuickStat icon={TrendingUp} label={t.crm.dealsLost} value={data.lostCount} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1">{t.crm.salesFunnel} <InfoTooltip text={t.crm.salesFunnelTooltip} /></CardTitle>
            <p className="text-xs text-muted-foreground">{t.crm.leadsByStage}</p>
          </CardHeader>
          <CardContent>
            {data.funnelData.length === 0 ? (
              <EmptyState
                title={t.crm.noDealsFound}
                description={t.crm.createFirstDeal}
                actionLabel={t.crm.createDeal}
                onAction={() => navigate('/crm/pipeline')}
              />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.funnelData} layout="vertical" margin={{ top: 5, right: 50, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis dataKey="stage" type="category" width={110} tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === 'count') return [value, t.crm.deals];
                      return [value, name];
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={24}>
                    {data.funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                    <LabelList dataKey="count" position="right" formatter={(v: number) => `${v} ${v !== 1 ? t.crm.leads : t.crm.lead}`} style={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">{t.crm.conversionStatus}</CardTitle>
            <p className="text-xs text-muted-foreground">{t.crm.resultDistribution}</p>
          </CardHeader>
          <CardContent>
            {data.statusData.length === 0 ? (
              <EmptyState
                title={t.crm.noData}
                description={t.crm.closeLoseToSee}
              />
            ) : (
              <div className="relative">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={data.statusData}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {data.statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => <span className="text-xs text-muted-foreground ml-1">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center" style={{ pointerEvents: 'none', paddingBottom: 50 }}>
                  <div className="text-center">
                    <p className="text-3xl font-extrabold text-foreground">{totalDeals}</p>
                    <p className="text-[10px] font-medium text-muted-foreground">{t.crm.totalLeads}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Value by Stage */}
      <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">{t.crm.valueByStage}</CardTitle>
          <p className="text-xs text-muted-foreground">{t.crm.financialDistribution}</p>
        </CardHeader>
        <CardContent>
          {data.funnelData.length === 0 ? (
            <EmptyState
              title={t.crm.noDealsFound}
              description={t.crm.createDealsToSeeValues}
              actionLabel={t.crm.goToPipeline}
              onAction={() => navigate('/crm/pipeline')}
            />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.funnelData} layout="vertical" margin={{ top: 5, right: 80, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v) => formatCurrency(v, language)}
                />
                <YAxis dataKey="stage" type="category" width={110} tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                  formatter={(value: number) => [formatCurrency(value, language), t.crm.value]}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={24}>
                  {data.funnelData.map((entry, index) => (
                    <Cell key={`val-${index}`} fill={entry.fill} />
                  ))}
                  <LabelList dataKey="value" position="right" formatter={(v: number) => formatCurrency(v, language)} style={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top Leads */}
      <Card style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">{t.crm.topLeadsByScore}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{t.crm.highestScoreContacts}</p>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => navigate('/crm/people')}>
              {t.crm.viewAll} <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {data.topLeads.length === 0 ? (
            <EmptyState
              title={t.crm.noContactsRegistered}
              description={t.crm.addContactsToTrack}
              actionLabel={t.crm.addContact}
              onAction={() => navigate('/crm/people')}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {data.topLeads.map((lead, i) => (
                <div
                  key={lead.id}
                  className="flex items-center gap-3 p-3.5 rounded-xl border border-border/60 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 cursor-pointer"
                  onClick={() => navigate(`/crm/people/${lead.id}`)}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{lead.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-bold text-foreground">{lead.score} {t.crm.pts}</span>
                      {lead.temperature && (
                        <span className={cn("text-xs capitalize flex items-center gap-0.5", tempColor[lead.temperature] ?? 'text-muted-foreground')}>
                          <Flame className="w-3 h-3" />{lead.temperature}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          className="rounded-full w-14 h-14 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 bg-gradient-to-br from-primary to-blue-600"
          onClick={() => navigate('/crm/pipeline')}
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}

function QuickStat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div
      className="flex items-center gap-3 p-3.5 rounded-xl border border-border/60 bg-card"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
    >
      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-lg font-extrabold text-foreground">{value}</p>
        <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
      </div>
    </div>
  );
}

function EmptyState({ title, description, actionLabel, onAction }: {
  title: string; description: string; actionLabel?: string; onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="mb-4 opacity-30">
        <rect x="10" y="20" width="60" height="45" rx="8" stroke="currentColor" strokeWidth="2" className="text-muted-foreground" />
        <path d="M10 32h60" stroke="currentColor" strokeWidth="2" className="text-muted-foreground" />
        <rect x="18" y="40" width="18" height="4" rx="2" fill="currentColor" className="text-muted-foreground" />
        <rect x="18" y="48" width="12" height="4" rx="2" fill="currentColor" className="text-muted-foreground" />
        <rect x="44" y="40" width="18" height="4" rx="2" fill="currentColor" className="text-muted-foreground" />
        <rect x="44" y="48" width="12" height="4" rx="2" fill="currentColor" className="text-muted-foreground" />
        <circle cx="62" cy="18" r="12" fill="currentColor" className="text-primary" fillOpacity="0.15" />
        <path d="M58 18l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary" />
      </svg>
      <h3 className="text-sm font-semibold text-muted-foreground mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground/70 max-w-[220px]">{description}</p>
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" className="mt-4 text-xs" onClick={onAction}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-8 w-48 mb-1" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="border border-border/60">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <Skeleton className="w-11 h-11 rounded-xl" />
              </div>
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-7 w-28 mb-1" />
              <Skeleton className="h-3 w-24 mb-3" />
              <Skeleton className="h-6 w-full rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="h-[340px] rounded-lg lg:col-span-2" />
        <Skeleton className="h-[340px] rounded-lg" />
      </div>
    </div>
  );
}
