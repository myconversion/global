import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Bell, CheckCircle2, Clock, AlertTriangle, Activity, Loader2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { formatDistanceToNow } from 'date-fns';
import { getDateLocale } from '@/i18n/date-locale';
import { toast } from 'sonner';

interface TaskNotification { id: string; title: string; dueDate: string; type: 'project' | 'crm'; isOverdue: boolean; }
interface ActivityNotification { id: string; action: string; entity: string; entity_name: string | null; created_at: string; }

export function NotificationBell() {
  const { user, currentCompany } = useAuth();
  const { t, language } = useI18n();
  const dateLocale = getDateLocale(language);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<TaskNotification[]>([]);
  const [activities, setActivities] = useState<ActivityNotification[]>([]);
  const [realtimeBadge, setRealtimeBadge] = useState(0);
  const initialLoadDone = useRef(false);

  const ACTION_LABELS: Record<string, string> = {
    create: t.notifications.actionCreated,
    update: t.notifications.actionUpdated,
    delete: t.notifications.actionDeleted,
  };

  const loadNotifications = useCallback(async () => {
    if (!user?.id || !currentCompany?.id) return;
    setLoading(true);
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const [tasksRes, followupsRes, activityRes] = await Promise.all([
      supabase.from('tasks').select('id, title, due_date, status').eq('company_id', currentCompany.id).eq('assignee_id', user.id).neq('status', 'done').not('due_date', 'is', null).lte('due_date', threeDaysFromNow).order('due_date', { ascending: true }).limit(20),
      supabase.from('crm_followups').select('id, description, scheduled_at, is_completed, type').eq('company_id', currentCompany.id).eq('assigned_to', user.id).eq('is_completed', false).lte('scheduled_at', threeDaysFromNow).order('scheduled_at', { ascending: true }).limit(20),
      supabase.from('activity_logs').select('id, action, entity, entity_name, created_at').eq('company_id', currentCompany.id).order('created_at', { ascending: false }).limit(15),
    ]);
    const projectTasks: TaskNotification[] = (tasksRes.data ?? []).map(t => ({ id: t.id, title: t.title, dueDate: t.due_date!, type: 'project' as const, isOverdue: new Date(t.due_date!) < new Date() }));
    const crmTasks: TaskNotification[] = (followupsRes.data ?? []).map(f => ({ id: f.id, title: f.description || `Follow-up: ${f.type}`, dueDate: f.scheduled_at, type: 'crm' as const, isOverdue: new Date(f.scheduled_at) < new Date() }));
    setTasks([...projectTasks, ...crmTasks].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()));
    setActivities(activityRes.data ?? []);
    setLoading(false);
    setRealtimeBadge(0);
    initialLoadDone.current = true;
  }, [user?.id, currentCompany?.id]);

  useEffect(() => { if (open) loadNotifications(); }, [open, loadNotifications]);
  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  useEffect(() => {
    if (!currentCompany?.id || !user?.id) return;
    const channel = supabase
      .channel(`notifications-${currentCompany.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `company_id=eq.${currentCompany.id}` }, (payload) => {
        if (!initialLoadDone.current) return;
        const record = payload.new as any;
        if (payload.eventType === 'INSERT' && record?.assignee_id === user.id) {
          toast.info(`📋 ${t.notifications.newTaskAssigned}`, { description: record.title, duration: 5000 });
          setRealtimeBadge(prev => prev + 1);
        } else if (payload.eventType === 'UPDATE') { setRealtimeBadge(prev => prev + 1); }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_followups', filter: `company_id=eq.${currentCompany.id}` }, (payload) => {
        if (!initialLoadDone.current) return;
        const record = payload.new as any;
        if (payload.eventType === 'INSERT' && record?.assigned_to === user.id) {
          toast.info(`📞 ${t.notifications.newFollowupScheduled}`, { description: record.description || t.notifications.checkTasks, duration: 5000 });
          setRealtimeBadge(prev => prev + 1);
        } else { setRealtimeBadge(prev => prev + 1); }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs', filter: `company_id=eq.${currentCompany.id}` }, (payload) => {
        if (!initialLoadDone.current) return;
        const record = payload.new as any;
        if (record?.user_id !== user.id) { setRealtimeBadge(prev => prev + 1); }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'communication_messages', filter: `company_id=eq.${currentCompany.id}` }, (payload) => {
        if (!initialLoadDone.current) return;
        const record = payload.new as any;
        if (record?.sender_type === 'contact') {
          toast.info(`💬 ${t.notifications.newMessageReceived}`, { description: record.content?.slice(0, 80) || t.notifications.checkInbox, duration: 5000 });
          setRealtimeBadge(prev => prev + 1);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentCompany?.id, user?.id, t]);

  const overdueCount = useMemo(() => tasks.filter(t => t.isOverdue).length, [tasks]);
  const totalCount = overdueCount + realtimeBadge;

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) setRealtimeBadge(0); }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150">
          <Bell className="w-4.5 h-4.5" />
          {totalCount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1 animate-in zoom-in-50 duration-200">
              {totalCount > 9 ? '9+' : totalCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <Tabs defaultValue="tasks" className="w-full">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">{t.notifications.title}</h3>
            <div className="flex items-center gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[10px] text-muted-foreground">{t.notifications.realtime}</span>
            </div>
          </div>
          <TabsList className="w-full justify-start px-4 bg-transparent border-b border-border rounded-none h-auto pb-0">
            <TabsTrigger value="tasks" className="text-xs data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2">
              <Clock className="w-3.5 h-3.5 mr-1" /> {t.notifications.tasks}
              {overdueCount > 0 && <Badge variant="destructive" className="ml-1.5 text-[10px] h-4 px-1">{overdueCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="activity" className="text-xs data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2">
              <Activity className="w-3.5 h-3.5 mr-1" /> {t.notifications.activities}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tasks" className="m-0">
            <ScrollArea className="max-h-80">
              {loading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin mr-2" /> {t.common.loading}</div>
              ) : tasks.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 mb-2 text-emerald-500" />
                  <p className="text-sm">{t.notifications.noTasksPending}</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {tasks.map(tk => (
                    <div key={tk.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                      <div className="mt-0.5">
                        {tk.isOverdue ? <AlertTriangle className="w-4 h-4 text-destructive" /> : <Clock className="w-4 h-4 text-amber-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{tk.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant={tk.type === 'project' ? 'secondary' : 'outline'} className="text-[10px] h-4 px-1.5">
                            {tk.type === 'project' ? t.notifications.project : 'CRM'}
                          </Badge>
                          <span className={`text-xs ${tk.isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                            {tk.isOverdue ? `${t.notifications.delayed} · ` : ''}
                            {formatDistanceToNow(new Date(tk.dueDate), { addSuffix: true, locale: dateLocale })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          <TabsContent value="activity" className="m-0">
            <ScrollArea className="max-h-80">
              {loading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin mr-2" /> {t.common.loading}</div>
              ) : activities.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-muted-foreground">
                  <Activity className="w-8 h-8 mb-2" />
                  <p className="text-sm">{t.notifications.noRecentActivity}</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {activities.map(a => (
                    <div key={a.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                      <Activity className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="text-muted-foreground">{ACTION_LABELS[a.action] ?? a.action}</span>{' '}
                          <span className="font-medium">{a.entity_name || a.entity}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: dateLocale })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}