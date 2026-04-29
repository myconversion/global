import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Users, Plus, Search, Trash2, Pencil, Mail, Phone, Building2, X, FolderKanban, UserPlus, UserX, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { KPICard } from '@/components/shared/KPICard';
import { EmptyState } from '@/components/shared/EmptyState';
import { TableSkeleton } from '@/components/shared/TableSkeleton';
import { TablePagination } from '@/components/shared/TablePagination';
import { usePagination } from '@/hooks/usePagination';
import { format } from 'date-fns';
import { useI18n } from '@/contexts/I18nContext';
import { getDateLocale } from '@/i18n/date-locale';
import { useClientContext } from '@/contexts/ClientContext';
import { useProjectsContext } from '@/contexts/ProjectsContext';
import { Client } from '@/types/index';
import { useToast } from '@/hooks/use-toast';

export default function ClientsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useI18n();
  const dateLocale = getDateLocale(language);
  const { clients, createClient, updateClient, deleteClient } = useClientContext();
  const { projects } = useProjectsContext();

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formName, setFormName] = useState('');
  const [formCnpj, setFormCnpj] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const filtered = useMemo(() => {
    if (!search) return clients;
    const q = search.toLowerCase();
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.contactName?.toLowerCase().includes(q) ||
      c.cnpj?.includes(q)
    );
  }, [clients, search]);

  const { paginatedItems: paginatedClients, ...clientPagination } = usePagination(filtered);

  const getClientProjectCount = (clientId: string) =>
    projects.filter(p => p.clientId === clientId).length;

  const clientsWithProjects = useMemo(() => clients.filter(c => getClientProjectCount(c.id) > 0).length, [clients, projects]);
  const thisMonthClients = useMemo(() => {
    const now = new Date();
    return clients.filter(c => {
      const d = new Date(c.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [clients]);

  const resetForm = () => {
    setFormName(''); setFormCnpj(''); setFormEmail(''); setFormPhone('');
    setFormContact(''); setFormAddress(''); setFormNotes('');
    setEditingClient(null);
  };

  const openCreate = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (client: Client) => {
    setFormName(client.name);
    setFormCnpj(client.cnpj ?? '');
    setFormEmail(client.email ?? '');
    setFormPhone(client.phone ?? '');
    setFormContact(client.contactName ?? '');
    setFormAddress(client.address ?? '');
    setFormNotes(client.notes ?? '');
    setEditingClient(client);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    const data = {
      name: formName.trim(),
      cnpj: formCnpj || undefined,
      email: formEmail || undefined,
      phone: formPhone || undefined,
      contactName: formContact || undefined,
      address: formAddress || undefined,
      notes: formNotes || undefined,
    };
    try {
      if (editingClient) {
        await updateClient(editingClient.id, data);
        toast({ title: t.clients.clientUpdated });
      } else {
        await createClient(data);
        toast({ title: t.clients.clientCreated });
      }
      setDialogOpen(false);
      resetForm();
    } catch {
      toast({ title: t.common.error, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteClient(deleteTarget.id);
      toast({ title: t.clients.clientDeleted });
      setDeleteTarget(null);
    } catch {
      toast({ title: t.common.error, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.clients.title}
        description={`${clients.length} ${t.clients.registered}`}
        icon={<Users className="w-5 h-5 text-primary" />}
        actions={<Button className="gap-2" onClick={openCreate}><Plus className="w-4 h-4" /> {t.clients.newClient}</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label={t.clients.totalClients} value={String(clients.length)} tooltip={t.clients.totalClientsTooltip} icon={<Users className="w-5 h-5" />} gradient="from-blue-500 to-blue-600" sparkline />
        <KPICard label={t.clients.withProjects} value={String(clientsWithProjects)} tooltip={t.clients.withProjectsTooltip} icon={<FolderKanban className="w-5 h-5" />} gradient="from-emerald-500 to-emerald-600" sparkline />
        <KPICard label={t.clients.withoutProjects} value={String(clients.length - clientsWithProjects)} tooltip={t.clients.withoutProjectsTooltip} icon={<UserX className="w-5 h-5" />} gradient="from-amber-500 to-orange-500" sparkline />
        <KPICard label={t.clients.newMonth} value={String(thisMonthClients)} tooltip={t.clients.newMonthTooltip} icon={<UserPlus className="w-5 h-5" />} gradient="from-violet-500 to-purple-600" sparkline />
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t.clients.searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        {search && (
          <Button variant="ghost" size="sm" onClick={() => setSearch('')}>
            <X className="w-3.5 h-3.5 mr-1" /> {t.common.clear}
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="w-9 h-9 text-muted-foreground/60" />}
          title={clients.length === 0 ? t.clients.noClients : t.clients.noResults}
          description={clients.length === 0 ? t.clients.addFirst : t.clients.tryOtherSearch}
          actionLabel={clients.length === 0 ? t.clients.newClient : undefined}
          onAction={clients.length === 0 ? openCreate : undefined}
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.clients.nameOrCompany}</TableHead>
                <TableHead className="hidden md:table-cell">{t.common.contact}</TableHead>
                <TableHead className="hidden lg:table-cell">{t.common.email}</TableHead>
                <TableHead className="hidden lg:table-cell">{t.common.phone}</TableHead>
                <TableHead className="hidden sm:table-cell">{t.clients.projects}</TableHead>
                <TableHead className="hidden md:table-cell">{t.common.since}</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedClients.map(client => {
                const projCount = getClientProjectCount(client.id);
                return (
                  <TableRow
                    key={client.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/clients/${client.id}`)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{client.name}</p>
                        {client.cnpj && <p className="text-xs text-muted-foreground">{client.cnpj}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {client.contactName ?? '—'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {client.email ?? '—'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {client.phone ?? '—'}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="secondary" className="text-xs">{projCount}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {format(new Date(client.createdAt), "MMM yyyy", { locale: dateLocale })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(client)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteTarget(client)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <TablePagination {...clientPagination} />
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) resetForm(); setDialogOpen(v); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingClient ? t.clients.editClient : t.clients.newClient}</DialogTitle>
            <DialogDescription>
              {editingClient ? t.clients.updateData : t.clients.fillData}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2 col-span-2">
                <Label>{t.clients.nameOrCompany}</Label>
                <Input placeholder={t.placeholders.clientName} value={formName} onChange={e => setFormName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t.clients.cnpj}</Label>
                <Input placeholder="00.000.000/0000-00" value={formCnpj} onChange={e => setFormCnpj(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t.clients.contactName}</Label>
                <Input placeholder={t.clients.referenceContact} value={formContact} onChange={e => setFormContact(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t.common.email}</Label>
                <Input type="email" placeholder="email@company.com" value={formEmail} onChange={e => setFormEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t.common.phone}</Label>
                <Input placeholder={t.placeholders.clientPhone} value={formPhone} onChange={e => setFormPhone(e.target.value)} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>{t.common.address}</Label>
                <Input value={formAddress} onChange={e => setFormAddress(e.target.value)} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>{t.common.observations}</Label>
                <Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={3} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>{t.common.cancel}</Button>
            <Button onClick={handleSave} disabled={!formName.trim() || saving} loading={saving}>
              {editingClient ? t.common.save : t.common.register}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.clients.deleteClient}</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" {t.clients.deleteClientDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />{t.common.delete}</> : t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
