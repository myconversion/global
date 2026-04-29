import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Video, MapPin, FileText, Clock, RotateCw, List, CalendarDays,
  Users, Building2,
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
  const navigate = useNavigate();
  const dateLocale = getDateLocale(language);

  const TYPE_LABELS: Record<string, string> = {
    call: t.crm.call, email: t.crm.email, whatsapp: 'WhatsApp',
    meeting: t.crm.meeting, visit: t.crm.visit,
    proposal: t.crm.proposal,
  };

  const [followups, setFollowups] = useState<Followup[]>([]);
  const [contacts, setContacts] = useState<{ id: string; name: string }[]>([]);
  const [companies, setCompanies] = useState<{ id: string; razao_social: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | CalendarViewMode>('list');

  const [formType, setFormType] = useState<string>('call');
  const [formScheduledAt, setFormScheduledAt] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formContactId, setFormContactId] = useState('none');
  const [formCompanyId, setFormCompanyId] = useState('none');

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

  const fetchLinkedEntities = async () => {
    if (!currentCompany) return;
    const [{ data: c }, { data: co }] = await Promise.all([
      supabase.from('crm_contacts').select('id, name').eq('company_id', currentCompany.id).order('name').limit(500),
      supabase.from('crm_companies').select('id, razao_social').eq('company_id', currentCompany.id).order('razao_social').limit(500),
    ]);
    if (c) setContacts(c);
    if (co) setCompanies(co);
  };

  useEffect(() => { fetchFollowups(); }, [currentCompany, showAll]);
  useEffect(() => { fetchLinkedEntities(); }, [currentCompany]);

  const resetForm = () => {
    setFormType('call');
    setFormScheduledAt('');
    setFormDescription('');
    setFormContactId('none');
    setFormCompanyId('none');
  };

  const handleCreate = async () => {
    if (!formScheduledAt || !currentCompany) return;
    const { error } = await supabase.from('crm_followups').insert({
      company_id: currentCompany.id,
      type: formType as any,
      scheduled_at: formScheduledAt,
      description: formDescription || null,
      assigned_to: supabaseUser?.id,
      created_by: supabaseUser?.id,
      contact_id: formContactId !== 'none' ? formContactId : null,
      crm_company_id: formCompanyId !== 'none' ? formCompanyId : null,
    });
    if (error) toast({ title: t.crm.errorCreatingFollowup, variant: 'destructive' });
    else {
      toast({ title: t.crm.followupCreated });
      setDialogOpen(false);
      resetForm();
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

  const contactsMap = Object.fromEntries(contacts.map(c => [c.id, c.name]));
  const companiesMap = Object.fromEntries(companies.map(c => [c.id, c.razao_social]));

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
            <ToggleGroupItem value="list" aria-label="List" className="gap-1.5 px-3"><List className="w-3.5 h-3.5" /><span className="hidden sm:inline">{t.crm.viewList}</span></ToggleGroupItem>
            <ToggleGroupItem value="month" aria-label="Month" className="gap-1.5 px-3"><CalendarDays className="w-3.5 h-3.5" /><span className="hidden sm:inline">{t.crm.viewMonth}</span></ToggleGroupItem>
            <ToggleGroupItem value="week" aria-label="Week" className="px-3">{t.crm.viewWeek}</ToggleGroupItem>
            <ToggleGroupItem value="day" aria-label="Day" className="px-3">{t.crm.viewDay}</ToggleGroupItem>
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
                  const contactName = f.contact_id ? contactsMap[f.contact_id] : null;
                  const companyName = f.crm_company_id ? companiesMap[f.crm_company_id] : null;
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
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            <p className={`text-xs ${overdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                              {overdue && `⚠ ${t.crm.overdueLabel} · `}
                              {isToday(date) ? t.crm.today : isTomorrow(date) ? t.crm.tomorrow : format(date, "dd/MM/yyyy", { locale: dateLocale })}
                              {' @ '}{format(date, 'HH:mm')}
                            </p>
                            {contactName && (
                              <span
                                className="text-xs text-muted-foreground hover:text-primary cursor-pointer flex items-center gap-1"
                                onClick={() => navigate(`/crm/people/${f.contact_id}`)}
                              >
                                <Users className="w-3 h-3" />{contactName}
                              </span>
                            )}
                            {companyName && (
                              <span
                                className="text-xs text-muted-foreground hover:text-primary cursor-pointer flex items-center gap-1"
                                onClick={() => navigate(`/crm/companies/${f.crm_company_id}`)}
                              >
                                <Building2 className="w-3 h-3" />{companyName}
                              </span>
                            )}
                          </div>
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
                const contactName = f.contact_id ? contactsMap[f.contact_id] : null;
                const companyName = f.crm_company_id ? companiesMap[f.crm_company_id] : null;
                return (
                  <Card key={f.id} className="opacity-60">
                    <CardContent className="p-3 flex items-center gap-3">
                      <Checkbox checked onCheckedChange={() => toggleComplete(f.id, true)} />
                      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground line-through">
                          {TYPE_LABELS[f.type]} {f.description && `— ${f.description}`}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {contactName && <span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" />{contactName}</span>}
                          {companyName && <span className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="w-3 h-3" />{companyName}</span>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{t.crm.contact}</Label>
                <Select value={formContactId} onValueChange={setFormContactId}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t.crm.noneF}</SelectItem>
                    {contacts.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" />{t.crm.company}</Label>
                <Select value={formCompanyId} onValueChange={setFormCompanyId}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t.crm.noneF}</SelectItem>
                    {companies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t.crm.description}</Label>
              <Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder={t.common.observations} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>{t.common.cancel}</Button>
            <Button onClick={handleCreate} disabled={!formScheduledAt}>{t.common.create}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
