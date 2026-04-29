import { useMemo, useEffect, useState, useCallback } from 'react';
import { InfoTooltip } from '@/components/shared/InfoTooltip';
import { WelcomeGreeting } from '@/components/shared/WelcomeGreeting';
import { Link, Navigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  LayoutDashboard, Users, FolderKanban, DollarSign, TrendingUp,
  Clock, CheckCircle2, AlertTriangle, ArrowUpRight, ArrowDownRight,
  BarChart3, Target, ChevronRight, Settings2, GripVertical, RotateCcw
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { useProjectsContext } from '@/contexts/ProjectsContext';
import { useFinancial } from '@/contexts/FinancialContext';
import { TASK_STATUS_LABELS } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { cn } from '@/lib/utils';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useDashboardPreferences, ALL_WIDGETS, WidgetId } from '@/hooks/useDashboardPreferences';
import { getDateFnsLocaleString } from '@/i18n/date-locale';
import type { SupportedLanguage } from '@/i18n';
import { formatCurrency, formatCurrencyCompact } from '@/lib/format-utils';

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

interface PipelineDeal {
  id: string;
  value: number;
  stage_name: string;
  pipeline_id: string;
}

interface PipelineStage {
  name: string;
  probability: number;
}

export default function DashboardPage() {
  const { currentCompany, role } = useAuth();
  const { t, language } = useI18n();
  const localeStr = getDateFnsLocaleString(language);
  const lang = language;
  const { projects, tasks, activityLogs, getProjectProgress } = useProjectsContext();
  const { kpis, transactions } = useFinancial();
  const [loading, setLoading] = useState(true);
  const { widgetOrder, hiddenWidgets, loaded, reorder, toggleWidget, resetDefaults } = useDashboardPreferences();
  const [pipelineDeals, setPipelineDeals] = useState<PipelineDeal[]>([]);
  const [pipelines, setPipelines] = useState<{ id: string; name: string; stages: PipelineStage[] }[]>([]);

  const WIDGET_LABELS_I18N: Record<WidgetId, string> = {
    kpi_cards: t.dashboard.kpiSummary,
    cash_flow: t.dashboard.widgetCashFlow,
    pipeline_crm: t.dashboard.widgetPipelineCRM,
    revenue_expense: t.dashboard.widgetRevenueExpense,
    task_distribution: t.dashboard.widgetTaskDistribution,
    upcoming_tasks: t.dashboard.widgetUpcomingTasks,
    project_progress: t.dashboard.widgetProjectProgress,
    recent_activity: t.dashboard.widgetRecentActivity,
  };

  useEffect(() => {
    if (!currentCompany) return;
    const companyId = currentCompany.id;
    Promise.all([
      supabase.from('crm_pipeline_deals').select('id, value, stage_name, pipeline_id').eq('company_id', companyId),
      supabase.from('crm_pipelines').select('id, name, stages').eq('company_id', companyId),
    ]).then(([{ data: deals }, { data: pipes }]) => {
      setPipelineDeals((deals ?? []) as PipelineDeal[]);
      setPipelines((pipes ?? []).map((p: any) => ({ id: p.id, name: p.name, stages: (p.stages ?? []) as PipelineStage[] })));
      setLoading(false);
    });
  }, [currentCompany]);

  const activeProjects = projects.filter(p => p.status === 'active');
  const pendingTasks = tasks.filter(t => t.status !== 'done');
  const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done');

  const { openDeals, pipelineValue, winRate } = useMemo(() => {
    let openCount = 0;
    let totalValue = 0;
    let wonCount = 0;
    let lostCount = 0;
    for (const deal of pipelineDeals) {
      const pipeline = pipelines.find(p => p.id === deal.pipeline_id);
      const stageInfo = pipeline?.stages.find(s => s.name === deal.stage_name);
      const prob = stageInfo?.probability ?? 50;
      if (prob === 100) wonCount++;
      else if (prob === 0) lostCount++;
      else { openCount++; totalValue += deal.value; }
    }
    const total = wonCount + lostCount;
    return {
      openDeals: openCount,
      pipelineValue: totalValue,
      winRate: total > 0 ? Math.round((wonCount / total) * 100) : 0,
    };
  }, [pipelineDeals, pipelines]);

  const summaryCards = [
    {
      label: t.dashboard.pipelineCRM,
      tooltip: t.dashboard.pipelineTooltip,
      value: formatCurrencyCompact(pipelineValue, lang),
      rawValue: pipelineValue,
      sub: `${openDeals} ${t.dashboard.openDeals}`,
      icon: Users,
      gradient: 'from-blue-500 to-blue-600',
      trend: null as string | null,
      trendUp: true,
      link: '/crm/pipeline',
    },
    {
      label: t.dashboard.activeProjects,
      tooltip: t.dashboard.activeProjectsTooltip,
      value: String(activeProjects.length),
      rawValue: activeProjects.length,
      sub: `${tasks.filter(t => t.status === 'done').length} ${t.dashboard.tasksCompleted}`,
      icon: FolderKanban,
      gradient: 'from-emerald-500 to-emerald-600',
      trend: activeProjects.length > 0 ? `${activeProjects.length}` : null,
      trendUp: true,
      link: '/projects',
    },
    {
      label: t.dashboard.revenueMonth,
      tooltip: t.dashboard.revenueMonthTooltip,
      value: formatCurrencyCompact(kpis.totalIncome, lang),
      rawValue: kpis.totalIncome,
      sub: `${t.dashboard.profit}: ${formatCurrencyCompact(kpis.netProfit, lang)}`,
      icon: DollarSign,
      gradient: 'from-amber-500 to-orange-500',
      trend: null,
      trendUp: true,
      link: '/financial',
    },
    {
      label: t.dashboard.pendingTasks,
      tooltip: t.dashboard.pendingTasksTooltip,
      value: String(pendingTasks.length),
      rawValue: pendingTasks.length,
      sub: overdueTasks.length > 0 ? `${overdueTasks.length} ${t.dashboard.overdue}` : t.dashboard.noneOverdue,
      icon: Clock,
      gradient: 'from-rose-500 to-pink-500',
      trend: overdueTasks.length > 0 ? `-${overdueTasks.length}` : null,
      trendUp: overdueTasks.length === 0,
      alert: overdueTasks.length > 0,
      link: '/my-tasks',
    },
  ];

  const categoryData = useMemo(() => {
    const cats: Record<string, { income: number; expense: number }> = {};
    transactions.forEach(tx => {
      if (!cats[tx.category]) cats[tx.category] = { income: 0, expense: 0 };
      cats[tx.category][tx.type] += tx.value;
    });
    return Object.entries(cats).map(([name, v]) => ({ name, ...v })).slice(0, 6);
  }, [transactions]);

  const pipelineData = useMemo(() => {
    const stageMap = new Map<string, { name: string; deals: number; value: number }>();
    for (const deal of pipelineDeals) {
      const existing = stageMap.get(deal.stage_name) ?? { name: deal.stage_name, deals: 0, value: 0 };
      existing.deals++;
      existing.value += deal.value;
      stageMap.set(deal.stage_name, existing);
    }
    return Array.from(stageMap.values());
  }, [pipelineDeals]);

  const cashFlowData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return { key: d.getMonth(), label: d.toLocaleDateString(localeStr, { month: 'short' }) };
    });
    return months.map(m => {
      const mTx = transactions.filter(tx => new Date(tx.date).getMonth() === m.key);
      return {
        name: m.label,
        revenue: mTx.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.value, 0),
        expense: mTx.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.value, 0),
      };
    });
  }, [transactions, localeStr]);

  const taskDistribution = useMemo(() => {
    const statuses = ['todo', 'in_progress', 'review', 'done', 'blocked'] as const;
    return statuses.map((s) => ({
      name: TASK_STATUS_LABELS[s],
      value: tasks.filter(t => t.status === s).length,
    })).filter(d => d.value > 0);
  }, [tasks]);

  const upcomingTasks = useMemo(() => {
    return tasks
      .filter(t => t.status !== 'done' && t.dueDate)
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 5);
  }, [tasks]);

  const recentLogs = activityLogs.slice(0, 5);

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    reorder(result.source.index, result.destination.index);
  }, [reorder]);

  const visibleWidgets = widgetOrder.filter(w => !hiddenWidgets.includes(w));

  const renderWidget = (widgetId: WidgetId) => {
    switch (widgetId) {
      case 'kpi_cards':
        return <KPICardsWidget summaryCards={summaryCards} />;
      case 'cash_flow':
        return <CashFlowWidget data={cashFlowData} t={t} language={lang} />;
      case 'pipeline_crm':
        return <PipelineCRMWidget data={pipelineData} winRate={winRate} t={t} language={lang} />;
      case 'revenue_expense':
        return <RevenueExpenseWidget data={cashFlowData} t={t} language={lang} />;
      case 'task_distribution':
        return <TaskDistributionWidget data={taskDistribution} t={t} />;
      case 'upcoming_tasks':
        return <UpcomingTasksWidget tasks={upcomingTasks} t={t} />;
      case 'project_progress':
        return <ProjectProgressWidget projects={activeProjects} getProgress={getProjectProgress} t={t} />;
      case 'recent_activity':
        return <RecentActivityWidget logs={recentLogs} t={t} locale={localeStr} />;
      default:
        return null;
    }
  };

  if (role === 'collaborator') {
    return <Navigate to="/my-tasks" replace />;
  }

  if (loading || !loaded) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-8 w-48 mb-1" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="w-11 h-11 rounded-xl mb-4" />
                <Skeleton className="h-3 w-20 mb-2" />
                <Skeleton className="h-7 w-28 mb-1" />
                <Skeleton className="h-3 w-24 mb-3" />
                <Skeleton className="h-6 w-full rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <WelcomeGreeting />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 shrink-0 mt-1">
              <Settings2 className="w-4 h-4" />
              {t.common.customize}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="end">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">{t.dashboard.widgetsVisible}</h4>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={resetDefaults}>
                  <RotateCcw className="w-3 h-3" /> {t.common.restore}
                </Button>
              </div>
              <div className="space-y-2">
                {widgetOrder.map(widgetId => (
                  <div key={widgetId} className="flex items-center justify-between py-1">
                    <span className="text-sm text-foreground">{WIDGET_LABELS_I18N[widgetId]}</span>
                    <Switch
                      checked={!hiddenWidgets.includes(widgetId)}
                      onCheckedChange={() => toggleWidget(widgetId)}
                    />
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">{t.dashboard.dragToReorder}</p>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="dashboard-widgets">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="space-y-4"
            >
              {visibleWidgets.map((widgetId, index) => (
                <Draggable key={widgetId} draggableId={widgetId} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={cn(
                        "transition-shadow rounded-xl",
                        snapshot.isDragging && "shadow-lg ring-2 ring-primary/20"
                      )}
                    >
                      <div className="relative group">
                        <div
                          {...provided.dragHandleProps}
                          className="absolute left-1/2 -translate-x-1/2 -top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-muted rounded-full px-3 py-0.5 cursor-grab active:cursor-grabbing"
                        >
                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                        </div>
                        {renderWidget(widgetId)}
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}

// ── Widget Components ──

function KPICardsWidget({ summaryCards }: { summaryCards: any[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {summaryCards.map(s => {
        const Icon = s.icon;
        const cardInner = (
          <Card className={cn(
            "group hover:-translate-y-0.5 hover:shadow-md transition-all duration-200",
            s.link && "cursor-pointer"
          )}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className={cn("w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm", s.gradient)}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                {s.trend && (
                  <div className={cn("flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full", s.trendUp ? "text-emerald-600 bg-emerald-50" : "text-red-500 bg-red-50")}>
                    {s.trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {s.trend}
                  </div>
                )}
              </div>
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                {s.label}
                {'tooltip' in s && <InfoTooltip text={s.tooltip} />}
              </p>
              <p className="text-2xl font-extrabold text-foreground mt-1 tracking-tight truncate" title={s.value}>{s.value}</p>
              <div className="flex items-center gap-1 mt-1">
                {s.alert && <AlertTriangle className="w-3 h-3 text-destructive" />}
                <span className={cn("text-xs truncate", s.alert ? 'text-destructive' : 'text-muted-foreground')}>{s.sub}</span>
              </div>
              {s.rawValue > 0 && (
                <div className="mt-3 h-6 flex items-end gap-[2px]" aria-hidden="true">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className={cn("flex-1 rounded-sm bg-gradient-to-t opacity-30 group-hover:opacity-50 transition-opacity", s.gradient)} style={{ height: `${30 + ((i * 17) % 70)}%` }} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
        return s.link ? (
          <Link key={s.label} to={s.link} className="block focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-xl">
            {cardInner}
          </Link>
        ) : (
          <div key={s.label}>{cardInner}</div>
        );
      })}
    </div>
  );
}

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
};

function CashFlowWidget({ data, t, language }: { data: any[]; t: any; language: SupportedLanguage }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          {t.dashboard.cashFlow}
          <InfoTooltip text={t.dashboard.cashFlowTooltip} />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v, language)} contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="revenue" stroke="#10B981" fill="#10B981" fillOpacity={0.12} strokeWidth={2} name={t.dashboard.revenue} />
              <Area type="monotone" dataKey="expense" stroke="#EF4444" fill="#EF4444" fillOpacity={0.08} strokeWidth={2} name={t.dashboard.expense} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function PipelineCRMWidget({ data, winRate, t, language }: { data: any[]; winRate: number; t: any; language: SupportedLanguage }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          {t.dashboard.pipelineCRM}
          <InfoTooltip text={t.dashboard.pipelineCRMTooltip} />
          <Badge variant="secondary" className="ml-auto text-xs font-normal">
            Win Rate: {winRate}%
            <InfoTooltip text={t.dashboard.winRateTooltip} />
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyChart message={t.dashboard.noDealsFound} link="/crm/pipeline" linkLabel={t.dashboard.createDeal} />
        ) : (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  formatter={(v: number, name: string) => name === 'value' ? formatCurrency(v, language) : v}
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="deals" fill="#3B82F6" radius={[6, 6, 0, 0]} name={t.dashboard.deals} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RevenueExpenseWidget({ data, t, language }: { data: any[]; t: any; language: SupportedLanguage }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          {t.dashboard.revenueVsExpense}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 || data.every(d => !d.revenue && !d.expense) ? (
          <EmptyChart message={t.dashboard.noTransactions} />
        ) : (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)}
                />
                <Tooltip formatter={(v: number) => formatCurrency(v, language)} contentStyle={tooltipStyle} />
                <Bar dataKey="revenue" fill="#10B981" radius={[4, 4, 0, 0]} name={t.dashboard.revenue} />
                <Bar dataKey="expense" fill="#EF4444" radius={[4, 4, 0, 0]} name={t.dashboard.expense} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TaskDistributionWidget({ data, t }: { data: any[]; t: any }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          {t.dashboard.taskDistribution}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyChart message={t.dashboard.noTasksRegistered} />
        ) : (
          <div className="h-[240px] flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {data.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function UpcomingTasksWidget({ tasks, t }: { tasks: any[]; t: any }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            {t.dashboard.upcomingTasks}
          </CardTitle>
          <Link to="/my-tasks" className="text-xs text-primary hover:underline flex items-center gap-0.5">
            {t.common.viewAll} <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tasks.length === 0 ? (
            <EmptyChart message={t.dashboard.noTasksPending} height="h-24" />
          ) : tasks.map(task => {
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
            return (
              <Link key={task.id} to="/my-tasks" className="flex items-center gap-3 py-1.5 group hover:bg-muted/50 rounded-md px-1.5 -mx-1.5 transition-colors">
                <div className={cn(
                  "w-2.5 h-2.5 rounded-full flex-shrink-0",
                  task.priority === 'urgent' ? 'bg-destructive' :
                  task.priority === 'high' ? 'bg-amber-500' : 'bg-primary'
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate group-hover:text-primary transition-colors">{task.title}</p>
                  <p className={cn("text-xs", isOverdue ? 'text-destructive' : 'text-muted-foreground')}>
                    {isOverdue ? `⚠ ${t.dashboard.overdueWarning} — ` : ''}{task.dueDate}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {TASK_STATUS_LABELS[task.status]}
                </Badge>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectProgressWidget({ projects, getProgress, t }: { projects: any[]; getProgress: (id: string) => number; t: any }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-primary" />
            {t.dashboard.projectProgress}
          </CardTitle>
          <Link to="/projects" className="text-xs text-primary hover:underline flex items-center gap-0.5">
            {t.common.viewAllM} <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {projects.length === 0 ? (
            <EmptyChart message={t.dashboard.noActiveProjects} height="h-24" />
          ) : projects.slice(0, 5).map(p => {
            const progress = getProgress(p.id);
            return (
              <Link key={p.id} to={`/projects/${p.id}`} className="block group">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">{p.name}</span>
                  <span className="text-xs font-semibold text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function RecentActivityWidget({ logs, t, locale }: { logs: any[]; t: any; locale: string }) {
  // Deduplicate consecutive logs that share entity_id + action (e.g. EN+PT pairs).
  const deduped = (() => {
    const seen = new Set<string>();
    const result: any[] = [];
    for (const log of logs) {
      const key = `${log.action}|${log.entity}|${log.entityId}|${log.entityName}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(log);
    }
    return result;
  })();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          {t.dashboard.recentActivity}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {deduped.length === 0 ? (
            <EmptyChart message={t.dashboard.noActivityRegistered} height="h-24" />
          ) : deduped.map(log => (
            <div key={log.id} className="flex items-center gap-3 py-1.5 border-b border-border/50 last:border-0">
              <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">
                  <span className="capitalize">{log.action}</span> {log.entity} "{log.entityName}"
                </p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {new Date(log.createdAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Empty Chart State ──
function EmptyChart({ message, link, linkLabel, height = 'h-[240px]' }: { message: string; link?: string; linkLabel?: string; height?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center", height)}>
      <svg width="64" height="64" viewBox="0 0 80 80" fill="none" className="mb-3 opacity-25">
        <rect x="10" y="20" width="60" height="45" rx="8" stroke="currentColor" strokeWidth="2" className="text-muted-foreground" />
        <path d="M10 32h60" stroke="currentColor" strokeWidth="2" className="text-muted-foreground" />
        <rect x="18" y="40" width="18" height="4" rx="2" fill="currentColor" className="text-muted-foreground" />
        <rect x="18" y="48" width="12" height="4" rx="2" fill="currentColor" className="text-muted-foreground" />
        <rect x="44" y="40" width="18" height="4" rx="2" fill="currentColor" className="text-muted-foreground" />
        <rect x="44" y="48" width="12" height="4" rx="2" fill="currentColor" className="text-muted-foreground" />
      </svg>
      <p className="text-sm text-muted-foreground">{message}</p>
      {link && linkLabel && (
        <Link to={link}>
          <Button variant="outline" size="sm" className="mt-3 text-xs">{linkLabel}</Button>
        </Link>
      )}
    </div>
  );
}
