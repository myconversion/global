import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import {
  ChevronLeft, ChevronRight, Phone, Mail, Users, MapPin,
  MessageCircle, CheckSquare, Plus
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths,
  isPast, isSameDay
} from 'date-fns';
import { useI18n } from '@/contexts/I18nContext';
import { getDateLocale } from '@/i18n/date-locale';
import { cn } from '@/lib/utils';

interface CRMFollowup {
  id: string;
  type: string;
  description: string | null;
  scheduled_at: string;
  is_completed: boolean;
  completed_at: string | null;
  contact_id: string | null;
  crm_company_id: string | null;
  deal_id: string | null;
  assigned_to: string | null;
}

const TYPE_COLORS: Record<string, string> = {
  call: 'bg-blue-500',
  email: 'bg-amber-500',
  meeting: 'bg-violet-500',
  visit: 'bg-emerald-500',
  whatsapp: 'bg-green-500',
  task: 'bg-primary',
  other: 'bg-muted-foreground',
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  call: Phone,
  email: Mail,
  meeting: Users,
  visit: MapPin,
  whatsapp: MessageCircle,
  task: CheckSquare,
  other: CheckSquare,
};

interface Props {
  followups: CRMFollowup[];
  typeLabels: Record<string, string>;
  contacts: Record<string, string>;
  companies: Record<string, string>;
  onToggleComplete: (f: CRMFollowup) => void;
}

export default function CRMTasksCalendarView({
  followups,
  typeLabels,
  contacts,
  companies,
  onToggleComplete,
}: Props) {
  const { t, language } = useI18n();
  const dateLocale = getDateLocale(language);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const tasksByDate = useMemo(() => {
    const map = new Map<string, CRMFollowup[]>();
    followups.forEach((f) => {
      const key = f.scheduled_at.split('T')[0];
      map.set(key, [...(map.get(key) ?? []), f]);
    });
    return map;
  }, [followups]);

  // Dates that have tasks — used for calendar dot indicators
  const datesWithTasks = useMemo(() => {
    const set = new Set<string>();
    followups.forEach((f) => set.add(f.scheduled_at.split('T')[0]));
    return set;
  }, [followups]);

  const selectedKey = format(selectedDate, 'yyyy-MM-dd');
  const selectedTasks = tasksByDate.get(selectedKey) ?? [];

  // Month grid
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
      {/* Main calendar grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: dateLocale })}
          </h3>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setCurrentMonth(new Date());
                setSelectedDate(new Date());
              }}
            >
              {t.workspace.today}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 border rounded-lg overflow-hidden">
          {weekDays.map((d) => (
            <div
              key={d}
              className="px-2 py-1.5 text-xs font-medium text-muted-foreground text-center bg-muted/50 border-b"
            >
              {d}
            </div>
          ))}
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const dayTasks = tasksByDate.get(key) ?? [];
            const inMonth = isSameMonth(day, currentMonth);
            const isSelected = isSameDay(day, selectedDate);
            const hasOverdue = dayTasks.some(
              (f) =>
                !f.is_completed &&
                isPast(new Date(f.scheduled_at)) &&
                !isToday(new Date(f.scheduled_at))
            );

            return (
              <button
                key={key}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  'min-h-[80px] border-b border-r p-1.5 transition-colors text-left hover:bg-accent/40 relative',
                  !inMonth && 'bg-muted/30',
                  isToday(day) && 'bg-primary/5',
                  isSelected && 'ring-2 ring-primary ring-inset bg-primary/10'
                )}
              >
                <span
                  className={cn(
                    'text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full',
                    isToday(day) && 'bg-primary text-primary-foreground',
                    !inMonth && 'text-muted-foreground/40'
                  )}
                >
                  {format(day, 'd')}
                </span>
                {dayTasks.length > 0 && (
                  <div className="mt-0.5 flex flex-wrap gap-0.5">
                    {dayTasks.slice(0, 5).map((f) => (
                      <div
                        key={f.id}
                        className={cn(
                          'w-2 h-2 rounded-full',
                          f.is_completed
                            ? 'bg-muted-foreground/30'
                            : TYPE_COLORS[f.type] || 'bg-primary'
                        )}
                        title={f.description || typeLabels[f.type] || f.type}
                      />
                    ))}
                    {dayTasks.length > 5 && (
                      <span className="text-[9px] text-muted-foreground leading-none">
                        +{dayTasks.length - 5}
                      </span>
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

      {/* Right sidebar — mini calendar + selected day detail */}
      <div className="space-y-4">
        {/* Mini calendar picker */}
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
                hasTasks: (date: Date) =>
                  datesWithTasks.has(format(date, 'yyyy-MM-dd')),
              }}
              modifiersClassNames={{
                hasTasks: 'font-bold text-primary',
              }}
            />
          </CardContent>
        </Card>

        {/* Selected day tasks */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">
              {format(selectedDate, 'PPP', { locale: dateLocale })}
            </h4>
            {selectedTasks.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {selectedTasks.length}
              </Badge>
            )}
          </div>

          {selectedTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {t.crm.noCrmTasks}
            </p>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {selectedTasks.map((f) => {
                const Icon = TYPE_ICONS[f.type] || CheckSquare;
                const overdue =
                  !f.is_completed &&
                  isPast(new Date(f.scheduled_at)) &&
                  !isToday(new Date(f.scheduled_at));
                const contactName = f.contact_id
                  ? contacts[f.contact_id]
                  : null;
                const companyName = f.crm_company_id
                  ? companies[f.crm_company_id]
                  : null;

                return (
                  <Card
                    key={f.id}
                    className={cn(
                      'hover:shadow-sm transition-shadow',
                      overdue && 'border-destructive/40'
                    )}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <button
                        onClick={() => onToggleComplete(f)}
                        className={cn(
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                          f.is_completed
                            ? 'bg-green-500 border-green-500'
                            : 'border-muted-foreground/30 hover:border-primary'
                        )}
                        aria-label={
                          f.is_completed
                            ? t.crm.completed
                            : t.crm.pending
                        }
                      >
                        {f.is_completed && (
                          <CheckSquare className="w-3 h-3 text-white" />
                        )}
                      </button>
                      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            'text-sm font-medium truncate',
                            f.is_completed &&
                              'line-through text-muted-foreground'
                          )}
                        >
                          {f.description || typeLabels[f.type] || 'Follow-up'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          {contactName && <span>{contactName}</span>}
                          {companyName && <span>{companyName}</span>}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {format(new Date(f.scheduled_at), 'HH:mm')}
                      </span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
