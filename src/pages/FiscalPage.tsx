import { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FileText, Plus, Search, TrendingUp, AlertTriangle, CheckCircle, XCircle, BarChart3, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { KPICard } from '@/components/shared/KPICard';
import { TableSkeleton } from '@/components/shared/TableSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { TablePagination } from '@/components/shared/TablePagination';
import { usePagination } from '@/hooks/usePagination';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { getDateLocale } from '@/i18n/date-locale';
import { withBuFilter } from '@/lib/bu-filter';
import { formatCurrency } from '@/lib/format-utils';
import type { Tables } from '@/integrations/supabase/types';

type Invoice = Tables<'invoices'> & { client_name?: string };

const STATUS_CONFIG_COLORS: Record<string, { color: string; icon: React.ReactNode }> = {
  issued: { color: 'bg-success/10 text-success border-success/20', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  draft: { color: 'bg-warning/10 text-warning border-warning/20', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  cancelled: { color: 'bg-destructive/10 text-destructive border-destructive/20', icon: <XCircle className="w-3.5 h-3.5" /> },
};



export default function FiscalPage() {
  const { toast } = useToast();
  const { t, language } = useI18n();
  const { currentCompany, supabaseUser, currentBusinessUnit } = useAuth();
  const STATUS_MAP: Record<string, string> = { draft: t.fiscal.draft, issued: t.fiscal.issued, cancelled: t.fiscal.cancelled };
  const fmt = (v: number) => formatCurrency(v, language);
  const dateLocale = getDateLocale(language);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailNf, setDetailNf] = useState<Invoice | null>(null);
  const [form, setForm] = useState({ client_id: '', description: '', value: '', issRate: '5' });

  // Edit/Delete state
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editForm, setEditForm] = useState({ client_id: '', description: '', value: '', status: '' });
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);

  const companyId = currentCompany?.id;
  const buId = currentBusinessUnit?.id;

  useEffect(() => {
    if (!companyId) return;
    const fetchData = async () => {
      setLoading(true);
      const [invRes, cliRes] = await Promise.all([
        withBuFilter(supabase.from('invoices').select('*').eq('company_id', companyId).order('created_at', { ascending: false }), buId),
        supabase.from('clients').select('id, name').eq('company_id', companyId),
      ]);
      const clientMap = new Map((cliRes.data || []).map(c => [c.id, c.name]));
      setClients(cliRes.data || []);
      setInvoices((invRes.data || []).map(inv => ({
        ...inv,
        client_name: inv.client_id ? clientMap.get(inv.client_id) || t.fiscal.noClient : t.fiscal.noClient,
      })));
      setLoading(false);
    };
    fetchData();
  }, [companyId, buId]);

  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      const matchSearch = !search || inv.number.toLowerCase().includes(search.toLowerCase()) || (inv.client_name || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, search, statusFilter]);

  const { paginatedItems: paginatedInvoices, ...fiscalPagination } = usePagination(filtered);

  const kpis = useMemo(() => {
    const emitted = invoices.filter(n => n.status === 'issued');
    const pending = invoices.filter(n => n.status === 'draft');
    const totalEmitted = emitted.reduce((s, n) => s + Number(n.value), 0);
    const totalPending = pending.reduce((s, n) => s + Number(n.value), 0);
    const totalISS = emitted.reduce((s, n) => s + (Number(n.value) * 0.05), 0);
    return { totalEmitted, totalPending, emittedCount: emitted.length, pendingCount: pending.length, totalISS };
  }, [invoices]);

  const monthlyData = useMemo(() => {
    // Use en-US so month abbreviations always render as "Nov 25" / "Jan 26"
    // (avoids "nov. de 25" from pt-BR formatter), per user request.
    const localeStr = 'en-US';
    const months: Record<string, { emitidas: number; valor: number; iss: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toLocaleDateString(localeStr, { month: 'short', year: '2-digit' });
      months[key] = { emitidas: 0, valor: 0, iss: 0 };
    }
    invoices.forEach(inv => {
      if (inv.status === 'cancelled') return;
      const d = new Date(inv.issued_at || inv.created_at);
      const key = d.toLocaleDateString(localeStr, { month: 'short', year: '2-digit' });
      if (months[key]) {
        months[key].emitidas += 1;
        months[key].valor += Number(inv.value);
        months[key].iss += Number(inv.value) * 0.05;
      }
    });
    return Object.entries(months).map(([name, v]) => ({ name, ...v }));
  }, [invoices]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    invoices.forEach(inv => {
      const label = STATUS_MAP[inv.status] || inv.status;
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [invoices]);

  const CHART_COLORS = ['hsl(152, 60%, 42%)', 'hsl(38, 92%, 50%)', 'hsl(0, 72%, 55%)', 'hsl(217, 87%, 60%)'];

  const handleCreate = async () => {
    if (!form.value || !companyId) return;
    const nextNum = invoices.length > 0
      ? Math.max(...invoices.map(n => parseInt(n.number.replace(/\D/g, '') || '0'))) + 1
      : 1;
    const { data, error } = await supabase.from('invoices').insert({
      company_id: companyId,
      business_unit_id: buId ?? null,
      number: `NFS-${String(nextNum).padStart(6, '0')}`,
      client_id: form.client_id || null,
      description: form.description,
      value: parseFloat(form.value),
      status: 'draft',
      created_by: supabaseUser?.id || null,
    } as any).select().single();

    if (error) {
      toast({ title: t.fiscal.errorCreating, description: error.message, variant: 'destructive' });
      return;
    }
    const client = clients.find(c => c.id === form.client_id);
    setInvoices(prev => [{ ...data, client_name: client?.name || t.fiscal.noClient }, ...prev]);
    setForm({ client_id: '', description: '', value: '', issRate: '5' });
    setDialogOpen(false);
    toast({ title: t.fiscal.invoiceCreatedToast, description: `${data.number} ${t.fiscal.pendingDesc}` });
  };

  const openEdit = (inv: Invoice) => {
    setEditingInvoice(inv);
    setEditForm({
      client_id: inv.client_id || '',
      description: inv.description || '',
      value: String(inv.value),
      status: inv.status,
    });
  };

  const handleEdit = async () => {
    if (!editingInvoice) return;
    const { error } = await supabase.from('invoices').update({
      client_id: editForm.client_id || null,
      description: editForm.description,
      value: parseFloat(editForm.value),
      status: editForm.status as any,
      issued_at: editForm.status === 'issued' ? new Date().toISOString() : editingInvoice.issued_at,
    }).eq('id', editingInvoice.id);
    if (error) { toast({ title: t.fiscal.errorEditing, description: error.message, variant: 'destructive' }); return; }
    const client = clients.find(c => c.id === editForm.client_id);
    setInvoices(prev => prev.map(inv => inv.id === editingInvoice.id ? {
      ...inv,
      client_id: editForm.client_id || null,
      client_name: client?.name || t.fiscal.noClient,
      description: editForm.description,
      value: parseFloat(editForm.value),
      status: editForm.status as any,
    } : inv));
    setEditingInvoice(null);
    toast({ title: t.fiscal.invoiceUpdatedToast });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('invoices').delete().eq('id', deleteTarget.id);
    if (error) { toast({ title: t.fiscal.errorDeleting, description: error.message, variant: 'destructive' }); return; }
    setInvoices(prev => prev.filter(inv => inv.id !== deleteTarget.id));
    setDeleteTarget(null);
    toast({ title: t.fiscal.invoiceDeletedToast });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t.fiscal.title} description={t.fiscal.description} icon={<FileText className="w-5 h-5 text-primary" />} />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <KPICard key={i} label="" value="" loading />)}
        </div>
        <TableSkeleton columns={8} rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.fiscal.title}
        description={t.fiscal.description}
        icon={<FileText className="w-5 h-5 text-primary" />}
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" /> {t.fiscal.newInvoice}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t.fiscal.newInvoice}</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>{t.fiscal.client}</Label>
                  <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v }))}>
                    <SelectTrigger><SelectValue placeholder={t.fiscal.selectClient} /></SelectTrigger>
                    <SelectContent>
                      {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>{t.common.description}</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={t.common.description} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>{t.common.value}</Label><Input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="0.00" /></div>
                  <div className="space-y-2"><Label>{t.fiscal.issRate}</Label><Input type="number" value={form.issRate} onChange={e => setForm(f => ({ ...f, issRate: e.target.value }))} /></div>
                </div>
              </div>
              <DialogFooter><Button onClick={handleCreate} disabled={!form.value}>{t.fiscal.newInvoice}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <KPICard label={t.fiscal.totalIssued} tooltip={t.fiscal.totalIssuedTooltip} value={fmt(kpis.totalEmitted)} sub={`${kpis.emittedCount}`} color="text-success" />
        <KPICard label={t.fiscal.pendingInvoices} tooltip={t.fiscal.pendingInvoicesTooltip} value={fmt(kpis.totalPending)} sub={`${kpis.pendingCount}`} color="text-warning" />
        <KPICard label="ISS" tooltip="ISS" value={fmt(kpis.totalISS)} sub="5%" color="text-primary" />
        <KPICard label={t.fiscal.cancelledInvoices} tooltip={t.fiscal.cancelledInvoicesTooltip} value={String(invoices.length)} sub={`${invoices.filter(n => n.status === 'cancelled').length}`} color="text-muted-foreground" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              {t.fiscal.monthlyEvolution}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend />
                  <Bar dataKey="valor" fill="hsl(217, 87%, 60%)" radius={[4, 4, 0, 0]} name={t.fiscal.invoiceBilled} />
                  <Bar dataKey="iss" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} name={t.fiscal.issRetained} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              {t.fiscal.byStatus}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder={t.fiscal.searchInvoice} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder={t.common.status} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.fiscal.allStatuses}</SelectItem>
            <SelectItem value="issued">{t.fiscal.issued}</SelectItem>
            <SelectItem value="draft">{t.fiscal.draft}</SelectItem>
            <SelectItem value="cancelled">{t.fiscal.cancelled}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.fiscal.invoiceNumber}</TableHead>
              <TableHead>{t.fiscal.client}</TableHead>
              <TableHead>{t.common.description}</TableHead>
              <TableHead className="text-right">{t.common.value}</TableHead>
              <TableHead className="text-right">ISS</TableHead>
              <TableHead>{t.common.date}</TableHead>
              <TableHead>{t.common.status}</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedInvoices.map(inv => {
              const displayStatus = STATUS_MAP[inv.status] || inv.status;
              const cfg = STATUS_CONFIG_COLORS[inv.status] || STATUS_CONFIG_COLORS['draft'];
              const value = Number(inv.value);
              return (
                <TableRow key={inv.id}>
                  <TableCell className="font-semibold text-xs">{inv.number}</TableCell>
                  <TableCell className="text-sm">{inv.client_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{inv.description}</TableCell>
                  <TableCell className="text-right font-semibold text-sm">{fmt(value)}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">{fmt(value * 0.05)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(inv.issued_at || inv.created_at).toLocaleDateString(language === 'pt-BR' ? 'pt-BR' : language === 'es' ? 'es' : 'en-US')}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs gap-1 ${cfg.color}`}>
                      {cfg.icon} {displayStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDetailNf(inv)}>
                         <FileText className="w-4 h-4 mr-2" /> {t.common.viewAll}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(inv)}>
                          <Pencil className="w-4 h-4 mr-2" /> {t.common.edit}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleteTarget(inv)} className="text-destructive focus:text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" /> {t.common.delete}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && invoices.length === 0 && (
              <TableRow><TableCell colSpan={8} className="p-0">
                <EmptyState title={t.fiscal.noInvoices} description={t.fiscal.addFirstInvoice} actionLabel={t.fiscal.newInvoice} onAction={() => setDialogOpen(true)} />
              </TableCell></TableRow>
            )}
            {filtered.length === 0 && invoices.length > 0 && (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{t.fiscal.noResults}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination {...fiscalPagination} />
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailNf} onOpenChange={() => setDetailNf(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.fiscal.editInvoice}</DialogTitle></DialogHeader>
          {detailNf && (() => {
            const displayStatus = STATUS_MAP[detailNf.status] || detailNf.status;
            const cfg = STATUS_CONFIG_COLORS[detailNf.status] || STATUS_CONFIG_COLORS['draft'];
            const value = Number(detailNf.value);
            return (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-muted-foreground">{t.fiscal.invoiceNumber}:</span> <strong>{detailNf.number}</strong></div>
                  <div><span className="text-muted-foreground">{t.common.status}:</span> <Badge variant="outline" className={`text-xs ml-1 ${cfg.color}`}>{displayStatus}</Badge></div>
                  <div><span className="text-muted-foreground">{t.fiscal.client}:</span> {detailNf.client_name}</div>
                  <div><span className="text-muted-foreground">{t.common.value}:</span> <strong>{fmt(value)}</strong></div>
                  <div><span className="text-muted-foreground">{t.common.date}:</span> {new Date(detailNf.issued_at || detailNf.created_at).toLocaleDateString(language === 'pt-BR' ? 'pt-BR' : language === 'es' ? 'es' : 'en-US')}</div>
                  <div><span className="text-muted-foreground">ISS (5%):</span> {fmt(value * 0.05)}</div>
                </div>
                <div><span className="text-muted-foreground">{t.common.description}:</span> {detailNf.description}</div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingInvoice} onOpenChange={() => setEditingInvoice(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.fiscal.editInvoice}</DialogTitle><DialogDescription>{t.fiscal.editInvoiceDesc}</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t.fiscal.client}</Label>
              <Select value={editForm.client_id} onValueChange={v => setEditForm(f => ({ ...f, client_id: v }))}>
                <SelectTrigger><SelectValue placeholder={t.fiscal.selectClient} /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>{t.common.description}</Label><Input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{t.common.value}</Label><Input type="number" value={editForm.value} onChange={e => setEditForm(f => ({ ...f, value: e.target.value }))} /></div>
              <div className="space-y-2">
                <Label>{t.common.status}</Label>
                <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">{t.fiscal.draft}</SelectItem>
                    <SelectItem value="issued">{t.fiscal.issued}</SelectItem>
                    <SelectItem value="cancelled">{t.fiscal.cancelled}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleEdit}>{t.common.save}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.fiscal.deleteInvoice}</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.number}</strong> {t.fiscal.deleteInvoiceDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t.common.delete}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
