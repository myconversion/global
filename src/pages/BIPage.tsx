import { useState, useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, TrendingUp, Users, DollarSign, Target, Wallet } from 'lucide-react';
import { KPICard } from '@/components/shared/KPICard';
import { EmptyState } from '@/components/shared/EmptyState';
import { TableSkeleton } from '@/components/shared/TableSkeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { withBuFilter } from '@/lib/bu-filter';
import { formatCurrency } from '@/lib/format-utils';

interface PipelineDealRow {
  id: string;
  pipeline_id: string;
  stage_name: string;
  value: number;
  contact_id: string | null;
  crm_company_id: string | null;
}
interface PipelineRow { id: string; name: string; stages: { name: string; probability: number }[] }
interface TxRow { id: string; type: 'income' | 'expense'; status: string; value: number; date: string; description: string; category: string }

function ChartSkeleton() {
  return (
    <div className="h-[280px] flex items-end gap-2 px-4 pb-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="flex-1 rounded-t-md" style={{ height: `${Math.max(20, Math.random() * 100)}%` }} />
      ))}
    </div>
  );
}

export default function BIPage() {
  const { currentCompany, currentBusinessUnit, role } = useAuth();
  const { t, language } = useI18n();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [deals, setDeals] = useState<PipelineDealRow[]>([]);
  const [pipelines, setPipelines] = useState<PipelineRow[]>([]);
  const [contacts, setContacts] = useState<{ id: string; name: string }[]>([]);
  const [crmCompanies, setCrmCompanies] = useState<{ id: string; name: string }[]>([]);

  const companyId = currentCompany?.id;
  const buId = currentBusinessUnit?.id;
  const fmt = (v: number) => formatCurrency(v, language);
  // Force en-US for all chart/table dates per spec.
  const localeStr = 'en-US';
  const dateFmt = (d: string) => new Date(d).toLocaleDateString(localeStr, { month: 'short', day: '2-digit', year: 'numeric' });

  useEffect(() => {
    if (!companyId) return;
    const fetchAll = async () => {
      setLoading(true);
      const [txRes, dealRes, pipeRes, contactsRes, crmCompaniesRes] = await Promise.all([
        withBuFilter(supabase.from('transactions').select('id, type, status, value, date, description, category').eq('company_id', companyId), buId),
        withBuFilter(supabase.from('crm_pipeline_deals').select('id, pipeline_id, stage_name, value, contact_id, crm_company_id').eq('company_id', companyId), buId),
        supabase.from('crm_pipelines').select('id, name, stages').eq('company_id', companyId),
        supabase.from('crm_contacts').select('id, name').eq('company_id', companyId),
        supabase.from('crm_companies').select('id, razao_social, nome_fantasia').eq('company_id', companyId),
      ]);
      setTransactions((txRes.data ?? []) as any);
      setDeals(((dealRes.data ?? []) as any).map((d: any) => ({ ...d, value: Number(d.value) })));
      setPipelines(((pipeRes.data ?? []) as any).map((p: any) => ({ id: p.id, name: p.name, stages: Array.isArray(p.stages) ? p.stages : [] })));
      setContacts((contactsRes.data ?? []) as any);
      setCrmCompanies(((crmCompaniesRes.data ?? []) as any[]).map(c => ({ id: c.id, name: c.nome_fantasia || c.razao_social })));
      setLoading(false);
    };
    fetchAll();
  }, [companyId, buId]);

  // ── KPIs ──
  const kpis = useMemo(() => {
    const paidIncome = transactions.filter(tx => tx.type === 'income' && tx.status === 'paid').reduce((s, tx) => s + Number(tx.value), 0);
    const paidExpense = transactions.filter(tx => tx.type === 'expense' && tx.status === 'paid').reduce((s, tx) => s + Number(tx.value), 0);
    const netProfit = paidIncome - paidExpense;
    // Pipeline value = sum of open deals (probability not 0 and not 100)
    const pipelineValue = deals.reduce((s, d) => {
      const pipe = pipelines.find(p => p.id === d.pipeline_id);
      const prob = pipe?.stages.find(st => st.name === d.stage_name)?.probability ?? 50;
      if (prob === 0 || prob === 100) return s;
      return s + Number(d.value);
    }, 0);
    return { paidIncome, paidExpense, netProfit, pipelineValue };
  }, [transactions, deals, pipelines]);

  // ── Monthly Revenue vs Expenses (last 6 months) ──
  const monthlyData = useMemo(() => {
    const months: { key: string; name: string; revenue: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ key, name: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), revenue: 0, expense: 0 });
    }
    transactions.forEach(tx => {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const m = months.find(x => x.key === key);
      if (!m) return;
      if (tx.type === 'income') m.revenue += Number(tx.value);
      else m.expense += Number(tx.value);
    });
    return months;
  }, [transactions]);
  const hasFinancialData = monthlyData.some(m => m.revenue > 0 || m.expense > 0);

  // ── Deals by Stage (horizontal bar) ──
  const dealsByStage = useMemo(() => {
    const map = new Map<string, number>();
    deals.forEach(d => map.set(d.stage_name, (map.get(d.stage_name) ?? 0) + 1));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [deals]);

  // ── Top 5 Clients (by total deal value) ──
  const topClients = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>();
    deals.forEach(d => {
      let key = '', name = '';
      if (d.contact_id) {
        key = `c:${d.contact_id}`;
        name = contacts.find(c => c.id === d.contact_id)?.name ?? '—';
      } else if (d.crm_company_id) {
        key = `co:${d.crm_company_id}`;
        name = crmCompanies.find(c => c.id === d.crm_company_id)?.name ?? '—';
      } else return;
      const prev = map.get(key) ?? { name, total: 0, count: 0 };
      prev.total += Number(d.value);
      prev.count += 1;
      map.set(key, prev);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [deals, contacts, crmCompanies]);

  // ── Recent Transactions (last 10) ──
  const recentTx = useMemo(() => {
    return [...transactions].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 10);
  }, [transactions]);

  if (role === 'collaborator') return <Navigate to="/my-tasks" replace />;

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t.sectors.bi} description="Business Intelligence" icon={<BarChart3 className="w-5 h-5 text-primary" />} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <KPICard key={i} label="" value="" loading sparkline />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2"><CardHeader className="pb-2"><Skeleton className="h-5 w-48" /></CardHeader><CardContent><ChartSkeleton /></CardContent></Card>
          <Card><CardHeader className="pb-2"><Skeleton className="h-5 w-32" /></CardHeader><CardContent><ChartSkeleton /></CardContent></Card>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TableSkeleton columns={3} rows={5} />
          <TableSkeleton columns={5} rows={10} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t.sectors.bi} description="Business Intelligence" icon={<BarChart3 className="w-5 h-5 text-primary" />} />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Revenue" value={fmt(kpis.paidIncome)} icon={<DollarSign className="w-5 h-5" />} gradient="from-emerald-500 to-emerald-600" sparkline />
        <KPICard label="Total Expenses" value={fmt(kpis.paidExpense)} icon={<Wallet className="w-5 h-5" />} gradient="from-rose-500 to-pink-500" sparkline />
        <KPICard label="Net Profit" value={fmt(kpis.netProfit)} icon={<TrendingUp className="w-5 h-5" />} gradient="from-blue-500 to-blue-600" sparkline />
        <KPICard label="Pipeline Value" value={fmt(kpis.pipelineValue)} icon={<Target className="w-5 h-5" />} gradient="from-amber-500 to-orange-500" sparkline />
      </div>

      {/* Revenue vs Expenses (last 6 months) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Revenue vs Expenses (last 6 months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hasFinancialData ? (
            <EmptyState icon={<DollarSign className="w-9 h-9 text-muted-foreground/60" />} title="No financial data for this period" description="Add transactions in Financial to see this report." />
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => fmt(v).replace(/\.\d{2}$/, '')} />
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                  <Legend />
                  <Bar dataKey="revenue" fill="hsl(152, 60%, 42%)" radius={[4, 4, 0, 0]} name="Revenue" />
                  <Bar dataKey="expense" fill="hsl(0, 72%, 55%)" radius={[4, 4, 0, 0]} name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deals by Stage + Top Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> Deals by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            {dealsByStage.length === 0 ? (
              <EmptyState icon={<Target className="w-9 h-9 text-muted-foreground/60" />} title="No deals yet" description="Add deals in CRM Pipeline." />
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dealsByStage} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={120} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                    <Bar dataKey="value" fill="hsl(217, 87%, 60%)" radius={[0, 4, 4, 0]} name="Deals" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Top 5 Clients by Value</CardTitle>
          </CardHeader>
          <CardContent>
            {topClients.length === 0 ? (
              <EmptyState icon={<Users className="w-9 h-9 text-muted-foreground/60" />} title="No clients yet" description="Link deals to contacts or companies." />
            ) : (
              <div className="space-y-2">
                {topClients.map((c, i) => (
                  <div key={`${c.name}-${i}`} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                      <span className="text-sm font-medium truncate" title={c.name}>{c.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm shrink-0">
                      <Badge variant="secondary" className="text-xs">{c.count} {c.count === 1 ? 'deal' : 'deals'}</Badge>
                      <span className="font-semibold text-emerald-600">{fmt(c.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" /> Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTx.length === 0 ? (
            <EmptyState icon={<DollarSign className="w-9 h-9 text-muted-foreground/60" />} title="No transactions yet" description="Add transactions in Financial." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTx.map(tx => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-sm text-muted-foreground">{dateFmt(tx.date)}</TableCell>
                    <TableCell className="text-sm">{tx.description}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{tx.category}</TableCell>
                    <TableCell className={`text-right text-sm font-semibold ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {tx.type === 'income' ? '+' : '−'}{fmt(Number(tx.value))}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">{tx.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
