import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths
} from 'date-fns';
import { useProjectsContext } from '@/contexts/ProjectsContext';
import { useI18n } from '@/contexts/I18nContext';
import { getDateLocale } from '@/i18n/date-locale';
import { Task, TaskStatus } from '@/types/index';
import { cn } from '@/lib/utils';

interface WorkspaceCalendarViewProps {
  deliverableId: string;
}

const STATUS_DOT: Record<TaskStatus, string> = {
  todo: 'bg-muted-foreground',
  in_progress: 'bg-primary',
  review: 'bg-warning',
  done: 'bg-green-500',
  blocked: 'bg-destructive',
};

export default function WorkspaceCalendarView({ deliverableId }: WorkspaceCalendarViewProps) {
  const { getDeliverableTasks } = useProjectsContext();
  const { t, language } = useI18n();
  const dateLocale = getDateLocale(language);
  const tasks = getDeliverableTasks(deliverableId);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach(t => {
      if (t.dueDate) {
        const key = t.dueDate.split('T')[0];
        map.set(key, [...(map.get(key) ?? []), t]);
      }
    });
    return map;
  }, [tasks]);

  const weekDays = [
    t.workspace.weekSun, t.workspace.weekMon, t.workspace.weekTue,
    t.workspace.weekWed, t.workspace.weekThu, t.workspace.weekFri, t.workspace.weekSat
  ];

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

      <div className="grid grid-cols-7 border rounded-lg overflow-hidden">
        {weekDays.map(d => (
          <div key={d} className="px-2 py-1.5 text-xs font-medium text-muted-foreground text-center bg-muted/50 border-b">
            {d}
          </div>
        ))}
        {days.map(day => {
          const key = format(day, 'yyyy-MM-dd');
          const dayTasks = tasksByDate.get(key) ?? [];
          const inMonth = isSameMonth(day, currentMonth);

          return (
            <div
              key={key}
              className={cn(
                'min-h-[100px] border-b border-r p-1.5 transition-colors',
                !inMonth && 'bg-muted/30',
                isToday(day) && 'bg-primary/5',
              )}
            >
              <span className={cn(
                'text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full',
                isToday(day) && 'bg-primary text-primary-foreground',
                !inMonth && 'text-muted-foreground/40',
              )}>
                {format(day, 'd')}
              </span>
              <div className="mt-0.5 space-y-0.5">
                {dayTasks.slice(0, 3).map(t => (
                  <div
                    key={t.id}
                    className="flex items-center gap-1 px-1 py-0.5 rounded text-[10px] leading-tight bg-card border truncate"
                    title={t.title}
                  >
                    <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', STATUS_DOT[t.status])} />
                    <span className="truncate">{t.title}</span>
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <span className="text-[10px] text-muted-foreground pl-1">+{dayTasks.length - 3} {t.workspace.more}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
