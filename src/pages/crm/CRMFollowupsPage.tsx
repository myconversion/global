import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { getDateLocale } from '@/i18n/date-locale';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  CalendarCheck, Plus, Loader2, Phone, Mail, MessageCircle,
  Video, MapPin, FileText, Clock, RotateCw, List, CalendarDays
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import FollowupCalendar, { type CalendarViewMode } from '@/components/crm/FollowupCalendar';

const TYPE_ICONS: Record<string, React.ElementType> = {
  call: Phone, email: Mail, whatsapp: MessageCircle,
  meeting: Video, visit: MapPin, proposal: FileText,
};

interface Followup {
  id: string; type: string; scheduled_at: string; description: string | null;
  is_completed: boolean; completed_at: string | null; snoozed_to: string | null;
  contact_id: string | null; crm_company_id: string | null; deal_id: string | null;
  assigned_to: string | null; created_at: string;
}

export default function CRMFollowupsPage() {
  const { currentCompany, supabaseUser, role } = useAuth();
  const { t, language } = useI18n();
  const { toast } = useToast();
  const dateLocale = getDateLocale(language);

  const TYPE_LABELS: Record<string, string> = {
    call: t.crm.call, email: t.crm.email, whatsapp: 'WhatsApp',
    meeting: t.crm.meetingType, visit: t.crm.visitType,
    proposal: t.crm.proposalType,
  };

  const [followups, setFollowups] = useState<Followup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | CalendarViewMode>('list');
  const [formType, setFormType] = useState<string>('call');
  const [formScheduledAt, setFormScheduledAt] = useState('');
  const [formDescription, setFormDescription] = useState('');

  const isManager = role === 'admin' || role === 'super_admin';

  const fetchFollowups = async () => {
    if (!currentCompany) return;
    setLoading(true);
    let query = supabase.from('crm_followups').select('*').eq('company_id', currentCompany.id).order('scheduled_at');
    if (!showAll || !isManager) query = query.eq('assigned_to', supabaseUser?.id ?? '');
    const { data } = await query;
    if (data) setFollowups(data as Followup[]);
    setLoading(false);
  };

  useEffect(() => { fetchFollowups(); }, [currentCompany, showAll]);

  const handleCreate = async () => {
    if (!formScheduledAt || !currentCompany) return;
    const { error } = await supabase.from('crm_followups').insert({
      company_id: currentCompany.id, type: formType as any, scheduled_at: formScheduledAt,
      description: formDescription || null, assigned_to: supabaseUser?.id, created_by: supabaseUser?.id,
    });
    if (error) toast({ title: t.crm.errorCreatingFollowup, variant: 'destructive' });
    else {
      toast({ title: t.crm.followupCreated });
      setDialogOpen(false); setFormType('call'); setFormScheduledAt(''); setFormDescription('');
      fetchFollowups();
    }
  };

  const toggleComplete = async (id: string, current: boolean) => {
    await supabase.from('crm_followups').update({ is_completed: !current, completed_at: !current ? new Date().toISOString() : null }).eq('id', id);
    fetchFollowups();
  };

  const snooze = async (id: string) => {
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(9, 0, 0, 0);
    await supabase.from('crm_followups').update({ snoozed_to: tomorrow.toISOString(), scheduled_at: tomorrow.toISOString() }).eq('id', id);
    toast({ title: t.crm.rescheduledTomorrow });
    fetchFollowups();
  };

  const pending = followups.filter(f => !f.is_completed);
  const completed = followups.filter(f => f.is_completed);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-primary" /> {t.crm.followupsTitle}
          </h1>
          <p className="text-sm text-muted-foreground">{t.crm.followupsDesc}</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as typeof viewMode)} size="sm">
            <ToggleGroupItem value="list" aria-label="List"><List className="w-4 h-4" /></ToggleGroupItem>
            <ToggleGroupItem value="month" aria-label="Month"><CalendarDays className="w-4 h-4" /></ToggleGroupItem>
            <ToggleGroupItem value="week" aria-label="Week">W</ToggleGroupItem>
            <ToggleGroupItem value="day" aria-label="Day">D</ToggleGroupItem>
          </ToggleGroup>
          {isManager && (
            <Button variant={showAll ? 'default' : 'outline'} size="sm" onClick={() => setShowAll(!showAll)}>
              {showAll ? t.crm.wholeTeam : t.crm.mySchedule}
            </Button>
          )}
          <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
            <Plus className="w-3.5 h-3.5" /> {t.crm.new}
          </Button>
        </div>
      </div>

      {viewMode !== 'list' ? (
        <FollowupCalendar followups={followups} viewMode={viewMode} onToggleComplete={toggleComplete} onSnooze={snooze} />
      ) : (
        <>
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">{t.crm.pendingLabel} ({pending.length})</h2>
            {pending.length === 0 ? (
              <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarCheck className="w-10 h-10 text-muted-foreground/40 mb-2" />
                <p className="text-muted-foreground text-sm">{t.crm.noPendingFollowups}</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-2">
                {pending.map(f => {
                  const Icon = TYPE_ICONS[f.type] || Clock;
                  const date = parseISO(f.scheduled_at);
                  const overdue = isPast(date) && !isToday(date);
                  return (
                    <Card key={f.id} className={overdue ? 'border-destructive/50' : ''}>
                      <CardContent className="p-3 flex items-center gap-3">
                        <Checkbox checked={false} onCheckedChange={() => toggleComplete(f.id, false)} />
                        <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {TYPE_LABELS[f.type]}
                            {f.description && <span className="text-muted-foreground font-normal"> — {f.description}</span>}
                          </p>
                          <p className={`text-xs ${overdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                            {overdue && `⚠ ${t.crm.overdueLabel} · `}
                            {isToday(date) ? t.crm.today : isTomorrow(date) ? t.crm.tomorrow : format(date, "dd/MM/yyyy", { locale: dateLocale })}
                            {' @ '}
                            {format(date, 'HH:mm')}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => snooze(f.id)} title={t.crm.reschedule}>
                          <RotateCw className="w-3.5 h-3.5" />
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {completed.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground">{t.crm.completedLabel} ({completed.length})</h2>
              {completed.map(f => {
                const Icon = TYPE_ICONS[f.type] || Clock;
                return (
                  <Card key={f.id} className="opacity-60">
                    <CardContent className="p-3 flex items-center gap-3">
                      <Checkbox checked onCheckedChange={() => toggleComplete(f.id, true)} />
                      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <p className="text-sm text-muted-foreground line-through flex-1">
                        {TYPE_LABELS[f.type]} {f.description && `— ${f.description}`}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.crm.newFollowup}</DialogTitle>
            <DialogDescription>{t.crm.newFollowupDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t.crm.type}</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t.crm.dateTime} *</Label>
              <Input type="datetime-local" value={formScheduledAt} onChange={e => setFormScheduledAt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t.crm.description}</Label>
              <Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder={t.common.observations} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={handleCreate} disabled={!formScheduledAt}>{t.common.create}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
