import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CheckSquare, Search, Filter, CalendarIcon,
  AlertTriangle, FolderKanban, X, Phone, Mail, Users, ListTodo, Clock, Target
} from 'lucide-react';
import { KPICard } from '@/components/shared/KPICard';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils';
import { format, isPast, isToday } from 'date-fns';
import { useProjectsContext } from '@/contexts/ProjectsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { getDateLocale } from '@/i18n/date-locale';
import { supabase } from '@/integrations/supabase/client';
import {
  Task, TaskStatus, TaskPriority,
} from '@/types/index';

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-primary/10 text-primary',
  high: 'bg-warning/10 text-warning',
  urgent: 'bg-destructive/10 text-destructive',
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: 'bg-muted text-muted-foreground',
  in_progress: 'bg-primary/10 text-primary',
  review: 'bg-warning/10 text-warning',
  done: 'bg-success/10 text-success',
  blocked: 'bg-destructive/10 text-destructive',
};

interface UnifiedTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  tags: string[];
  module: 'projects' | 'crm';
  moduleLabel: string;
  contextName?: string;
  contextRoute?: string;
  originalTask?: Task;
  originalFollowup?: any;
}

export default function MyTasksPage() {
  const navigate = useNavigate();
  const { t, language } = useI18n();
  const { user, currentCompany } = useAuth();
  const { projects, deliverables, getAllTasks, getProjectById, updateTask } = useProjectsContext();
  const allProjectTasks = getAllTasks();

  const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
    todo: t.tasks.todo,
    in_progress: t.tasks.inProgress,
    review: t.tasks.review,
    done: t.tasks.done,
    blocked: t.tasks.blocked,
  };

  const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
    low: t.tasks.low,
    medium: t.tasks.medium,
    high: t.tasks.high,
    urgent: t.tasks.urgent,
  };

  const [crmFollowups, setCrmFollowups] = useState<any[]>([]);
  const [crmContacts, setCrmContacts] = useState<Record<string, string>>({});
  const [crmCompanies, setCrmCompanies] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user || !currentCompany) return;
    const fetchCrm = async () => {
      const { data: followups } = await supabase
        .from('crm_followups')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('assigned_to', user.user_id)
        .order('scheduled_at', { ascending: true });

      if (followups) {
        setCrmFollowups(followups);
        const contactIds = [...new Set(followups.map(f => f.contact_id).filter(Boolean))];
        const companyIds = [...new Set(followups.map(f => f.crm_company_id).filter(Boolean))];

        if (contactIds.length > 0) {
          const { data: contacts } = await supabase.from('crm_contacts').select('id, name').in('id', contactIds);
          if (contacts) {
            const map: Record<string, string> = {};
            contacts.forEach(c => { map[c.id] = c.name; });
            setCrmContacts(map);
          }
        }
        if (companyIds.length > 0) {
          const { data: companies } = await supabase.from('crm_companies').select('id, razao_social').in('id', companyIds);
          if (companies) {
            const map: Record<string, string> = {};
            companies.forEach(c => { map[c.id] = c.razao_social; });
            setCrmCompanies(map);
          }
        }
      }
    };
    fetchCrm();
  }, [user, currentCompany]);

  const unifiedTasks = useMemo(() => {
    if (!user) return [];

    const projectItems: UnifiedTask[] = allProjectTasks
      .filter(t => t.assigneeId === user.user_id)
      .map(task => {
        const del = deliverables.find(d => d.id === task.projectDeliverableId);
        const proj = del ? getProjectById(del.projectId) : undefined;
        return {
          id: task.id, title: task.title, status: task.status, priority: task.priority,
          dueDate: task.dueDate, tags: task.tags, module: 'projects' as const,
          moduleLabel: t.sectors.projects,
          contextName: proj?.name,
          contextRoute: proj ? `/projects/workspace/${proj.id}` : undefined,
          originalTask: task,
        };
      });

    const crmItems: UnifiedTask[] = crmFollowups.map(f => {
      const contactName = f.contact_id ? crmContacts[f.contact_id] : undefined;
      const companyName = f.crm_company_id ? crmCompanies[f.crm_company_id] : undefined;
      const context = contactName || companyName || '';
      const contextRoute = f.contact_id
        ? `/crm/people/${f.contact_id}`
        : f.crm_company_id ? `/crm/companies/${f.crm_company_id}` : undefined;

      return {
        id: f.id, title: f.description || 'Follow-up',
        status: f.is_completed ? 'done' as TaskStatus : 'todo' as TaskStatus,
        priority: 'medium' as TaskPriority,
        dueDate: f.scheduled_at, tags: [f.type],
        module: 'crm' as const, moduleLabel: 'CRM',
        contextName: context, contextRoute, originalFollowup: f,
      };
    });

    return [...projectItems, ...crmItems].sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [allProjectTasks, crmFollowups, crmContacts, crmCompanies, user, deliverables, getProjectById, t]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');

  const isOverdue = (task: UnifiedTask) => {
    if (!task.dueDate || task.status === 'done') return false;
    const due = new Date(task.dueDate);
    return isPast(due) && !isToday(due);
  };

  const filtered = useMemo(() => {
    return unifiedTasks.filter(task => {
      if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== 'all' && task.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
      if (moduleFilter !== 'all' && task.module !== moduleFilter) return false;
      return true;
    });
  }, [unifiedTasks, search, statusFilter, priorityFilter, moduleFilter]);

  const counters = useMemo(() => ({
    total: unifiedTasks.length,
    todo: unifiedTasks.filter(t => t.status === 'todo').length,
    in_progress: unifiedTasks.filter(t => t.status === 'in_progress').length,
    review: unifiedTasks.filter(t => t.status === 'review').length,
    done: unifiedTasks.filter(t => t.status === 'done').length,
    overdue: unifiedTasks.filter(t => isOverdue(t)).length,
  }), [unifiedTasks]);

  const hasFilters = search || statusFilter !== 'all' || priorityFilter !== 'all' || moduleFilter !== 'all';
  const clearFilters = () => { setSearch(''); setStatusFilter('all'); setPriorityFilter('all'); setModuleFilter('all'); };

  const toggleDone = async (task: UnifiedTask) => {
    if (task.module === 'projects' && task.originalTask) {
      updateTask(task.originalTask.id, { status: task.originalTask.status === 'done' ? 'todo' : 'done' });
    } else if (task.module === 'crm' && task.originalFollowup) {
      const newCompleted = !task.originalFollowup.is_completed;
      await supabase.from('crm_followups').update({
        is_completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
      }).eq('id', task.originalFollowup.id);
      setCrmFollowups(prev =>
        prev.map(f => f.id === task.originalFollowup.id
          ? { ...f, is_completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null }
          : f
        )
      );
    }
  };

  const MODULE_COLORS = {
    projects: 'bg-primary/10 text-primary',
    crm: 'bg-accent text-accent-foreground',
  };

  const dateLocale = getDateLocale(language);

  return (
    <div>
      <PageHeader
        title={t.nav.myTasks}
        description={t.tasks.totalTasksTooltip}
        icon={<CheckSquare className="w-5 h-5 text-primary" />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label={t.tasks.totalTasks} value={String(counters.total)} tooltip={t.tasks.totalTasksTooltip} icon={<ListTodo className="w-5 h-5" />} gradient="from-blue-500 to-blue-600" sparkline />
        <KPICard label={t.financial.pending} value={String(counters.todo + counters.in_progress + counters.review)} tooltip={t.dashboard.pendingTasksTooltip} icon={<Clock className="w-5 h-5" />} gradient="from-amber-500 to-orange-500" sparkline />
        <KPICard label={t.tasks.completedTasks} value={String(counters.done)} tooltip={t.tasks.completedTasksTooltip} icon={<CheckSquare className="w-5 h-5" />} gradient="from-emerald-500 to-emerald-600" sparkline />
        {counters.overdue > 0 ? (
          <KPICard label={t.tasks.overdueTasks} value={String(counters.overdue)} tooltip={t.tasks.overdueTasksTooltip} icon={<AlertTriangle className="w-5 h-5" />} gradient="from-red-500 to-rose-600" sparkline />
        ) : (
          <KPICard label="CRM" value={String(unifiedTasks.filter(t => t.module === 'crm').length)} tooltip="CRM follow-ups" icon={<Target className="w-5 h-5" />} gradient="from-violet-500 to-purple-600" sparkline />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t.tasks.searchTasks} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-[160px]">
            <FolderKanban className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
            <SelectValue placeholder={t.tasks.allModules} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.tasks.allModules}</SelectItem>
            <SelectItem value="projects">{t.sectors.projects}</SelectItem>
            <SelectItem value="crm">CRM</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[150px]">
            <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
            <SelectValue placeholder={t.tasks.allPriorities} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.tasks.allPriorities}</SelectItem>
            {Object.entries(TASK_PRIORITY_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="w-3.5 h-3.5 mr-1" /> {t.common.clear}
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<CheckSquare className="w-9 h-9 text-muted-foreground/60" />}
          title={unifiedTasks.length === 0 ? t.tasks.noTasksAssigned : t.tasks.noResults}
          description={unifiedTasks.length === 0 ? t.tasks.whenAssigned : t.tasks.adjustFilters}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(task => {
            const overdue = isOverdue(task);
            return (
              <Card
                key={`${task.module}-${task.id}`}
                className={cn("hover:shadow-sm transition-shadow group", overdue && "border-destructive/40")}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <button
                    onClick={() => toggleDone(task)}
                    className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                      task.status === 'done' ? "bg-success border-success" : "border-muted-foreground/30 hover:border-primary"
                    )}
                  >
                    {task.status === 'done' && <CheckSquare className="w-3 h-3 text-success-foreground" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium truncate", task.status === 'done' && "line-through text-muted-foreground")}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      {task.contextName && (
                        <span
                          className={cn(task.contextRoute && "hover:text-primary cursor-pointer")}
                          onClick={() => task.contextRoute && navigate(task.contextRoute)}
                        >
                          {task.contextName}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge className={cn("text-[10px] px-1.5 py-0 border-0 shrink-0", MODULE_COLORS[task.module])}>
                    {task.moduleLabel}
                  </Badge>
                  <div className="hidden md:flex items-center gap-1.5">
                    {task.tags.slice(0, 2).map(tag => (
                      <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                    ))}
                  </div>
                  <Badge className={cn("text-xs border-0 shrink-0", PRIORITY_COLORS[task.priority])}>
                    {TASK_PRIORITY_LABELS[task.priority]}
                  </Badge>
                  <Badge className={cn("text-xs border-0 shrink-0 hidden sm:inline-flex", STATUS_COLORS[task.status])}>
                    {TASK_STATUS_LABELS[task.status]}
                  </Badge>
                  {task.dueDate && (
                    <span className={cn("text-xs shrink-0 flex items-center gap-1", overdue ? "text-destructive font-medium" : "text-muted-foreground")}>
                      {overdue && <AlertTriangle className="w-3 h-3" />}
                      <CalendarIcon className="w-3 h-3" />
                      {format(new Date(task.dueDate), "dd MMM", { locale: dateLocale })}
                    </span>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
