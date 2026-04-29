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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ShoppingCart, Plus, Building, Search, Package, Clock, CheckCircle, XCircle, BarChart3, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { KPICard } from '@/components/shared/KPICard';
import { TableSkeleton } from '@/components/shared/TableSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { TablePagination } from '@/components/shared/TablePagination';
import { usePagination } from '@/hooks/usePagination';
import { useToast } from '@/hooks/use-toast';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { withBuFilter } from '@/lib/bu-filter';
import { formatCurrency } from '@/lib/format-utils';
import type { Tables } from '@/integrations/supabase/types';

type Supplier = Tables<'suppliers'>;
type PurchaseOrder = Tables<'purchase_orders'> & { supplier_name?: string };

const ORDER_STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  pending: { color: 'bg-warning/10 text-warning border-warning/20', icon: <Clock className="w-3.5 h-3.5" /> },
  approved: { color: 'bg-success/10 text-success border-success/20', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  received: { color: 'bg-success/15 text-success border-success/30', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  cancelled: { color: 'bg-destructive/10 text-destructive border-destructive/20', icon: <XCircle className="w-3.5 h-3.5" /> },
};

export default function PurchasesPage() {
  const { toast } = useToast();
  const { t, language } = useI18n();
  const { currentCompany, supabaseUser, currentBusinessUnit } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [supplierDialog, setSupplierDialog] = useState(false);
  const [orderDialog, setOrderDialog] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ name: '', category: '', phone: '', email: '' });
  const [orderForm, setOrderForm] = useState({ supplier_id: '', description: '', value: '', expected_date: '' });

  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editSupplierForm, setEditSupplierForm] = useState({ name: '', category: '', phone: '', email: '', is_active: true });
  const [deleteSupplierTarget, setDeleteSupplierTarget] = useState<Supplier | null>(null);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [editOrderForm, setEditOrderForm] = useState({ supplier_id: '', description: '', value: '', expected_date: '', status: '' });
  const [deleteOrderTarget, setDeleteOrderTarget] = useState<PurchaseOrder | null>(null);

  const STATUS_MAP: Record<string, string> = {
    pending: t.purchases.pending,
    approved: t.purchases.approved,
    received: t.purchases.received,
    cancelled: t.purchases.cancelled,
  };

  const fmt = (v: number) => formatCurrency(v, language);

  const companyId = currentCompany?.id;
  const buId = currentBusinessUnit?.id;

  useEffect(() => {
    if (!companyId) return;
    const fetchData = async () => {
      setLoading(true);
      const [supRes, ordRes] = await Promise.all([
        withBuFilter(supabase.from('suppliers').select('*').eq('company_id', companyId).order('name'), buId),
        withBuFilter(supabase.from('purchase_orders').select('*').eq('company_id', companyId).order('created_at', { ascending: false }), buId),
      ]);
      const supList = supRes.data || [];
      setSuppliers(supList);
      const supMap = new Map(supList.map(s => [s.id, s.name]));
      setOrders((ordRes.data || []).map(o => ({
        ...o,
        supplier_name: supMap.get(o.supplier_id) || '—',
      })));
      setLoading(false);
    };
    fetchData();
  }, [companyId, buId]);

  const filteredSuppliers = useMemo(() => suppliers.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || (s.category || '').toLowerCase().includes(search.toLowerCase())
  ), [suppliers, search]);

  const filteredOrders = useMemo(() => orders.filter(o =>
    !search || (o.supplier_name || '').toLowerCase().includes(search.toLowerCase())
  ), [orders, search]);

  const { paginatedItems: paginatedSuppliers, ...supplierPagination } = usePagination(filteredSuppliers);
  const { paginatedItems: paginatedOrders, ...orderPagination } = usePagination(filteredOrders);

  const kpis = useMemo(() => {
    const activeSuppliers = suppliers.filter(s => s.is_active).length;
    const openOrders = orders.filter(o => ['pending', 'approved'].includes(o.status));
    const totalOpen = openOrders.reduce((s, o) => s + Number(o.total_value), 0);
    const totalSpent = orders.filter(o => o.status === 'received').reduce((s, o) => s + Number(o.total_value), 0);
    return { activeSuppliers, openCount: openOrders.length, totalOpen, totalSpent };
  }, [suppliers, orders]);

  const supplierSpendData = useMemo(() => {
    const map: Record<string, number> = {};
    orders.filter(o => o.status !== 'cancelled').forEach(o => {
      const name = o.supplier_name || '—';
      map[name] = (map[name] || 0) + Number(o.total_value);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [orders]);

  const typeSpendData = useMemo(() => {
    const map: Record<string, number> = {};
    orders.filter(o => o.status !== 'cancelled').forEach(o => {
      const supplier = suppliers.find(s => s.id === o.supplier_id);
      const cat = supplier?.category || '—';
      map[cat] = (map[cat] || 0) + Number(o.total_value);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [orders, suppliers]);

  const CHART_COLORS = ['hsl(217, 87%, 60%)', 'hsl(152, 60%, 42%)', 'hsl(38, 92%, 50%)', 'hsl(0, 72%, 55%)', 'hsl(255, 63%, 45%)'];

  const handleAddSupplier = async () => {
    if (!supplierForm.name || !companyId) return;
    const { data, error } = await supabase.from('suppliers').insert({
      company_id: companyId, business_unit_id: buId ?? null, name: supplierForm.name, category: supplierForm.category || null, phone: supplierForm.phone || null, email: supplierForm.email || null, created_by: supabaseUser?.id || null,
    } as any).select().single();
    if (error) { toast({ title: t.common.error, description: error.message, variant: 'destructive' }); return; }
    setSuppliers(prev => [...prev, data]);
    setSupplierForm({ name: '', category: '', phone: '', email: '' });
    setSupplierDialog(false);
    toast({ title: t.purchases.supplierCreated });
  };

  const handleAddOrder = async () => {
    if (!orderForm.supplier_id || !orderForm.value || !companyId) return;
    const { data, error } = await supabase.from('purchase_orders').insert({
      company_id: companyId, business_unit_id: buId ?? null, supplier_id: orderForm.supplier_id, items: [{ description: orderForm.description, value: parseFloat(orderForm.value) }], total_value: parseFloat(orderForm.value), expected_date: orderForm.expected_date || null, notes: orderForm.description, created_by: supabaseUser?.id || null,
    } as any).select().single();
    if (error) { toast({ title: t.common.error, description: error.message, variant: 'destructive' }); return; }
    const supplier = suppliers.find(s => s.id === orderForm.supplier_id);
    setOrders(prev => [{ ...data, supplier_name: supplier?.name || '' }, ...prev]);
    setOrderForm({ supplier_id: '', description: '', value: '', expected_date: '' });
    setOrderDialog(false);
    toast({ title: t.purchases.orderCreated });
  };

  const openEditSupplier = (s: Supplier) => {
    setEditingSupplier(s);
    setEditSupplierForm({ name: s.name, category: s.category || '', phone: s.phone || '', email: s.email || '', is_active: s.is_active });
  };

  const handleEditSupplier = async () => {
    if (!editingSupplier) return;
    const { error } = await supabase.from('suppliers').update({ name: editSupplierForm.name, category: editSupplierForm.category || null, phone: editSupplierForm.phone || null, email: editSupplierForm.email || null, is_active: editSupplierForm.is_active }).eq('id', editingSupplier.id);
    if (error) { toast({ title: t.common.error, description: error.message, variant: 'destructive' }); return; }
    setSuppliers(prev => prev.map(s => s.id === editingSupplier.id ? { ...s, ...editSupplierForm, category: editSupplierForm.category || null, phone: editSupplierForm.phone || null, email: editSupplierForm.email || null } : s));
    setEditingSupplier(null);
    toast({ title: t.purchases.supplierUpdated });
  };

  const handleDeleteSupplier = async () => {
    if (!deleteSupplierTarget) return;
    const { error } = await supabase.from('suppliers').delete().eq('id', deleteSupplierTarget.id);
    if (error) { toast({ title: t.common.error, description: error.message, variant: 'destructive' }); return; }
    setSuppliers(prev => prev.filter(s => s.id !== deleteSupplierTarget.id));
    setDeleteSupplierTarget(null);
    toast({ title: t.purchases.supplierDeleted });
  };

  const openEditOrder = (o: PurchaseOrder) => {
    setEditingOrder(o);
    setEditOrderForm({ supplier_id: o.supplier_id, description: o.notes || '', value: String(o.total_value), expected_date: o.expected_date || '', status: o.status });
  };

  const handleEditOrder = async () => {
    if (!editingOrder) return;
    const { error } = await supabase.from('purchase_orders').update({ supplier_id: editOrderForm.supplier_id, total_value: parseFloat(editOrderForm.value), notes: editOrderForm.description, expected_date: editOrderForm.expected_date || null, status: editOrderForm.status as any }).eq('id', editingOrder.id);
    if (error) { toast({ title: t.common.error, description: error.message, variant: 'destructive' }); return; }
    const supplier = suppliers.find(s => s.id === editOrderForm.supplier_id);
    setOrders(prev => prev.map(o => o.id === editingOrder.id ? { ...o, supplier_id: editOrderForm.supplier_id, supplier_name: supplier?.name || '', total_value: parseFloat(editOrderForm.value), notes: editOrderForm.description, expected_date: editOrderForm.expected_date || null, status: editOrderForm.status as any } : o));
    setEditingOrder(null);
    toast({ title: t.purchases.orderUpdated });
  };

  const handleDeleteOrder = async () => {
    if (!deleteOrderTarget) return;
    const { error } = await supabase.from('purchase_orders').delete().eq('id', deleteOrderTarget.id);
    if (error) { toast({ title: t.common.error, description: error.message, variant: 'destructive' }); return; }
    setOrders(prev => prev.filter(o => o.id !== deleteOrderTarget.id));
    setDeleteOrderTarget(null);
    toast({ title: t.purchases.orderDeleted });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t.purchases.title} description={t.purchases.description} icon={<ShoppingCart className="w-5 h-5 text-primary" />} />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <KPICard key={i} label="" value="" loading />)}
        </div>
        <TableSkeleton columns={5} rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t.purchases.title} description={t.purchases.description} icon={<ShoppingCart className="w-5 h-5 text-primary" />} />

      <div className="grid gap-4 md:grid-cols-4">
        <KPICard label={t.purchases.totalSuppliers} tooltip={t.purchases.totalSuppliersTooltip} value={String(kpis.activeSuppliers)} color="text-primary" />
        <KPICard label={t.purchases.openOrders ?? t.purchases.pendingOrders} tooltip={t.purchases.pendingOrdersTooltip} value={String(kpis.openCount)} color="text-warning" />
        <KPICard label={t.purchases.pendingOrders} tooltip={t.purchases.pendingOrdersTooltip} value={fmt(kpis.totalOpen)} color="text-warning" />
        <KPICard label={t.purchases.totalSpent} tooltip={t.purchases.totalSpentTooltip} value={fmt(kpis.totalSpent)} color="text-success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />{t.purchases.spendBySupplier}</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={supplierSpendData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={120} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} name={t.purchases.totalSpent}>
                    {supplierSpendData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Package className="w-4 h-4 text-primary" />{t.purchases.ordersByStatus}</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={typeSpendData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                    {typeSpendData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="suppliers">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="suppliers" className="gap-1.5"><Building className="w-4 h-4" /> {t.purchases.suppliers}</TabsTrigger>
            <TabsTrigger value="orders" className="gap-1.5"><Package className="w-4 h-4" /> {t.purchases.orders}</TabsTrigger>
          </TabsList>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9 w-[240px]" placeholder={t.purchases.searchSupplier} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <TabsContent value="suppliers" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={supplierDialog} onOpenChange={setSupplierDialog}>
              <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" /> {t.purchases.newSupplier}</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t.purchases.newSupplier}</DialogTitle></DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2"><Label>{t.common.name}</Label><Input value={supplierForm.name} onChange={e => setSupplierForm(f => ({ ...f, name: e.target.value }))} placeholder={t.purchases.supplierName} /></div>
                  <div className="space-y-2"><Label>{t.common.category}</Label><Input value={supplierForm.category} onChange={e => setSupplierForm(f => ({ ...f, category: e.target.value }))} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>{t.common.phone}</Label><Input value={supplierForm.phone} onChange={e => setSupplierForm(f => ({ ...f, phone: e.target.value }))} /></div>
                    <div className="space-y-2"><Label>{t.common.email}</Label><Input value={supplierForm.email} onChange={e => setSupplierForm(f => ({ ...f, email: e.target.value }))} /></div>
                  </div>
                </div>
                <DialogFooter><Button onClick={handleAddSupplier} disabled={!supplierForm.name}>{t.common.save}</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.purchases.supplier}</TableHead>
                  <TableHead>{t.common.category}</TableHead>
                  <TableHead>{t.common.contact}</TableHead>
                  <TableHead>{t.common.status}</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSuppliers.map(s => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center"><Building className="w-4 h-4 text-muted-foreground" /></div>
                        <div>
                          <p className="text-sm font-semibold">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{s.category || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.phone || '—'}</TableCell>
                    <TableCell><Badge variant={s.is_active ? 'default' : 'secondary'} className="text-xs">{s.is_active ? t.common.active : t.common.inactive}</Badge></TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditSupplier(s)}><Pencil className="w-4 h-4 mr-2" /> {t.common.edit}</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteSupplierTarget(s)} className="text-destructive focus:text-destructive"><Trash2 className="w-4 h-4 mr-2" /> {t.common.delete}</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredSuppliers.length === 0 && suppliers.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="p-0">
                    <EmptyState title={t.purchases.noSuppliers} description={t.purchases.addFirstSupplier} actionLabel={t.purchases.newSupplier} onAction={() => setSupplierDialog(true)} />
                  </TableCell></TableRow>
                )}
                {filteredSuppliers.length === 0 && suppliers.length > 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t.common.noResults}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination {...supplierPagination} />
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={orderDialog} onOpenChange={setOrderDialog}>
              <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" /> {t.purchases.newOrder}</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t.purchases.newOrder}</DialogTitle></DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>{t.purchases.supplier}</Label>
                    <Select value={orderForm.supplier_id} onValueChange={v => setOrderForm(f => ({ ...f, supplier_id: v }))}>
                      <SelectTrigger><SelectValue placeholder={t.purchases.selectSupplier} /></SelectTrigger>
                      <SelectContent>{suppliers.filter(s => s.is_active).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>{t.common.description}</Label><Input value={orderForm.description} onChange={e => setOrderForm(f => ({ ...f, description: e.target.value }))} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>{t.common.value}</Label><Input type="number" value={orderForm.value} onChange={e => setOrderForm(f => ({ ...f, value: e.target.value }))} /></div>
                    <div className="space-y-2"><Label>{t.purchases.expectedDate}</Label><Input type="date" value={orderForm.expected_date} onChange={e => setOrderForm(f => ({ ...f, expected_date: e.target.value }))} /></div>
                  </div>
                </div>
                <DialogFooter><Button onClick={handleAddOrder} disabled={!orderForm.supplier_id || !orderForm.value}>{t.common.save}</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.purchases.supplier}</TableHead>
                  <TableHead>{t.common.description}</TableHead>
                  <TableHead className="text-right">{t.common.value}</TableHead>
                  <TableHead>{t.purchases.expectedDate}</TableHead>
                  <TableHead>{t.common.status}</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrders.map(o => {
                  const cfg = ORDER_STATUS_CONFIG[o.status] || ORDER_STATUS_CONFIG['pending'];
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="text-sm">{o.supplier_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{o.notes || '—'}</TableCell>
                      <TableCell className="text-right font-semibold text-sm">{fmt(Number(o.total_value))}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{o.expected_date ? new Date(o.expected_date).toLocaleDateString(language === 'pt-BR' ? 'pt-BR' : language === 'es' ? 'es' : 'en-US') : '—'}</TableCell>
                      <TableCell><Badge variant="outline" className={`text-xs gap-1 ${cfg.color}`}>{cfg.icon} {STATUS_MAP[o.status]}</Badge></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditOrder(o)}><Pencil className="w-4 h-4 mr-2" /> {t.common.edit}</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteOrderTarget(o)} className="text-destructive focus:text-destructive"><Trash2 className="w-4 h-4 mr-2" /> {t.common.delete}</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredOrders.length === 0 && orders.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="p-0">
                    <EmptyState title={t.purchases.noOrders} description={t.purchases.addFirstOrder} actionLabel={t.purchases.newOrder} onAction={() => setOrderDialog(true)} />
                  </TableCell></TableRow>
                )}
                {filteredOrders.length === 0 && orders.length > 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t.common.noResults}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination {...orderPagination} />
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Supplier Dialog */}
      <Dialog open={!!editingSupplier} onOpenChange={() => setEditingSupplier(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.purchases.editSupplier}</DialogTitle><DialogDescription>{t.purchases.editSupplierDesc}</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>{t.common.name}</Label><Input value={editSupplierForm.name} onChange={e => setEditSupplierForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>{t.common.category}</Label><Input value={editSupplierForm.category} onChange={e => setEditSupplierForm(f => ({ ...f, category: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{t.common.phone}</Label><Input value={editSupplierForm.phone} onChange={e => setEditSupplierForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div className="space-y-2"><Label>{t.common.email}</Label><Input value={editSupplierForm.email} onChange={e => setEditSupplierForm(f => ({ ...f, email: e.target.value }))} /></div>
            </div>
            <div className="space-y-2">
              <Label>{t.common.status}</Label>
              <Select value={editSupplierForm.is_active ? 'active' : 'inactive'} onValueChange={v => setEditSupplierForm(f => ({ ...f, is_active: v === 'active' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t.common.active}</SelectItem>
                  <SelectItem value="inactive">{t.common.inactive}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={handleEditSupplier} disabled={!editSupplierForm.name}>{t.common.save}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Order Dialog */}
      <Dialog open={!!editingOrder} onOpenChange={() => setEditingOrder(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.purchases.editOrder}</DialogTitle><DialogDescription>{t.purchases.editOrderDesc}</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t.purchases.supplier}</Label>
              <Select value={editOrderForm.supplier_id} onValueChange={v => setEditOrderForm(f => ({ ...f, supplier_id: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>{t.common.description}</Label><Input value={editOrderForm.description} onChange={e => setEditOrderForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{t.common.value}</Label><Input type="number" value={editOrderForm.value} onChange={e => setEditOrderForm(f => ({ ...f, value: e.target.value }))} /></div>
              <div className="space-y-2"><Label>{t.purchases.expectedDate}</Label><Input type="date" value={editOrderForm.expected_date} onChange={e => setEditOrderForm(f => ({ ...f, expected_date: e.target.value }))} /></div>
            </div>
            <div className="space-y-2">
              <Label>{t.common.status}</Label>
              <Select value={editOrderForm.status} onValueChange={v => setEditOrderForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{t.purchases.pending}</SelectItem>
                  <SelectItem value="approved">{t.purchases.approved}</SelectItem>
                  <SelectItem value="received">{t.purchases.received}</SelectItem>
                  <SelectItem value="cancelled">{t.purchases.cancelled}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={handleEditOrder}>{t.common.save}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Supplier Confirmation */}
      <AlertDialog open={!!deleteSupplierTarget} onOpenChange={() => setDeleteSupplierTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.purchases.deleteSupplier}</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteSupplierTarget?.name}</strong> {t.purchases.deleteSupplierDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSupplier} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t.common.delete}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Order Confirmation */}
      <AlertDialog open={!!deleteOrderTarget} onOpenChange={() => setDeleteOrderTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.purchases.deleteOrder}</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteOrderTarget?.supplier_name}</strong> — {deleteOrderTarget ? fmt(Number(deleteOrderTarget.total_value)) : ''}. {t.purchases.deleteOrderDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOrder} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t.common.delete}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
