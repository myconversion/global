import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpDown, Calendar as CalendarIcon, User, AlertTriangle } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { useProjectsContext } from '@/contexts/ProjectsContext';
import { useI18n } from '@/contexts/I18nContext';
import { getDateLocale } from '@/i18n/date-locale';

import { Task, TaskPriority, TaskStatus } from '@/types/index';
import { cn } from '@/lib/utils';

interface WorkspaceListViewProps {
  deliverableId: string;
}

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: 'bg-muted text-muted-foreground',
  in_progress: 'bg-primary/10 text-primary',
  review: 'bg-warning/10 text-warning',
  done: 'bg-accent text-accent-foreground',
  blocked: 'bg-destructive/10 text-destructive',
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-primary/10 text-primary',
  high: 'bg-warning/10 text-warning',
  urgent: 'bg-destructive/10 text-destructive',
};

type SortField = 'title' | 'status' | 'priority' | 'dueDate' | 'assignee';

export default function WorkspaceListView({ deliverableId }: WorkspaceListViewProps) {
  const { getDeliverableTasks, updateTask, members } = useProjectsContext();
  const { t, language } = useI18n();
  const dateLocale = getDateLocale(language);
  const tasks = getDeliverableTasks(deliverableId);

  const STATUS_LABELS: Record<TaskStatus, string> = {
    todo: t.workspace.statusTodo,
    in_progress: t.workspace.statusInProgress,
    review: t.workspace.statusReview,
    done: t.workspace.statusDone,
    blocked: t.workspace.statusBlocked,
  };

  const PRIORITY_LABELS: Record<TaskPriority, string> = {
    low: t.workspace.priorityLow,
    medium: t.workspace.priorityMedium,
    high: t.workspace.priorityHigh,
    urgent: t.workspace.priorityUrgent,
  };

  const [sortField, setSortField] = useState<SortField>('status');
  const [sortAsc, setSortAsc] = useState(true);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  const priorityOrder: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
  const statusOrder: Record<TaskStatus, number> = { blocked: 0, todo: 1, in_progress: 2, review: 3, done: 4 };

  const sorted = [...tasks].sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case 'title': cmp = a.title.localeCompare(b.title); break;
      case 'status': cmp = statusOrder[a.status] - statusOrder[b.status]; break;
      case 'priority': cmp = priorityOrder[a.priority] - priorityOrder[b.priority]; break;
      case 'dueDate': cmp = (a.dueDate ?? '').localeCompare(b.dueDate ?? ''); break;
      case 'assignee': cmp = (a.assigneeId ?? '').localeCompare(b.assigneeId ?? ''); break;
    }
    return sortAsc ? cmp : -cmp;
  });

  const getMemberName = (id?: string) => members.find(m => m.id === id)?.name ?? '—';

  const isOverdue = (task: Task) => task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) && task.status !== 'done';

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort(field)}>
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className={cn('w-3 h-3', sortField === field ? 'text-foreground' : 'text-muted-foreground/40')} />
      </div>
    </TableHead>
  );

  if (tasks.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="font-medium">{t.workspace.noTasksInDeliverable}</p>
        <p className="text-sm">{t.workspace.createTasksInBoard}</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <SortHeader field="title">{t.workspace.task}</SortHeader>
            <SortHeader field="status">{t.workspace.status}</SortHeader>
            <SortHeader field="priority">{t.workspace.priority}</SortHeader>
            <SortHeader field="dueDate">{t.workspace.dueLabel}</SortHeader>
            <SortHeader field="assignee">{t.workspace.assignee}</SortHeader>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map(task => (
            <TableRow key={task.id} className={cn(isOverdue(task) && 'bg-destructive/5')}>
              <TableCell className="font-medium max-w-[300px]">
                <div className="flex items-center gap-2">
                  {isOverdue(task) && <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />}
                  <span className="truncate">{task.title}</span>
                  {task.tags.length > 0 && (
                    <div className="flex gap-1">
                      {task.tags.slice(0, 2).map(t => (
                        <Badge key={t} variant="outline" className="text-[10px] px-1 py-0">{t}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Select value={task.status} onValueChange={(v) => updateTask(task.id, { status: v as TaskStatus })}>
                  <SelectTrigger className="h-7 text-xs w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Badge className={cn('text-xs', PRIORITY_COLORS[task.priority])}>
                  {PRIORITY_LABELS[task.priority]}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">
                {task.dueDate ? (
                  <span className={cn(isOverdue(task) && 'text-destructive font-medium')}>
                    {format(new Date(task.dueDate), 'dd/MM/yyyy', { locale: dateLocale })}
                  </span>
                ) : '—'}
              </TableCell>
              <TableCell className="text-sm">{getMemberName(task.assigneeId)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
