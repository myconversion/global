import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  differenceInDays, isWithinInterval, addMonths, subMonths, isSameMonth
} from 'date-fns';
import { useProjectsContext } from '@/contexts/ProjectsContext';
import { useI18n } from '@/contexts/I18nContext';
import { getDateLocale } from '@/i18n/date-locale';

import { Task, TaskStatus } from '@/types/index';
import { cn } from '@/lib/utils';

interface WorkspaceTimelineViewProps {
  deliverableId: string;
}

const STATUS_BAR: Record<TaskStatus, string> = {
  todo: 'bg-muted-foreground/40',
  in_progress: 'bg-primary',
  review: 'bg-warning',
  done: 'bg-green-500',
  blocked: 'bg-destructive',
};

export default function WorkspaceTimelineView({ deliverableId }: WorkspaceTimelineViewProps) {
  const { getDeliverableTasks, members } = useProjectsContext();
  const { t, language } = useI18n();
  const dateLocale = getDateLocale(language);
  const tasks = getDeliverableTasks(deliverableId);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const timelineTasks = useMemo(() => {
    return tasks.filter(t => {
      if (!t.startDate && !t.dueDate) return false;
      const s = t.startDate ? new Date(t.startDate) : new Date(t.dueDate!);
      const e = t.dueDate ? new Date(t.dueDate) : new Date(t.startDate!);
      return s <= monthEnd && e >= monthStart;
    }).sort((a, b) => (a.startDate ?? a.dueDate ?? '').localeCompare(b.startDate ?? b.dueDate ?? ''));
  }, [tasks, monthStart, monthEnd]);

  const totalDays = days.length;

  const getBarStyle = (task: Task) => {
    const s = task.startDate ? new Date(task.startDate) : new Date(task.dueDate!);
    const e = task.dueDate ? new Date(task.dueDate) : new Date(task.startDate!);

    const clampedStart = s < monthStart ? monthStart : s;
    const clampedEnd = e > monthEnd ? monthEnd : e;

    const leftDay = differenceInDays(clampedStart, monthStart);
    const width = differenceInDays(clampedEnd, clampedStart) + 1;

    return {
      left: `${(leftDay / totalDays) * 100}%`,
      width: `${(width / totalDays) * 100}%`,
    };
  };

  const getMemberName = (id?: string) => members.find(m => m.id === id)?.name;

  const weekMarkers = days.filter((_, i) => i % 7 === 0);

  if (timelineTasks.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="font-medium">{t.workspace.noTasksWithDates}</p>
        <p className="text-sm">{t.workspace.setDatesForTimeline}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: dateLocale })}
        </h3>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setCurrentMonth(new Date())}>
            {t.workspace.today}
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="flex bg-muted/50 border-b">
          <div className="w-[200px] shrink-0 px-3 py-2 text-xs font-medium text-muted-foreground border-r">
            {t.workspace.task}
          </div>
          <div className="flex-1 relative">
            <div className="flex">
              {days.map((day, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex-1 text-center text-[10px] py-2 border-r border-border/30',
                    day.getDay() === 0 || day.getDay() === 6 ? 'bg-muted/30 text-muted-foreground/60' : 'text-muted-foreground',
                    format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') && 'bg-primary/10 font-bold text-primary',
                  )}
                >
                  {format(day, 'd')}
                </div>
              ))}
            </div>
          </div>
        </div>

        {timelineTasks.map(task => {
          const barStyle = getBarStyle(task);
          return (
            <div key={task.id} className="flex border-b last:border-b-0 hover:bg-muted/20 transition-colors">
              <div className="w-[200px] shrink-0 px-3 py-2 border-r">
                <p className="text-xs font-medium truncate" title={task.title}>{task.title}</p>
                {getMemberName(task.assigneeId) && (
                  <p className="text-[10px] text-muted-foreground truncate">{getMemberName(task.assigneeId)}</p>
                )}
              </div>
              <div className="flex-1 relative py-2 px-1">
                <div
                  className={cn('absolute top-1/2 -translate-y-1/2 h-5 rounded-full', STATUS_BAR[task.status])}
                  style={barStyle}
                  title={`${task.startDate ? format(new Date(task.startDate), 'dd/MM') : '?'} — ${task.dueDate ? format(new Date(task.dueDate), 'dd/MM') : '?'}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
