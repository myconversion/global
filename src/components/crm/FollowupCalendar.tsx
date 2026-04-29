import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronLeft, ChevronRight, Phone, Mail, MessageCircle, Video, MapPin, FileText, Clock, RotateCw } from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday,
  addMonths, subMonths, addWeeks, subWeeks, addDays, subDays,
  parseISO, isPast, startOfDay
} from 'date-fns';
import { useI18n } from '@/contexts/I18nContext';
import { getDateLocale } from '@/i18n/date-locale';
import { cn } from '@/lib/utils';

const TYPE_ICONS: Record<string, React.ElementType> = {
  call: Phone, email: Mail, whatsapp: MessageCircle,
  meeting: Video, visit: MapPin, proposal: FileText,
};
const TYPE_COLORS: Record<string, string> = {
  call: 'bg-blue-500', email: 'bg-amber-500', whatsapp: 'bg-green-500',
  meeting: 'bg-purple-500', visit: 'bg-rose-500', proposal: 'bg-cyan-500',
};

export type CalendarViewMode = 'month' | 'week' | 'day';

interface Followup {
  id: string; type: string; scheduled_at: string; description: string | null;
  is_completed: boolean; completed_at: string | null; snoozed_to: string | null;
  contact_id: string | null; crm_company_id: string | null; deal_id: string | null;
  assigned_to: string | null; created_at: string;
}

interface FollowupCalendarProps {
  followups: Followup[]; viewMode: CalendarViewMode;
  onToggleComplete: (id: string, current: boolean) => void; onSnooze: (id: string) => void;
}

export default function FollowupCalendar({ followups, viewMode, onToggleComplete, onSnooze }: FollowupCalendarProps) {
  const { t, language } = useI18n();
  const dateLocale = getDateLocale(language);
  const [currentDate, setCurrentDate] = useState(new Date());

  const TYPE_LABELS: Record<string, string> = {
    call: t.crm.call, email: t.crm.email, whatsapp: 'WhatsApp',
    meeting: t.crm.meetingType, visit: t.crm.visitType,
    proposal: t.crm.proposalType,
  };

  const navigate = (dir: 1 | -1) => {
    if (viewMode === 'month') setCurrentDate(d => dir === 1 ? addMonths(d, 1) : subMonths(d, 1));
    else if (viewMode === 'week') setCurrentDate(d => dir === 1 ? addWeeks(d, 1) : subWeeks(d, 1));
    else setCurrentDate(d => dir === 1 ? addDays(d, 1) : subDays(d, 1));
  };

  const goToday = () => setCurrentDate(new Date());

  const headerLabel = useMemo(() => {
    if (viewMode === 'month') return format(currentDate, 'MMMM yyyy', { locale: dateLocale });
    if (viewMode === 'week') {
      const s = startOfWeek(currentDate, { weekStartsOn: 0 });
      const e = endOfWeek(currentDate, { weekStartsOn: 0 });
      return `${format(s, 'dd MMM', { locale: dateLocale })} — ${format(e, 'dd MMM yyyy', { locale: dateLocale })}`;
    }
    return format(currentDate, "EEEE, dd MMMM yyyy", { locale: dateLocale });
  }, [currentDate, viewMode, dateLocale]);

  const days = useMemo(() => {
    if (viewMode === 'month') {
      const ms = startOfMonth(currentDate); const me = endOfMonth(currentDate);
      return eachDayOfInterval({ start: startOfWeek(ms, { weekStartsOn: 0 }), end: endOfWeek(me, { weekStartsOn: 0 }) });
    }
    if (viewMode === 'week') return eachDayOfInterval({ start: startOfWeek(currentDate, { weekStartsOn: 0 }), end: endOfWeek(currentDate, { weekStartsOn: 0 }) });
    return [startOfDay(currentDate)];
  }, [currentDate, viewMode]);

  const followupsByDay = useMemo(() => {
    const map = new Map<string, Followup[]>();
    followups.forEach(f => {
      const key = format(parseISO(f.scheduled_at), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(f);
    });
    map.forEach((list) => list.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)));
    return map;
  }, [followups]);

  // Generate weekday headers using locale
  const weekDayHeaders = useMemo(() => {
    const refDate = startOfWeek(new Date(), { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => format(addDays(refDate, i), 'EEE', { locale: dateLocale }));
  }, [dateLocale]);

  if (viewMode === 'day') {
    const key = format(currentDate, 'yyyy-MM-dd');
    const dayFollowups = followupsByDay.get(key) || [];
    return (
      <div className="space-y-3">
        <CalendarHeader label={headerLabel} onPrev={() => navigate(-1)} onNext={() => navigate(1)} onToday={goToday} todayLabel={t.crm.today} />
        {dayFollowups.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">{t.crm.noPendingFollowups}</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {dayFollowups.map(f => (
              <FollowupItem key={f.id} followup={f} onToggle={onToggleComplete} onSnooze={onSnooze} expanded typeLabels={TYPE_LABELS} overdueLabel={t.crm.overdueLabel} rescheduleLabel={t.crm.reschedule} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <CalendarHeader label={headerLabel} onPrev={() => navigate(-1)} onNext={() => navigate(1)} onToday={goToday} todayLabel={t.crm.today} />
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
        {weekDayHeaders.map(d => (
          <div key={d} className="bg-muted px-2 py-1.5 text-xs font-medium text-muted-foreground text-center">{d}</div>
        ))}
        {days.map(day => {
          const key = format(day, 'yyyy-MM-dd');
          const items = followupsByDay.get(key) || [];
          const inMonth = viewMode === 'week' || isSameMonth(day, currentDate);
          const today = isToday(day);
          return (
            <div key={key} className={cn('bg-background min-h-[80px] p-1 transition-colors', viewMode === 'week' && 'min-h-[140px]', !inMonth && 'opacity-40')}>
              <div className={cn('text-xs font-medium mb-0.5 w-6 h-6 flex items-center justify-center rounded-full mx-auto', today && 'bg-primary text-primary-foreground', !today && 'text-foreground')}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {items.slice(0, viewMode === 'week' ? 5 : 3).map(f => (
                  <FollowupDot key={f.id} followup={f} typeLabels={TYPE_LABELS} />
                ))}
                {items.length > (viewMode === 'week' ? 5 : 3) && (
                  <p className="text-[10px] text-muted-foreground text-center">+{items.length - (viewMode === 'week' ? 5 : 3)}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CalendarHeader({ label, onPrev, onNext, onToday, todayLabel }: { label: string; onPrev: () => void; onNext: () => void; onToday: () => void; todayLabel: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={onPrev}><ChevronLeft className="w-4 h-4" /></Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={onNext}><ChevronRight className="w-4 h-4" /></Button>
        <Button variant="ghost" size="sm" onClick={onToday} className="text-xs">{todayLabel}</Button>
      </div>
      <h3 className="text-sm font-semibold text-foreground capitalize">{label}</h3>
    </div>
  );
}

function FollowupDot({ followup, typeLabels }: { followup: Followup; typeLabels: Record<string, string> }) {
  const colorClass = TYPE_COLORS[followup.type] || 'bg-muted-foreground';
  const time = format(parseISO(followup.scheduled_at), 'HH:mm');
  return (
    <div className={cn('flex items-center gap-1 rounded px-1 py-0.5 text-[10px] truncate', followup.is_completed ? 'opacity-40 line-through' : '', isPast(parseISO(followup.scheduled_at)) && !isToday(parseISO(followup.scheduled_at)) && !followup.is_completed ? 'bg-destructive/10 text-destructive' : 'bg-muted')}>
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', colorClass)} />
      <span className="font-medium">{time}</span>
      <span className="truncate text-muted-foreground">{typeLabels[followup.type]}</span>
    </div>
  );
}

function FollowupItem({ followup, onToggle, onSnooze, expanded, typeLabels, overdueLabel, rescheduleLabel }: { followup: Followup; onToggle: (id: string, current: boolean) => void; onSnooze: (id: string) => void; expanded?: boolean; typeLabels: Record<string, string>; overdueLabel: string; rescheduleLabel: string }) {
  const Icon = TYPE_ICONS[followup.type] || Clock;
  const date = parseISO(followup.scheduled_at);
  const overdue = isPast(date) && !isToday(date) && !followup.is_completed;
  return (
    <Card className={cn(overdue && 'border-destructive/50', followup.is_completed && 'opacity-60')}>
      <CardContent className="p-3 flex items-center gap-3">
        <Checkbox checked={followup.is_completed} onCheckedChange={() => onToggle(followup.id, followup.is_completed)} />
        <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium', followup.is_completed ? 'line-through text-muted-foreground' : 'text-foreground')}>
            {typeLabels[followup.type]}
            {followup.description && <span className="text-muted-foreground font-normal"> — {followup.description}</span>}
          </p>
          <p className={cn('text-xs', overdue ? 'text-destructive font-medium' : 'text-muted-foreground')}>
            {overdue && `⚠ ${overdueLabel} · `}
            {format(date, 'HH:mm')}
          </p>
        </div>
        {!followup.is_completed && (
          <Button variant="ghost" size="sm" onClick={() => onSnooze(followup.id)} title={rescheduleLabel}>
            <RotateCw className="w-3.5 h-3.5" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
