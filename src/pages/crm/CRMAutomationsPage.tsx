import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Zap, Plus, Mail, Loader2, Send, Workflow } from 'lucide-react';
import { CRMFlowsManager } from '@/components/crm/CRMFlowsManager';

export default function CRMAutomationsPage() {
  const { currentCompany, supabaseUser } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();

  const CHANNEL_LABELS: Record<string, string> = { email: t.crm.email, whatsapp: 'WhatsApp', both: t.crm.both };
  const STATUS_LABELS: Record<string, string> = { draft: t.crm.draft, scheduled: t.crm.scheduled, sent: t.crm.sentStatus };
  const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    scheduled: 'bg-amber-100 text-amber-700',
    sent: 'bg-green-100 text-green-700',
  };

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [flows, setFlows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formChannel, setFormChannel] = useState<string>('email');
  const [formSubject, setFormSubject] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formScheduledAt, setFormScheduledAt] = useState('');

  const fetchData = async () => {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const [{ data: c }, { data: f }] = await Promise.all([
        supabase.from('crm_campaigns').select('*').eq('company_id', currentCompany.id).order('created_at', { ascending: false }),
        supabase.from('crm_flows').select('*').eq('company_id', currentCompany.id).order('created_at', { ascending: false }),
      ]);
      if (c) setCampaigns(c);
      if (f) setFlows(f);
    } catch {
      // queries failed — show empty state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [currentCompany]);

  const handleCreateCampaign = async () => {
    if (!formName.trim() || !currentCompany) return;
    const { error } = await supabase.from('crm_campaigns').insert({
      company_id: currentCompany.id, name: formName.trim(), channel: formChannel as any,
      template_subject: formSubject || null, template_body: formBody || null,
      scheduled_at: formScheduledAt || null, status: formScheduledAt ? 'scheduled' as any : 'draft' as any,
      created_by: supabaseUser?.id,
    });
    if (error) toast({ title: t.crm.errorCreatingCampaign, variant: 'destructive' });
    else {
      toast({ title: t.crm.campaignCreated });
      setCampaignDialogOpen(false);
      setFormName(''); setFormChannel('email'); setFormSubject(''); setFormBody(''); setFormScheduledAt('');
      fetchData();
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" /> {t.crm.automations}
          </h1>
          <p className="text-sm text-muted-foreground">{t.crm.automationsDesc}</p>
        </div>
      </div>

      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns" className="gap-1.5"><Send className="w-3.5 h-3.5" /> {t.crm.campaigns}</TabsTrigger>
          <TabsTrigger value="flows" className="gap-1.5"><Workflow className="w-3.5 h-3.5" /> {t.crm.flows}</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5" onClick={() => setCampaignDialogOpen(true)}>
              <Plus className="w-3.5 h-3.5" /> {t.crm.newCampaign}
            </Button>
          </div>

          {campaigns.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Mail className="w-12 h-12 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground font-medium">{t.crm.noCampaigns}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {campaigns.map(c => (
                <Card key={c.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{c.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{CHANNEL_LABELS[c.channel]}</Badge>
                        <Badge className={`text-xs ${STATUS_COLORS[c.status]}`}>{STATUS_LABELS[c.status]}</Badge>
                      </div>
                    </div>
                    {c.stats && (
                      <div className="text-xs text-muted-foreground text-right space-y-0.5">
                        <p>{t.crm.sent}: {c.stats.sent ?? 0}</p>
                        <p>{t.crm.opened}: {c.stats.opened ?? 0}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="flows" className="mt-4">
          <CRMFlowsManager flows={flows} onRefresh={fetchData} />
        </TabsContent>
      </Tabs>

      <Dialog open={campaignDialogOpen} onOpenChange={setCampaignDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t.crm.newCampaign}</DialogTitle>
            <DialogDescription>{t.crm.automationsDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t.common.name} *</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder={t.crm.campaignName} />
            </div>
            <div className="space-y-1.5">
              <Label>{t.crm.channel}</Label>
              <Select value={formChannel} onValueChange={setFormChannel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">{t.crm.email}</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="both">{t.crm.both}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t.crm.emailSubject}</Label>
              <Input value={formSubject} onChange={e => setFormSubject(e.target.value)} placeholder={t.crm.emailSubjectPlaceholder} />
            </div>
            <div className="space-y-1.5">
              <Label>{t.crm.message}</Label>
              <Textarea value={formBody} onChange={e => setFormBody(e.target.value)} placeholder={t.crm.messagePlaceholder} rows={4} />
            </div>
            <div className="space-y-1.5">
              <Label>{t.crm.scheduling}</Label>
              <Input type="datetime-local" value={formScheduledAt} onChange={e => setFormScheduledAt(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCampaignDialogOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={handleCreateCampaign} disabled={!formName.trim()}>{t.crm.createCampaign}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
