import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ArrowLeft, Users, Mail, Phone, Building2, MapPin, FileText, FolderKanban, Pencil, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { useI18n } from '@/contexts/I18nContext';
import { getDateLocale } from '@/i18n/date-locale';
import { useClientContext } from '@/contexts/ClientContext';
import { useProjectsContext } from '@/contexts/ProjectsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Client } from '@/types/index';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/format-utils';

export default function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useI18n();
  const dateLocale = getDateLocale(language);
  const { getClientById, updateClient } = useClientContext();
  const { projects, getProjectProgress } = useProjectsContext();
  const { currentCompany } = useAuth();

  const client = getClientById(clientId!);
  const clientProjects = projects.filter(p => p.clientId === clientId);

  const [clientDeals, setClientDeals] = useState<{ id: string; title: string; value: number; stage_name: string; expected_close_date: string | null }[]>([]);

  useEffect(() => {
    if (!currentCompany || !clientId) return;
    supabase.from('crm_pipeline_deals').select('id, title, value, stage_name, expected_close_date')
      .eq('company_id', currentCompany.id)
      .then(({ data }) => {
        if (data) setClientDeals(data);
      });
  }, [currentCompany, clientId]);

  const [editOpen, setEditOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formCnpj, setFormCnpj] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');

  if (!client) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">{t.clientDetail.clientNotFound}</p>
        <Button variant="link" onClick={() => navigate('/clients')}>{t.common.back}</Button>
      </div>
    );
  }

  const openEdit = () => {
    setFormName(client.name); setFormCnpj(client.cnpj ?? ''); setFormEmail(client.email ?? '');
    setFormPhone(client.phone ?? ''); setFormContact(client.contactName ?? '');
    setFormAddress(client.address ?? ''); setFormNotes(client.notes ?? '');
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    await updateClient(client.id, { name: formName.trim(), cnpj: formCnpj || undefined, email: formEmail || undefined, phone: formPhone || undefined, contactName: formContact || undefined, address: formAddress || undefined, notes: formNotes || undefined });
    toast({ title: t.clientDetail.clientUpdated });
    setEditOpen(false);
  };

  const STATUS_LABELS: Record<string, string> = {
    active: t.clientDetail.inProgress, paused: t.clientDetail.paused, completed: t.clientDetail.completed, archived: t.clientDetail.archived,
  };
  const STATUS_COLORS: Record<string, string> = {
    active: 'bg-primary/10 text-primary', paused: 'bg-warning/10 text-warning', completed: 'bg-success/10 text-success', archived: 'bg-muted text-muted-foreground',
  };

  return (
    <div>
      <Button variant="ghost" className="mb-4 gap-2 text-muted-foreground" onClick={() => navigate('/clients')}>
        <ArrowLeft className="w-4 h-4" /> {t.clientDetail.backToClients}
      </Button>

      <PageHeader title={client.name} description={client.cnpj ? `${t.clients.cnpj}: ${client.cnpj}` : ''} icon={<Building2 className="w-5 h-5 text-primary" />}
        actions={<Button variant="outline" className="gap-2" onClick={openEdit}><Pencil className="w-4 h-4" /> {t.clientDetail.editBtn}</Button>}
      />

      <Tabs defaultValue="overview" className="mt-2">
        <TabsList>
          <TabsTrigger value="overview">{t.clientDetail.overviewTab}</TabsTrigger>
          <TabsTrigger value="projects">{t.clientDetail.projectsTab} ({clientProjects.length})</TabsTrigger>
          <TabsTrigger value="deals">{t.clientDetail.dealsTab} ({clientDeals.length})</TabsTrigger>
          <TabsTrigger value="notes">{t.clientDetail.notesTab}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t.clientDetail.contactInfo}</h3>
                <Separator />
                <InfoRow icon={<Users className="w-4 h-4" />} label={t.common.contact} value={client.contactName} />
                <InfoRow icon={<Mail className="w-4 h-4" />} label={t.common.email} value={client.email} />
                <InfoRow icon={<Phone className="w-4 h-4" />} label={t.common.phone} value={client.phone} />
                <InfoRow icon={<MapPin className="w-4 h-4" />} label={t.common.address} value={client.address} />
                <InfoRow icon={<FileText className="w-4 h-4" />} label={t.clients.cnpj} value={client.cnpj} />
                <InfoRow icon={<Calendar className="w-4 h-4" />} label={t.clientDetail.clientSince} value={format(new Date(client.createdAt), "PPP", { locale: dateLocale })} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t.clientDetail.summary}</h3>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-primary">{clientProjects.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t.clientDetail.totalProjects}</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-primary">{clientProjects.filter(p => p.status === 'active').length}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t.clientDetail.activeProjects}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projects" className="mt-4">
          {clientProjects.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{t.clientDetail.noLinkedProjects}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {clientProjects.map(proj => {
                const progress = getProjectProgress(proj.id);
                return (
                  <Card key={proj.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/projects/${proj.id}`)}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <FolderKanban className="w-4 h-4 text-primary" />
                          <h4 className="text-sm font-semibold">{proj.name}</h4>
                          <Badge className={`text-xs ${STATUS_COLORS[proj.status]}`} variant="secondary">{STATUS_LABELS[proj.status]}</Badge>
                        </div>
                        {proj.description && <p className="text-xs text-muted-foreground mt-1 ml-6">{proj.description}</p>}
                      </div>
                      <span className="text-sm font-semibold text-muted-foreground">{progress}%</span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="deals" className="mt-4">
          {clientDeals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{t.clientDetail.noDeals}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {clientDeals.map(deal => (
                <Card key={deal.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/crm/pipeline')}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold">{deal.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">{deal.stage_name}</Badge>
                        {deal.expected_close_date && <span className="text-xs text-muted-foreground">{deal.expected_close_date}</span>}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-primary">{formatCurrency(deal.value, language)}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <Card>
            <CardContent className="p-6">
              {client.notes ? (
                <p className="text-sm text-foreground whitespace-pre-wrap">{client.notes}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">{t.clientDetail.noNotes}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t.clientDetail.editClient}</DialogTitle>
            <DialogDescription>{t.clientDetail.editClientDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2 col-span-2"><Label>{t.clientDetail.nameCompany}</Label><Input value={formName} onChange={e => setFormName(e.target.value)} /></div>
              <div className="space-y-2"><Label>{t.clients.cnpj}</Label><Input value={formCnpj} onChange={e => setFormCnpj(e.target.value)} /></div>
              <div className="space-y-2"><Label>{t.clientDetail.contactName}</Label><Input value={formContact} onChange={e => setFormContact(e.target.value)} /></div>
              <div className="space-y-2"><Label>{t.common.email}</Label><Input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} /></div>
              <div className="space-y-2"><Label>{t.common.phone}</Label><Input value={formPhone} onChange={e => setFormPhone(e.target.value)} /></div>
              <div className="space-y-2 col-span-2"><Label>{t.common.address}</Label><Input value={formAddress} onChange={e => setFormAddress(e.target.value)} /></div>
              <div className="space-y-2 col-span-2"><Label>{t.common.observations}</Label><Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={3} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={handleSave} disabled={!formName.trim()}>{t.common.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-muted-foreground">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value || '—'}</p>
      </div>
    </div>
  );
}
