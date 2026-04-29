import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CheckSquare, Search, Filter, User, X, CalendarIcon,
  AlertTriangle, FolderKanban, List, CalendarDays
} from 'lucide-react';
import TasksCalendarView from '@/components/tasks/TasksCalendarView';
import { cn } from '@/lib/utils';
import { format, isPast, isToday } from 'date-fns';
import { useProjectsContext } from '@/contexts/ProjectsContext';
import { useI18n } from '@/contexts/I18nContext';
import { getDateLocale } from '@/i18n/date-locale';

import { Task, TaskStatus, TaskPriority } from '@/types/index';

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

type GroupBy = 'none' | 'project' | 'assignee';

export default function TasksPage() {
  const navigate = useNavigate();
  const { projects, deliverables, getAllTasks, getProjectById, updateTask, members } = useProjectsContext();
  const { t, language } = useI18n();
  const dateLocale = getDateLocale(language);
  const allTasks = getAllTasks();

  const STATUS_LABELS: Record<TaskStatus, string> = {
    todo: t.tasks.todo,
    in_progress: t.tasks.inProgress,
    review: t.tasks.review,
    done: t.tasks.done,
    blocked: t.tasks.blocked,
  };

  const PRIORITY_LABELS: Record<TaskPriority, string> = {
    low: t.tasks.low,
    medium: t.tasks.medium,
    high: t.tasks.high,
    urgent: t.tasks.urgent,
  };

  // Filters
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [overdueFilter, setOverdueFilter] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupBy>('project');

  // Helpers
  const getProjectForTask = (task: Task) => {
    const del = deliverables.find(d => d.id === task.projectDeliverableId);
    return del ? getProjectById(del.projectId) : undefined;
  };

  const isOverdue = (task: Task) => {
    if (!task.dueDate || task.status === 'done') return false;
    const due = new Date(task.dueDate);
    return isPast(due) && !isToday(due);
  };

  const getMemberName = (id: string) => members.find(m => m.id === id)?.name ?? t.tasks.unassigned;

  // Filtered tasks
  const filtered = useMemo(() => {
    return allTasks.filter(t => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (assigneeFilter !== 'all' && t.assigneeId !== assigneeFilter) return false;
      if (overdueFilter && !isOverdue(t)) return false;
      if (projectFilter !== 'all') {
        const proj = getProjectForTask(t);
        if (!proj || proj.id !== projectFilter) return false;
      }
      return true;
    });
  }, [allTasks, search, statusFilter, priorityFilter, projectFilter, assigneeFilter, overdueFilter]);

  // Counters
  const counters = useMemo(() => ({
    total: allTasks.length,
    todo: allTasks.filter(t => t.status === 'todo').length,
    in_progress: allTasks.filter(t => t.status === 'in_progress').length,
    review: allTasks.filter(t => t.status === 'review').length,
    done: allTasks.filter(t => t.status === 'done').length,
    blocked: allTasks.filter(t => t.status === 'blocked').length,
    overdue: allTasks.filter(t => isOverdue(t)).length,
  }), [allTasks]);

  // Grouping
  const grouped = useMemo(() => {
    if (groupBy === 'none') return [{ key: 'all', label: t.tasks.allTasks, tasks: filtered }];
    if (groupBy === 'project') {
      const groups: Record<string, { label: string; tasks: Task[] }> = {};
      filtered.forEach(task => {
        const proj = getProjectForTask(task);
        const key = proj?.id ?? 'no-project';
        const label = proj?.name ?? t.tasks.noProject;
        if (!groups[key]) groups[key] = { label, tasks: [] };
        groups[key].tasks.push(task);
      });
      return Object.entries(groups).map(([key, g]) => ({ key, label: g.label, tasks: g.tasks }));
    }
    // group by assignee
    const groups: Record<string, { label: string; tasks: Task[] }> = {};
    filtered.forEach(task => {
      const key = task.assigneeId ?? 'unassigned';
      const label = task.assigneeId ? getMemberName(task.assigneeId) : t.tasks.unassigned;
      if (!groups[key]) groups[key] = { label, tasks: [] };
      groups[key].tasks.push(task);
    });
    return Object.entries(groups).map(([key, g]) => ({ key, label: g.label, tasks: g.tasks }));
  }, [filtered, groupBy]);

  const hasFilters = search || statusFilter !== 'all' || priorityFilter !== 'all' || projectFilter !== 'all' || assigneeFilter !== 'all' || overdueFilter;
  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setProjectFilter('all');
    setAssigneeFilter('all');
    setOverdueFilter(false);
  };

  const toggleDone = (task: Task) => {
    updateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <PageHeader
          title={t.tasks.pageTitle}
          description={t.tasks.pageDescription}
          icon={<CheckSquare className="w-5 h-5 text-primary" />}
        />
        <div className="flex gap-1 border rounded-lg p-0.5">
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 px-3"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4 mr-1.5" />
            {t.crm.listView}
          </Button>
          <Button
            variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 px-3"
            onClick={() => setViewMode('calendar')}
          >
            <CalendarDays className="w-4 h-4 mr-1.5" />
            {t.workspace.calendar}
          </Button>
        </div>
      </div>

      {/* Counters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <CounterChip label="Total" count={counters.total} active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
        <CounterChip label={STATUS_LABELS.todo} count={counters.todo} active={statusFilter === 'todo'} onClick={() => setStatusFilter(statusFilter === 'todo' ? 'all' : 'todo')} color="bg-muted" />
        <CounterChip label={STATUS_LABELS.in_progress} count={counters.in_progress} active={statusFilter === 'in_progress'} onClick={() => setStatusFilter(statusFilter === 'in_progress' ? 'all' : 'in_progress')} color="bg-primary/10" />
        <CounterChip label={STATUS_LABELS.review} count={counters.review} active={statusFilter === 'review'} onClick={() => setStatusFilter(statusFilter === 'review' ? 'all' : 'review')} color="bg-warning/10" />
        <CounterChip label={STATUS_LABELS.done} count={counters.done} active={statusFilter === 'done'} onClick={() => setStatusFilter(statusFilter === 'done' ? 'all' : 'done')} color="bg-success/10" />
        <CounterChip label={STATUS_LABELS.blocked} count={counters.blocked} active={statusFilter === 'blocked'} onClick={() => setStatusFilter(statusFilter === 'blocked' ? 'all' : 'blocked')} color="bg-destructive/10" />
        {counters.overdue > 0 && (
          <CounterChip label={t.tasks.overdueChip} count={counters.overdue} active={overdueFilter} onClick={() => setOverdueFilter(!overdueFilter)} color="bg-destructive/10" icon={<AlertTriangle className="w-3 h-3" />} />
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t.tasks.searchTasks} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-[180px]">
            <FolderKanban className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
            <SelectValue placeholder={t.tasks.project} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.tasks.allProjects}</SelectItem>
            {projects.filter(p => p.status !== 'archived').map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[150px]">
            <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
            <SelectValue placeholder={t.tasks.priority} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.tasks.allFem}</SelectItem>
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="w-[170px]">
            <User className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
            <SelectValue placeholder={t.tasks.assignee} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.tasks.allMasc}</SelectItem>
            {members.map(m => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={groupBy} onValueChange={v => setGroupBy(v as GroupBy)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t.tasks.groupBy} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t.tasks.noGrouping}</SelectItem>
            <SelectItem value="project">{t.tasks.byProject}</SelectItem>
            <SelectItem value="assignee">{t.tasks.byAssignee}</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="w-3.5 h-3.5 mr-1" /> {t.tasks.clear}
          </Button>
        )}
      </div>

      {/* Calendar view */}
      {viewMode === 'calendar' ? (
        <TasksCalendarView
          tasks={filtered}
          onToggleDone={toggleDone}
          getMemberName={getMemberName}
          getProjectName={(task) => getProjectForTask(task)?.name}
          priorityLabels={PRIORITY_LABELS}
          statusLabels={STATUS_LABELS}
        />
      ) : null}

      {/* Task list */}
      {viewMode === 'list' && (
      filtered.length === 0 ? (
        <EmptyState
          icon={<CheckSquare className="w-9 h-9 text-muted-foreground/60" />}
          title={allTasks.length === 0 ? t.tasks.noTasksYet : t.tasks.noResults}
          description={allTasks.length === 0 ? t.tasks.createTasksInDeliverables : t.tasks.adjustFilters}
          actionLabel={t.workspace.newTask}
          onAction={() => navigate('/projects')}
        />
      ) : (
        <div className="space-y-6">
          {grouped.map(group => (
            <div key={group.key}>
              {groupBy !== 'none' && (
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-foreground">{group.label}</h3>
                  <Badge variant="secondary" className="text-xs">{group.tasks.length}</Badge>
                </div>
              )}
              <div className="space-y-2">
                {group.tasks.map(task => {
                  const proj = getProjectForTask(task);
                  const overdue = isOverdue(task);
                  return (
                    <Card
                      key={task.id}
                      className={cn(
                        "hover:shadow-sm transition-shadow group",
                        overdue && "border-destructive/40"
                      )}
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        {/* Done toggle */}
                        <button
                          onClick={() => toggleDone(task)}
                          className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                            task.status === 'done'
                              ? "bg-success border-success"
                              : "border-muted-foreground/30 hover:border-primary"
                          )}
                        >
                          {task.status === 'done' && (
                            <CheckSquare className="w-3 h-3 text-success-foreground" />
                          )}
                        </button>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm font-medium truncate", task.status === 'done' && "line-through text-muted-foreground")}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                            {groupBy !== 'project' && proj && (
                              <span
                                className="hover:text-primary cursor-pointer"
                                onClick={() => navigate(`/projects/${proj.id}`)}
                              >
                                {proj.name}
                              </span>
                            )}
                            {groupBy !== 'assignee' && task.assigneeId && (
                              <>
                                {groupBy !== 'project' && proj && <span>·</span>}
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {getMemberName(task.assigneeId)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Tags */}
                        <div className="hidden md:flex items-center gap-1.5">
                          {task.tags.slice(0, 2).map(tag => (
                            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                          ))}
                        </div>

                        {/* Priority */}
                        <Badge className={cn("text-xs border-0 shrink-0", PRIORITY_COLORS[task.priority])}>
                          {PRIORITY_LABELS[task.priority]}
                        </Badge>

                        {/* Status */}
                        <Badge className={cn("text-xs border-0 shrink-0 hidden sm:inline-flex", STATUS_COLORS[task.status])}>
                          {STATUS_LABELS[task.status]}
                        </Badge>

                        {/* Due date */}
                        {task.dueDate && (
                          <span className={cn(
                            "text-xs shrink-0 flex items-center gap-1",
                            overdue ? "text-destructive font-medium" : "text-muted-foreground"
                          )}>
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
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Counter Chip ──
function CounterChip({ label, count, active, onClick, color, icon }: {
  label: string; count: number; active: boolean; onClick: () => void; color?: string; icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
        active
          ? "ring-2 ring-primary bg-primary/10 text-primary"
          : "bg-card border border-border text-muted-foreground hover:border-primary/50"
      )}
    >
      {icon}
      {label}
      <span className={cn("ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold", color ?? "bg-muted")}>
        {count}
      </span>
    </button>
  );
}
