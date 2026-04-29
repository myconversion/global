import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, XCircle, Clock, User, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useProjectsContext } from '@/contexts/ProjectsContext';
import { useI18n } from '@/contexts/I18nContext';
import { getDateLocale } from '@/i18n/date-locale';

import { Task, TaskStatus } from '@/types/index';
import { cn } from '@/lib/utils';

interface WorkspaceApprovalsViewProps {
  deliverableId: string;
}

export default function WorkspaceApprovalsView({ deliverableId }: WorkspaceApprovalsViewProps) {
  const { getDeliverableTasks, updateTask, members } = useProjectsContext();
  const { t, language } = useI18n();
  const dateLocale = getDateLocale(language);
  const tasks = getDeliverableTasks(deliverableId);

  const PRIORITY_COLORS: Record<string, string> = {
    low: 'bg-muted text-muted-foreground',
    medium: 'bg-primary/10 text-primary',
    high: 'bg-warning/10 text-warning',
    urgent: 'bg-destructive/10 text-destructive',
  };

  const PRIORITY_LABELS: Record<string, string> = {
    low: t.workspace.priorityLow,
    medium: t.workspace.priorityMedium,
    high: t.workspace.priorityHigh,
    urgent: t.workspace.priorityUrgent,
  };

  const reviewTasks = tasks.filter(t => t.status === 'review');
  const doneTasks = tasks.filter(t => t.status === 'done').slice(0, 10);

  const getMemberName = (id?: string) => members.find(m => m.id === id)?.name ?? t.workspace.unassigned;

  const handleApprove = (taskId: string) => {
    updateTask(taskId, { status: 'done' as TaskStatus });
  };

  const handleReject = (taskId: string) => {
    updateTask(taskId, { status: 'in_progress' as TaskStatus });
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-warning" />
          <h3 className="font-semibold">{t.workspace.pendingApproval}</h3>
          {reviewTasks.length > 0 && (
            <Badge variant="secondary" className="text-xs">{reviewTasks.length}</Badge>
          )}
        </div>

        {reviewTasks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-lg bg-muted/10">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
            <p className="font-medium">{t.workspace.noTasksPendingApproval}</p>
            <p className="text-sm">{t.workspace.tasksInReviewAppearHere}</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {reviewTasks.map(task => (
              <Card key={task.id} className="border-l-4 border-l-warning">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">{task.title}</h4>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="w-3 h-3" />
                          {getMemberName(task.assigneeId)}
                        </div>
                        {task.dueDate && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarIcon className="w-3 h-3" />
                            {format(new Date(task.dueDate), 'dd/MM/yyyy', { locale: dateLocale })}
                          </div>
                        )}
                        <Badge className={cn('text-[10px]', PRIORITY_COLORS[task.priority])}>
                          {PRIORITY_LABELS[task.priority]}
                        </Badge>
                        {task.tags.map(t => (
                          <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1 text-xs text-destructive hover:text-destructive"
                        onClick={() => handleReject(task.id)}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        {t.workspace.reject}
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        onClick={() => handleApprove(task.id)}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {t.workspace.approve}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {doneTasks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <h3 className="font-semibold">{t.workspace.recentlyApproved}</h3>
          </div>
          <div className="grid gap-2">
            {doneTasks.map(task => (
              <div key={task.id} className="flex items-center gap-3 px-4 py-2.5 border rounded-lg bg-muted/10">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                <span className="text-sm flex-1 truncate">{task.title}</span>
                <span className="text-xs text-muted-foreground">{getMemberName(task.assigneeId)}</span>
                {task.updatedAt && (
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(task.updatedAt), 'dd/MM', { locale: dateLocale })}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
