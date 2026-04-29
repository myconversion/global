import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  ChevronLeft, ChevronRight, CheckSquare, AlertTriangle, User, Plus,
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths,
  isPast, isSameDay,
} from 'date-fns';
import { useI18n } from '@/contexts/I18nContext';
import { getDateLocale } from '@/i18n/date-locale';
import { cn } from '@/lib/utils';
import CreateTaskFromCalendarDialog from './CreateTaskFromCalendarDialog';
import type { Task, TaskPriority } from '@/types/index';

const PRIORITY_DOT: Record<TaskPriority, string> = {
  urgent: 'bg-destructive',
  high: 'bg-warning',
  medium: 'bg-primary',
  low: 'bg-muted-foreground',
};

interface Props {
  tasks: Task[];
  onToggleDone: (task: Task) => void;
  getMemberName: (id: string) => string;
  getProjectName: (task: Task) => string | undefined;
  priorityLabels: Record<TaskPriority, string>;
  statusLabels: Record<string, string>;
}

export default function TasksCalendarView({
  tasks, onToggleDone, getMemberName, getProjectName, priorityLabels, statusLabels,
}: Props) {
  const { t, language } = useI18n();
  const dateLocale = getDateLocale(language);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDialogDate, setCreateDialogDate] = useState<Date>(new Date());

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((task) => {
      const dateStr = task.dueDate;
      if (!dateStr) return;
      const key = dateStr.split('T')[0];
      map.set(key, [...(map.get(key) ?? []), task]);
    });
    return map;
  }, [tasks]);

  const datesWithTasks = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((task) => {
      if (task.dueDate) set.add(task.dueDate.split('T')[0]);
    });
    return set;
  }, [tasks]);

  const selectedKey = format(selectedDate, 'yyyy-MM-dd');
  const selectedTasks = tasksByDate.get(selectedKey) ?? [];

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const weekDays = [
    t.workspace.weekSun, t.workspace.weekMon, t.workspace.weekTue,
    t.workspace.weekWed, t.workspace.weekThu, t.workspace.weekFri,
    t.workspace.weekSat,
  ];

  const isOverdue = (task: Task) => {
    if (!task.dueDate || task.status === 'done') return false;
    const due = new Date(task.dueDate);
    return isPast(due) && !isToday(due);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
      {/* Main calendar grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: dateLocale })}
          </h3>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setCurrentMonth(new Date()); setSelectedDate(new Date()); }}>
              {t.workspace.today}
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 border rounded-lg overflow-hidden">
          {weekDays.map((d) => (
            <div key={d} className="px-2 py-1.5 text-xs font-medium text-muted-foreground text-center bg-muted/50 border-b">
              {d}
            </div>
          ))}
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const dayTasks = tasksByDate.get(key) ?? [];
            const inMonth = isSameMonth(day, currentMonth);
            const isSelected = isSameDay(day, selectedDate);
            const hasOverdue = dayTasks.some((task) => isOverdue(task));

            return (
              <button
                key={key}
                onClick={() => setSelectedDate(day)}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  setCreateDialogDate(day);
                  setCreateDialogOpen(true);
                }}
                className={cn(
                  'min-h-[80px] border-b border-r p-1.5 transition-colors text-left hover:bg-accent/40 relative group/cell',
                  !inMonth && 'bg-muted/30',
                  isToday(day) && 'bg-primary/5',
                  isSelected && 'ring-2 ring-primary ring-inset bg-primary/10',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn(
                    'text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full',
                    isToday(day) && 'bg-primary text-primary-foreground',
                    !inMonth && 'text-muted-foreground/40',
                  )}>
                    {format(day, 'd')}
                  </span>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setCreateDialogDate(day);
                      setCreateDialogOpen(true);
                    }}
                    className="w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground opacity-0 group-hover/cell:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </span>
                </div>
                {dayTasks.length > 0 && (
                  <div className="mt-0.5 flex flex-wrap gap-0.5">
                    {dayTasks.slice(0, 5).map((task) => (
                      <div
                        key={task.id}
                        className={cn(
                          'w-2 h-2 rounded-full',
                          task.status === 'done' ? 'bg-muted-foreground/30' : PRIORITY_DOT[task.priority],
                        )}
                        title={task.title}
                      />
                    ))}
                    {dayTasks.length > 5 && (
                      <span className="text-[9px] text-muted-foreground leading-none">+{dayTasks.length - 5}</span>
                    )}
                  </div>
                )}
                {hasOverdue && (
                  <div className="w-1.5 h-1.5 rounded-full bg-destructive absolute top-1 right-1" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right sidebar */}
      <div className="space-y-4">
        <Card>
          <CardContent className="p-2">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => {
                if (d) {
                  setSelectedDate(d);
                  setCurrentMonth(startOfMonth(d));
                }
              }}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              locale={dateLocale}
              className="p-1 pointer-events-auto"
              modifiers={{
                hasTasks: (date: Date) => datesWithTasks.has(format(date, 'yyyy-MM-dd')),
              }}
              modifiersClassNames={{
                hasTasks: 'font-bold text-primary',
              }}
            />
          </CardContent>
        </Card>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">
              {format(selectedDate, 'PPP', { locale: dateLocale })}
            </h4>
            <div className="flex items-center gap-1.5">
              {selectedTasks.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">{selectedTasks.length}</Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  setCreateDialogDate(selectedDate);
                  setCreateDialogOpen(true);
                }}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {selectedTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {t.tasks.noTasksYet}
            </p>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {selectedTasks.map((task) => {
                const overdue = isOverdue(task);
                const projName = getProjectName(task);
                return (
                  <Card key={task.id} className={cn('hover:shadow-sm transition-shadow', overdue && 'border-destructive/40')}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <button
                        onClick={() => onToggleDone(task)}
                        className={cn(
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                          task.status === 'done'
                            ? 'bg-success border-success'
                            : 'border-muted-foreground/30 hover:border-primary',
                        )}
                        aria-label={task.status === 'done' ? statusLabels.done : statusLabels.todo}
                      >
                        {task.status === 'done' && <CheckSquare className="w-3 h-3 text-success-foreground" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-medium truncate', task.status === 'done' && 'line-through text-muted-foreground')}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          {projName && <span>{projName}</span>}
                          {task.assigneeId && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {getMemberName(task.assigneeId)}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge className={cn('text-[10px] border-0 shrink-0', PRIORITY_DOT[task.priority].replace('bg-', 'bg-') + '/10 text-foreground')}>
                        {priorityLabels[task.priority]}
                      </Badge>
                      {overdue && <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <CreateTaskFromCalendarDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        selectedDate={createDialogDate}
      />
    </div>
  );
}
