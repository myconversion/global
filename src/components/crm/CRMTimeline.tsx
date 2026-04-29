import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Loader2, Phone, Mail, MessageSquare, Calendar, MapPin, FileText, CheckSquare, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useI18n } from '@/contexts/I18nContext';
import { getDateLocale } from '@/i18n/date-locale';

interface CRMTimelineProps {
  contactId?: string;
  crmCompanyId?: string;
  companyId: string;
}

interface TimelineItem {
  id: string;
  source: 'interaction' | 'followup';
  type: string;
  title: string;
  description: string | null;
  date: string;
  userId: string | null;
  userName?: string;
  isCompleted?: boolean;
}

const ICON_MAP: Record<string, React.ElementType> = {
  call: Phone, email: Mail, whatsapp: MessageSquare, meeting: Calendar,
  visit: MapPin, note: FileText, proposal: FileText, task: CheckSquare,
};

const TYPE_COLORS: Record<string, string> = {
  call: 'bg-green-100 text-green-700 border-green-200',
  email: 'bg-blue-100 text-blue-700 border-blue-200',
  whatsapp: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  meeting: 'bg-purple-100 text-purple-700 border-purple-200',
  visit: 'bg-orange-100 text-orange-700 border-orange-200',
  note: 'bg-gray-100 text-gray-700 border-gray-200',
  proposal: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  task: 'bg-yellow-100 text-yellow-700 border-yellow-200',
};

export function CRMTimeline({ contactId, crmCompanyId, companyId }: CRMTimelineProps) {
  const { t, language } = useI18n();
  const dateLocale = getDateLocale(language);
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  const TYPE_LABELS: Record<string, string> = {
    call: t.crm.call, email: t.crm.emailType, whatsapp: t.crm.whatsapp,
    meeting: t.crm.meeting, visit: t.crm.visit, note: t.crm.note,
    proposal: t.crm.proposal, task: t.crm.task,
  };

  useEffect(() => {
    if (!companyId) return;
    fetchTimeline();
  }, [contactId, crmCompanyId, companyId]);

  const fetchTimeline = async () => {
    setLoading(true);

    let interactionsQuery = supabase
      .from('crm_interactions')
      .select('id, type, title, description, created_at, user_id')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(50);

    let followupsQuery = supabase
      .from('crm_followups')
      .select('id, type, description, scheduled_at, created_by, is_completed')
      .eq('company_id', companyId)
      .order('scheduled_at', { ascending: false })
      .limit(50);

    if (contactId) {
      interactionsQuery = interactionsQuery.eq('contact_id', contactId);
      followupsQuery = followupsQuery.eq('contact_id', contactId);
    } else if (crmCompanyId) {
      interactionsQuery = interactionsQuery.eq('crm_company_id', crmCompanyId);
      followupsQuery = followupsQuery.eq('crm_company_id', crmCompanyId);
    }

    const [{ data: interactions }, { data: followups }] = await Promise.all([
      interactionsQuery,
      followupsQuery,
    ]);

    const interactionItems: TimelineItem[] = (interactions || []).map(i => ({
      id: i.id, source: 'interaction' as const, type: i.type, title: i.title,
      description: i.description, date: i.created_at, userId: i.user_id,
    }));

    const followupItems: TimelineItem[] = (followups || []).map(f => ({
      id: f.id, source: 'followup' as const, type: f.type,
      title: `Follow-up: ${TYPE_LABELS[f.type] || f.type}`,
      description: f.description, date: f.scheduled_at, userId: f.created_by,
      isCompleted: f.is_completed,
    }));

    const all = [...interactionItems, ...followupItems].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const userIds = [...new Set(all.map(i => i.userId).filter(Boolean))] as string[];
    if (userIds.length > 0) {
      const { data: profs } = await supabase.from('profiles').select('user_id, name').in('user_id', userIds);
      const map: Record<string, string> = {};
      (profs || []).forEach(p => { map[p.user_id] = p.name; });
      setProfiles(map);
    }

    setItems(all);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
          <Clock className="w-7 h-7 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{t.crm.noInteractions}</p>
          <p className="text-xs text-muted-foreground mt-1">{t.crm.registerFirstInteraction}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative pl-6">
      <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
      <div className="space-y-5">
        {items.map((item) => {
          const Icon = ICON_MAP[item.type] || FileText;
          const colorClass = TYPE_COLORS[item.type] || TYPE_COLORS.note;

          return (
            <div key={`${item.source}-${item.id}`} className="relative flex gap-3">
              <div className={`absolute -left-6 top-1 w-[22px] h-[22px] rounded-full flex items-center justify-center border ${colorClass}`}>
                <Icon className="w-3 h-3" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap">
                  <p className="text-sm font-medium text-foreground leading-tight">{item.title}</p>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${colorClass}`}>
                    {TYPE_LABELS[item.type] || item.type}
                  </Badge>
                  {item.source === 'followup' && item.isCompleted && (
                    <Badge className="text-[10px] px-1.5 py-0 h-4 bg-green-100 text-green-700 border-green-200" variant="outline">
                      {t.crm.completedStatus}
                    </Badge>
                  )}
                  {item.source === 'followup' && !item.isCompleted && (
                    <Badge className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 text-amber-700 border-amber-200" variant="outline">
                      {t.crm.pendingStatus}
                    </Badge>
                  )}
                </div>
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                  <span>{formatDistanceToNow(new Date(item.date), { addSuffix: true, locale: dateLocale })}</span>
                  {item.userId && profiles[item.userId] && (
                    <>
                      <span>•</span>
                      <span>{profiles[item.userId]}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
