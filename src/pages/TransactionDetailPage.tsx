import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Receipt, Link2, ExternalLink, FolderKanban, User as UserIcon, Calendar, Tag, History, FileText, Search, Download, FileSpreadsheet, FileDown, Pencil, Loader2, X, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { exportToCSV, exportToPDF } from '@/lib/export-utils';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/format-utils';
import { format } from 'date-fns';
import { getDateLocale } from '@/i18n/date-locale';
import { useToast } from '@/hooks/use-toast';

interface TxData {
  id: string;
  date: string;
  due_date: string | null;
  description: string;
  category: string;
  type: 'income' | 'expense';
  status: string;
  value: number;
  recurrence: string;
  project_id: string | null;
  client_id: string | null;
  created_by: string | null;
  created_at: string;
  company_id: string;
  business_unit_id: string | null;
}

interface LogEntry {
  id: string;
  action: string;
  details: string | null;
  created_at: string;
  user_id: string | null;
  entity_name: string | null;
}

export default function TransactionDetailPage() {
  const { txId } = useParams<{ txId: string }>();
  const navigate = useNavigate();
  const { t, language } = useI18n();
  const { toast } = useToast();
  const { currentCompany, supabaseUser, user } = useAuth();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<{ category: string; status: string; recurrence: string }>({ category: '', status: '', recurrence: '' });

  const [tx, setTx] = useState<TxData | null>(null);
  const [project, setProject] = useState<{ id: string; name: string; source_deal_id: string | null } | null>(null);
  const [client, setClient] = useState<{ id: string; name: string } | null>(null);
  const [sourceDeal, setSourceDeal] = useState<{ id: string; title: string; value: number; stage_name: string } | null>(null);
  const [invoice, setInvoice] = useState<{ id: string; number: string; status: string; value: number; issued_at: string | null; description: string | null; created_at: string } | null>(null);
  const [businessUnit, setBusinessUnit] = useState<{ id: string; name: string; code: string | null } | null>(null);
  const [creator, setCreator] = useState<{ name: string; email: string } | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [logSearch, setLogSearch] = useState('');
  const [logVisible, setLogVisible] = useState(10);
  const LOG_PAGE_SIZE = 10;
  const [userMap, setUserMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!txId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data: txRow, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', txId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !txRow) {
        toast({ title: t.transactionDetail.notFound, variant: 'destructive' });
        setLoading(false);
        return;
      }
      setTx(txRow as TxData);

      if (txRow.project_id) {
        const { data: pRow } = await supabase
          .from('projects')
          .select('id, name, source_deal_id')
          .eq('id', txRow.project_id)
          .maybeSingle();
        if (!cancelled && pRow) {
          setProject(pRow as any);
          if ((pRow as any).source_deal_id) {
            const { data: dRow } = await supabase
              .from('crm_pipeline_deals')
              .select('id, title, value, stage_name')
              .eq('id', (pRow as any).source_deal_id)
              .maybeSingle();
            if (!cancelled && dRow) setSourceDeal(dRow as any);
          }
        }
      }
      if (txRow.client_id) {
        const { data: cRow } = await supabase
          .from('clients')
          .select('id, name')
          .eq('id', txRow.client_id)
          .maybeSingle();
        if (!cancelled && cRow) setClient(cRow as any);
      }
      const { data: invRow } = await supabase
        .from('invoices')
        .select('id, number, status, value, issued_at, description, created_at')
        .eq('transaction_id', txRow.id)
        .maybeSingle();
      if (!cancelled && invRow) setInvoice(invRow as any);

      if (txRow.business_unit_id) {
        const { data: buRow } = await supabase
          .from('business_units')
          .select('id, name, code')
          .eq('id', txRow.business_unit_id)
          .maybeSingle();
        if (!cancelled && buRow) setBusinessUnit(buRow as any);
      }

      if (txRow.created_by) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('user_id', txRow.created_by)
          .maybeSingle();
        if (!cancelled && prof) setCreator(prof as any);
      }

      const { data: logRows } = await supabase
        .from('activity_logs')
        .select('id, action, details, created_at, user_id, entity_name')
        .eq('entity', 'transaction')
        .eq('entity_id', txRow.id)
        .order('created_at', { ascending: false })
        .limit(200);
      if (!cancelled && logRows) {
        setLogs(logRows as any);
        const ids = Array.from(new Set((logRows as any[]).map(l => l.user_id).filter(Boolean)));
        if (ids.length > 0) {
          const { data: profs } = await supabase
            .from('profiles')
            .select('user_id, name, email')
            .in('user_id', ids as string[]);
          if (!cancelled && profs) {
            const map: Record<string, string> = {};
            (profs as any[]).forEach(p => { map[p.user_id] = p.name || p.email || ''; });
            setUserMap(map);
          }
        }
      }

      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [txId, toast, t.transactionDetail.notFound]);

  const getFilteredLogs = () => {
    const q = logSearch.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter(l =>
      (l.action || '').toLowerCase().includes(q) ||
      (l.details || '').toLowerCase().includes(q) ||
      (l.entity_name || '').toLowerCase().includes(q)
    );
  };

  const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
    { value: 'pending', label: t.transactionDetail.statusPending },
    { value: 'paid', label: t.transactionDetail.statusPaid },
    { value: 'overdue', label: t.transactionDetail.statusOverdue },
    { value: 'cancelled', label: t.transactionDetail.statusCancelled },
  ];
  const RECURRENCE_OPTIONS: Array<{ value: string; label: string }> = [
    { value: 'none', label: t.transactionDetail.recurrenceNone },
    { value: 'weekly', label: t.transactionDetail.recurrenceWeekly },
    { value: 'monthly', label: t.transactionDetail.recurrenceMonthly },
    { value: 'yearly', label: t.transactionDetail.recurrenceYearly },
  ];
  const CATEGORY_OPTIONS: Array<{ value: string; label: string }> = [
    { value: 'Revenue', label: t.transactionDetail.catRevenue },
    { value: 'Operating Expense', label: t.transactionDetail.catOperating },
    { value: 'Fixed Cost', label: t.transactionDetail.catFixed },
    { value: 'Tax', label: t.transactionDetail.catTax },
    { value: 'Other', label: t.transactionDetail.catOther },
  ];
  const labelFor = (opts: typeof STATUS_OPTIONS, v: string) => opts.find(o => o.value === v)?.label || v;

  const startEdit = () => {
    if (!tx) return;
    setDraft({ category: tx.category || '', status: tx.status || 'pending', recurrence: tx.recurrence || 'none' });
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!tx) return;
    const changes: Record<string, { from: string; to: string }> = {};
    if (draft.category !== (tx.category || '')) changes.category = { from: tx.category || '', to: draft.category };
    if (draft.status !== tx.status) changes.status = { from: tx.status, to: draft.status };
    if (draft.recurrence !== tx.recurrence) changes.recurrence = { from: tx.recurrence, to: draft.recurrence };
    if (Object.keys(changes).length === 0) {
      toast({ title: t.transactionDetail.noChanges });
      setEditing(false);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('transactions')
      .update({
        category: draft.category,
        status: draft.status as any,
        recurrence: draft.recurrence as any,
      })
      .eq('id', tx.id);
    if (error) {
      setSaving(false);
      toast({ title: t.transactionDetail.saveError, description: error.message, variant: 'destructive' });
      return;
    }
    const detailsParts = Object.entries(changes).map(([field, { from, to }]) => `${field}: "${from}" → "${to}"`);
    const logRow = {
      company_id: tx.company_id || currentCompany?.id,
      user_id: supabaseUser?.id || null,
      entity: 'transaction',
      entity_id: tx.id,
      entity_name: tx.description || tx.category || null,
      action: 'updated',
      details: detailsParts.join('; '),
    };
    const { data: insertedLog } = await supabase
      .from('activity_logs')
      .insert(logRow)
      .select('id, action, details, created_at, user_id, entity_name')
      .maybeSingle();

    setTx({ ...tx, category: draft.category, status: draft.status, recurrence: draft.recurrence });
    if (insertedLog) {
      setLogs(prev => [insertedLog as any, ...prev]);
      if (supabaseUser?.id) {
        setUserMap(prev => prev[supabaseUser.id] ? prev : { ...prev, [supabaseUser.id]: user?.name || user?.email || '' });
      }
    }
    setSaving(false);
    setEditing(false);
    toast({ title: t.transactionDetail.saveSuccess });
  };

  const handleExport = (kind: 'csv' | 'pdf') => {
    const rows = getFilteredLogs();
    if (rows.length === 0) {
      toast({ title: t.transactionDetail.exportEmpty });
      return;
    }
    const columns = [
      { header: t.transactionDetail.colDate, accessor: (r: LogEntry) => format(new Date(r.created_at), 'PPp', { locale: getDateLocale(language) }) },
      { header: t.transactionDetail.colAction, accessor: (r: LogEntry) => r.action || '' },
      { header: t.transactionDetail.colDetails, accessor: (r: LogEntry) => r.details || '' },
      { header: t.transactionDetail.colUser, accessor: (r: LogEntry) => (r.user_id && userMap[r.user_id]) || '—' },
    ];
    const safe = (tx?.description || tx?.category || 'transaction').replace(/[^a-z0-9]+/gi, '_').toLowerCase();
    const filename = `${safe}_history_${new Date().toISOString().slice(0, 10)}`;
    if (kind === 'csv') {
      exportToCSV(filename, columns, rows);
    } else {
      exportToPDF(
        filename,
        `${t.transactionDetail.historySection} — ${tx?.description || tx?.category || ''}`,
        columns,
        rows,
      );
    }
  };

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto p-4 space-y-4">
        <div className="h-10 rounded bg-muted/40 animate-pulse" />
        <div className="h-40 rounded bg-muted/40 animate-pulse" />
        <div className="h-40 rounded bg-muted/40 animate-pulse" />
      </div>
    );
  }

  if (!tx) {
    return (
      <div className="container max-w-4xl mx-auto p-6 text-center">
        <Receipt className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
        <p className="text-sm text-muted-foreground">{t.transactionDetail.notFound}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> {t.transactionDetail.back}
        </Button>
      </div>
    );
  }

  const isIncome = tx.type === 'income';
  const Icon = isIncome ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="container max-w-4xl mx-auto p-4">
      <PageHeader
        title={t.transactionDetail.title}
        description={tx.description || tx.category}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> {t.transactionDetail.back}
          </Button>
        }
      />

      {/* Summary */}
      <Card className="mb-4">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant={isIncome ? 'default' : 'secondary'} className={isIncome ? 'bg-emerald-600 hover:bg-emerald-600' : 'bg-destructive hover:bg-destructive text-destructive-foreground'}>
                  <Icon className="w-3 h-3 mr-1" />
                  {isIncome ? t.transactionDetail.income : t.transactionDetail.expense}
                </Badge>
                <Badge variant="outline" className="text-[10px]">{labelFor(STATUS_OPTIONS, tx.status)}</Badge>
                {tx.recurrence && tx.recurrence !== 'none' && (
                  <Badge variant="outline" className="text-[10px]">{labelFor(RECURRENCE_OPTIONS, tx.recurrence)}</Badge>
                )}
              </div>
              <h2 className="text-base font-semibold truncate">{tx.description || '—'}</h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                <span className="inline-flex items-center gap-1"><Tag className="w-3 h-3" />{labelFor(CATEGORY_OPTIONS, tx.category || '') || '—'}</span>
                <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(tx.date), 'PP', { locale: getDateLocale(language) })}</span>
                {tx.due_date && (
                  <span className="inline-flex items-center gap-1">
                    {t.transactionDetail.dueDate}: {format(new Date(tx.due_date), 'PP', { locale: getDateLocale(language) })}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className={`text-right ${isIncome ? 'text-emerald-600' : 'text-destructive'}`}>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t.transactionDetail.amount}</p>
                <p className="text-2xl font-bold whitespace-nowrap">{isIncome ? '+' : '-'}{formatCurrency(Number(tx.value || 0), language)}</p>
              </div>
              {!editing && (
                <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={startEdit}>
                  <Pencil className="w-3.5 h-3.5" />
                  <span className="text-xs">{t.transactionDetail.editAttributes}</span>
                </Button>
              )}
            </div>
          </div>

          {editing && (
            <div className="mt-4 pt-4 border-t grid sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">{t.transactionDetail.fieldCategory}</Label>
                <Select value={draft.category} onValueChange={v => setDraft(d => ({ ...d, category: v }))}>
                  <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{t.transactionDetail.fieldStatus}</Label>
                <Select value={draft.status} onValueChange={v => setDraft(d => ({ ...d, status: v }))}>
                  <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{t.transactionDetail.fieldRecurrence}</Label>
                <Select value={draft.recurrence} onValueChange={v => setDraft(d => ({ ...d, recurrence: v }))}>
                  <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RECURRENCE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-3 flex items-center justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>
                  <X className="w-3.5 h-3.5 mr-1" /> {t.transactionDetail.cancel}
                </Button>
                <Button size="sm" onClick={saveEdit} disabled={saving}>
                  {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                  {t.transactionDetail.saveChanges}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Origin */}
      <Card className="mb-4">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary" />
            {t.transactionDetail.originSection}
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {project ? (
              <div className="p-3 rounded-md border hover:bg-muted/40 transition-colors">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                  <FolderKanban className="w-3 h-3" /> {t.transactionDetail.linkedProject}
                </p>
                <p className="text-sm font-medium truncate">{project.name}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 mt-2 text-xs gap-1"
                  onClick={() => navigate(`/projects/workspace/${project.id}`)}
                >
                  {t.transactionDetail.openLink} <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div className="p-3 rounded-md border border-dashed text-xs text-muted-foreground">
                {t.transactionDetail.noProject}
              </div>
            )}

            {sourceDeal ? (
              <div className="p-3 rounded-md border hover:bg-muted/40 transition-colors" style={{ borderColor: '#4084F2' }}>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                  <Link2 className="w-3 h-3" style={{ color: '#4084F2' }} /> {t.transactionDetail.sourceDeal}
                </p>
                <p className="text-sm font-medium truncate">{sourceDeal.title}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(Number(sourceDeal.value || 0), language)} · {sourceDeal.stage_name}</p>
                <Button
                  size="sm"
                  className="h-7 mt-2 text-xs gap-1 text-white hover:opacity-90"
                  style={{ backgroundColor: '#4084F2' }}
                  onClick={() => navigate(`/crm/pipeline?dealId=${sourceDeal.id}`)}
                >
                  {t.transactionDetail.openLink} <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div className="p-3 rounded-md border border-dashed text-xs text-muted-foreground">
                {t.transactionDetail.noSourceDeal}
              </div>
            )}

            {client && (
              <div className="p-3 rounded-md border hover:bg-muted/40 transition-colors">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                  <UserIcon className="w-3 h-3" /> {t.transactionDetail.client}
                </p>
                <p className="text-sm font-medium truncate">{client.name}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 mt-2 text-xs gap-1"
                  onClick={() => navigate(`/clients/${client.id}`)}
                >
                  {t.transactionDetail.openLink} <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            )}

            {invoice && (
              <div className="p-3 rounded-md border hover:bg-muted/40 transition-colors">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                  <FileText className="w-3 h-3" /> {t.transactionDetail.invoice}
                </p>
                <p className="text-sm font-medium truncate">#{invoice.number}</p>
                <Badge variant="outline" className="text-[10px] mt-1">{invoice.status}</Badge>
                <div className="mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => navigate(`/financial?invoiceId=${invoice.id}`)}
                  >
                    {t.transactionDetail.openLink} <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}

            {creator && (
              <div className="p-3 rounded-md border sm:col-span-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t.transactionDetail.createdBy}</p>
                <p className="text-sm font-medium">{creator.name} <span className="text-xs text-muted-foreground">· {creator.email}</span></p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(new Date(tx.created_at), 'PPp', { locale: getDateLocale(language) })}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Fiscal & Invoice Details */}
      <Card className="mb-4">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            {t.transactionDetail.fiscalSection}
          </h3>

          <div className="grid sm:grid-cols-3 gap-3 mb-3">
            <div className="p-3 rounded-md border">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t.transactionDetail.txDate}</p>
              <p className="text-sm font-medium mt-0.5">{format(new Date(tx.date), 'PP', { locale: getDateLocale(language) })}</p>
            </div>
            <div className="p-3 rounded-md border">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t.transactionDetail.txDueDate}</p>
              <p className="text-sm font-medium mt-0.5">
                {tx.due_date ? format(new Date(tx.due_date), 'PP', { locale: getDateLocale(language) }) : '—'}
              </p>
            </div>
            <div className="p-3 rounded-md border">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t.transactionDetail.businessUnit}</p>
              <p className="text-sm font-medium mt-0.5 truncate">
                {businessUnit ? `${businessUnit.name}${businessUnit.code ? ` · ${businessUnit.code}` : ''}` : '—'}
              </p>
            </div>
          </div>

          {invoice ? (
            <div className="rounded-md border p-4 bg-muted/20">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t.transactionDetail.invoiceNumber}</p>
                  <p className="text-base font-semibold">#{invoice.number}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">{invoice.status}</Badge>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t.transactionDetail.invoiceTotal}</p>
                  <p className="text-sm font-semibold mt-0.5">{formatCurrency(Number(invoice.value || 0), language)}</p>
                  {Number(invoice.value || 0) !== Number(tx.value || 0) ? (
                    <p className="text-[10px] text-destructive mt-0.5">{t.transactionDetail.valueMismatch}</p>
                  ) : (
                    <p className="text-[10px] text-emerald-600 mt-0.5">{t.transactionDetail.valueMatch}</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t.transactionDetail.invoiceIssuedAt}</p>
                  <p className="text-sm mt-0.5">
                    {invoice.issued_at ? format(new Date(invoice.issued_at), 'PP', { locale: getDateLocale(language) }) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t.transactionDetail.invoiceCreatedAt}</p>
                  <p className="text-sm mt-0.5">
                    {format(new Date(invoice.created_at), 'PP', { locale: getDateLocale(language) })}
                  </p>
                </div>
              </div>

              {invoice.description && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t.transactionDetail.invoiceDescription}</p>
                  <p className="text-xs mt-0.5 whitespace-pre-wrap">{invoice.description}</p>
                </div>
              )}

              <div className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => navigate(`/financial?invoiceId=${invoice.id}`)}
                >
                  {t.transactionDetail.openLink} <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-md border border-dashed text-xs text-muted-foreground text-center">
              {t.transactionDetail.noInvoice}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change History */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              {t.transactionDetail.historySection}
            </h3>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={logSearch}
                  onChange={(e) => { setLogSearch(e.target.value); setLogVisible(LOG_PAGE_SIZE); }}
                  placeholder={t.transactionDetail.historySearchPlaceholder}
                  className="h-8 pl-8 text-xs"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 shrink-0">
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-xs">{t.transactionDetail.exportHistory}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport('csv')}>
                    <FileSpreadsheet className="w-3.5 h-3.5 mr-2" />
                    {t.transactionDetail.exportCSV}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('pdf')}>
                    <FileDown className="w-3.5 h-3.5 mr-2" />
                    {t.transactionDetail.exportPDF}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {(() => {
            const q = logSearch.trim().toLowerCase();
            const filtered = q
              ? logs.filter(l =>
                  (l.action || '').toLowerCase().includes(q) ||
                  (l.details || '').toLowerCase().includes(q) ||
                  (l.entity_name || '').toLowerCase().includes(q)
                )
              : logs;
            const visible = filtered.slice(0, logVisible);
            if (logs.length === 0) {
              return (
                <div className="py-6 text-center text-xs text-muted-foreground border border-dashed rounded-md">
                  {t.transactionDetail.noHistory}
                </div>
              );
            }
            if (filtered.length === 0) {
              return (
                <div className="py-6 text-center text-xs text-muted-foreground border border-dashed rounded-md">
                  {t.transactionDetail.historyNoResults}
                </div>
              );
            }
            return (
              <>
                <ol className="relative border-l border-border ml-2 space-y-3">
                  {visible.map((log) => (
                    <li key={log.id} className="ml-4">
                      <div className="absolute -left-1.5 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                      <p className="text-xs font-medium capitalize">{log.action}</p>
                      {log.details && <p className="text-xs text-muted-foreground mt-0.5">{log.details}</p>}
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {format(new Date(log.created_at), 'PPp', { locale: getDateLocale(language) })}
                      </p>
                    </li>
                  ))}
                </ol>
                <div className="flex items-center justify-between mt-4 pt-3 border-t gap-3 flex-wrap">
                  <p className="text-[11px] text-muted-foreground">
                    {t.transactionDetail.showingCount
                      .replace('{shown}', String(visible.length))
                      .replace('{total}', String(filtered.length))}
                  </p>
                  {visible.length < filtered.length && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLogVisible(v => v + LOG_PAGE_SIZE)}
                    >
                      {t.transactionDetail.loadMore}
                    </Button>
                  )}
                </div>
              </>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
