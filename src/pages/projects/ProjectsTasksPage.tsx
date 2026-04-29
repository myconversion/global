import { CheckSquare } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useProjectsContext } from '@/contexts/ProjectsContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TaskPriority } from '@/types/index';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, User, AlertTriangle } from 'lucide-react';
import { isPast, isToday } from 'date-fns';
import { useI18n } from '@/contexts/I18nContext';
import { getDateLocale } from '@/i18n/date-locale';

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-primary/10 text-primary',
  high: 'bg-warning/10 text-warning',
  urgent: 'bg-destructive/10 text-destructive',
};

export default function ProjectsTasksPage() {
  const { tasks, projects, deliverables, members } = useProjectsContext();
  const { t, language } = useI18n();
  const dateLocale = getDateLocale(language);

  const TASK_STATUS_LABELS: Record<string, string> = {
    todo: t.tasks.todo, in_progress: t.tasks.inProgress, review: t.tasks.review,
    done: t.tasks.done, blocked: t.tasks.blocked,
  };
  const TASK_PRIORITY_LABELS: Record<string, string> = {
    low: t.tasks.low, medium: t.tasks.medium, high: t.tasks.high, urgent: t.tasks.urgent,
  };

  const allTasks = tasks.filter(t => t.status !== 'done').sort((a, b) => {
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    return 1;
  });

  const getProjectName = (taskDeliverableId: string) => {
    const del = deliverables.find(d => d.id === taskDeliverableId);
    if (!del) return '';
    const proj = projects.find(p => p.id === del.projectId);
    return proj?.name ?? '';
  };

  const getMemberName = (id: string) => members.find(m => m.id === id)?.name ?? '';

  const isOverdue = (dueDate?: string, status?: string) => {
    if (!dueDate || status === 'done') return false;
    const due = new Date(dueDate);
    return isPast(due) && !isToday(due);
  };

  return (
    <div>
      <PageHeader
        title={t.sectors.tasks}
        description={t.projects.description}
        icon={<CheckSquare className="w-5 h-5 text-primary" />}
      />

      <div className="space-y-2">
        {allTasks.map(task => {
          const overdue = isOverdue(task.dueDate, task.status);
          return (
            <Card key={task.id} className={cn("transition-all", overdue && "border-destructive/50")}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <Badge className={cn("text-[10px] px-1.5 py-0 border-0", PRIORITY_COLORS[task.priority])}>
                      {TASK_PRIORITY_LABELS[task.priority]}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {TASK_STATUS_LABELS[task.status]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{getProjectName(task.projectDeliverableId)}</span>
                    {task.dueDate && (
                      <span className={cn("flex items-center gap-1", overdue && "text-destructive font-medium")}>
                        {overdue && <AlertTriangle className="w-3 h-3" />}
                        <CalendarIcon className="w-3 h-3" />
                        {format(new Date(task.dueDate), "dd MMM", { locale: dateLocale })}
                      </span>
                    )}
                    {task.assigneeId && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {getMemberName(task.assigneeId)}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {allTasks.length === 0 && (
          <div className="text-center py-16">
            <CheckSquare className="w-14 h-14 mx-auto mb-3 text-muted-foreground/20" />
            <h3 className="font-semibold text-muted-foreground mb-1">{t.dashboard.noTasksPending}</h3>
            <p className="text-sm text-muted-foreground">{t.tasks.completedTasksTooltip}</p>
          </div>
        )}
      </div>
    </div>
  );
}
