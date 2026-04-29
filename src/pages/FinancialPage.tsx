import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { useFinancial } from '@/contexts/FinancialContext';
import { useI18n } from '@/contexts/I18nContext';
import { getDateLocale } from '@/i18n/date-locale';
import type { TransactionType, TransactionStatus, RecurrenceFrequency } from '@/types';
import {
  DollarSign, Plus, ArrowUpRight, ArrowDownRight, Search,
  TrendingUp, TrendingDown, AlertTriangle, Clock, Trash2, Download, FileText, FileSpreadsheet
} from 'lucide-react';
import { KPICard } from '@/components/shared/KPICard';
import { EmptyState } from '@/components/shared/EmptyState';
import { TablePagination } from '@/components/shared/TablePagination';
import { usePagination } from '@/hooks/usePagination';
import { format } from 'date-fns';
import { exportToCSV, exportToPDF } from '@/lib/export-utils';
import { formatCurrency, getDateFormatPattern, getDateFormatShort, getCurrencySymbol } from '@/lib/format-utils';

export default function FinancialPage() {
  const { filteredTransactions, filters, setFilters, kpis, addTransaction, deleteTransaction } = useFinancial();
  const { t, language } = useI18n();
  const dateLocale = getDateLocale(language);
  const datePattern = getDateFormatPattern(language);
  const dateShort = getDateFormatShort(language);
  const currSym = getCurrencySymbol(language);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [savingTx, setSavingTx] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [form, setForm] = useState({ type: 'income' as TransactionType, category: '', description: '', value: '', date: '', dueDate: '', status: 'pending' as TransactionStatus, recurrence: 'none' as RecurrenceFrequency });
  const { paginatedItems: paginatedTransactions, ...financialPagination } = usePagination(filteredTransactions);

  const STATUS_LABELS: Record<TransactionStatus, string> = {
    pending: t.financial.pending, paid: t.financial.paid, overdue: t.financial.overdue, cancelled: t.financial.cancelled,
  };
  const STATUS_VARIANT: Record<TransactionStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    paid: 'default', pending: 'secondary', overdue: 'destructive', cancelled: 'outline',
  };

  const txColumns = [
    { header: t.common.type, accessor: (r: any) => r.type === 'income' ? t.financial.income : t.financial.expense },
    { header: t.common.description, accessor: (r: any) => r.description },
    { header: t.common.category, accessor: (r: any) => r.category },
    { header: t.common.date, accessor: (r: any) => r.date ? format(new Date(r.date), datePattern) : '' },
    { header: t.financial.dueDate, accessor: (r: any) => r.dueDate ? format(new Date(r.dueDate), datePattern) : '' },
    { header: t.common.value, accessor: (r: any) => formatCurrency(r.value, language) },
    { header: t.common.status, accessor: (r: any) => STATUS_LABELS[r.status as TransactionStatus] ?? r.status },
  ];

  const handleExportCSV = () => exportToCSV('financeiro', txColumns, filteredTransactions);
  const handleExportPDF = () => exportToPDF('financeiro', t.financial.financialReport, txColumns, filteredTransactions, [
    { label: t.financial.income, value: formatCurrency(kpis.totalIncome, language) },
    { label: t.financial.expenses, value: formatCurrency(kpis.totalExpense, language) },
    { label: t.financial.profit, value: formatCurrency(kpis.netProfit, language) },
  ]);

  const handleAdd = async () => {
    if (!form.description || !form.value) return;
    setSavingTx(true);
    try {
      addTransaction({ ...form, value: parseFloat(form.value), date: form.date || new Date().toISOString().split('T')[0], recurrence: form.recurrence });
      setForm({ type: 'income', category: '', description: '', value: '', date: '', dueDate: '', status: 'pending', recurrence: 'none' });
      setDialogOpen(false);
    } finally {
      setSavingTx(false);
    }
  };

  const handleDeleteConfirmed = () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget);
    deleteTransaction(deleteTarget);
    setDeleteTarget(null);
    setDeletingId(null);
  };

  const summaryCards = [
    { label: t.financial.revenueMonth, tooltip: t.financial.revenueMonthTooltip, value: kpis.totalIncome, icon: <TrendingUp className="w-5 h-5" />, gradient: 'from-emerald-500 to-emerald-600' },
    { label: t.financial.expensesMonth, tooltip: t.financial.expensesMonthTooltip, value: kpis.totalExpense, icon: <TrendingDown className="w-5 h-5" />, gradient: 'from-red-500 to-rose-600' },
    { label: t.financial.netProfit, tooltip: t.financial.netProfitTooltip, value: kpis.netProfit, icon: <DollarSign className="w-5 h-5" />, gradient: kpis.netProfit >= 0 ? 'from-blue-500 to-blue-600' : 'from-red-500 to-rose-600' },
    { label: t.financial.receivables, tooltip: t.financial.receivablesTooltip, value: kpis.pendingReceivables, icon: <Clock className="w-5 h-5" />, gradient: 'from-amber-500 to-orange-500', extra: `${kpis.overdueCount} ${t.financial.overdueCount}` },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.financial.title}
        description={t.financial.description}
        icon={<DollarSign className="w-5 h-5 text-primary" />}
        actions={
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2"><Download className="w-4 h-4" /> {t.common.export}</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExportCSV()}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" /> {t.common.exportCSV}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportPDF()}>
                  <FileText className="w-4 h-4 mr-2" /> {t.common.exportPDF}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="w-4 h-4" /> {t.financial.newTransaction}</Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader><DialogTitle>{t.financial.createTransaction}</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{t.common.type}</Label>
                    <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as TransactionType }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">{t.financial.income}</SelectItem>
                        <SelectItem value="expense">{t.financial.expense}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t.common.category}</Label>
                    <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'pt-BR' ? 'Selecione uma categoria' : language === 'es' ? 'Seleccione una categoría' : 'Select a category'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Revenue">{language === 'pt-BR' ? 'Receita' : language === 'es' ? 'Ingresos' : 'Revenue'}</SelectItem>
                        <SelectItem value="Operating Expense">{language === 'pt-BR' ? 'Despesa Operacional' : language === 'es' ? 'Gasto Operativo' : 'Operating Expense'}</SelectItem>
                        <SelectItem value="Fixed Cost">{language === 'pt-BR' ? 'Custo Fixo' : language === 'es' ? 'Costo Fijo' : 'Fixed Cost'}</SelectItem>
                        <SelectItem value="Tax">{language === 'pt-BR' ? 'Imposto' : language === 'es' ? 'Impuesto' : 'Tax'}</SelectItem>
                        <SelectItem value="Other">{language === 'pt-BR' ? 'Outro' : language === 'es' ? 'Otro' : 'Other'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>{t.common.description}</Label>
                  <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={t.financial.transactionDesc} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{t.common.value} ({currSym})</Label>
                    <Input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="0.00" />
                  </div>
                  <div>
                    <Label>{t.common.status}</Label>
                    <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as TransactionStatus }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">{t.financial.pending}</SelectItem>
                        <SelectItem value="paid">{t.financial.paid}</SelectItem>
                        <SelectItem value="overdue">{t.financial.overdue}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{t.common.date}</Label>
                    <Input type="date" lang={language === 'pt-BR' ? 'pt-BR' : language === 'es' ? 'es' : 'en'} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                  </div>
                  <div>
                    <Label>{t.financial.dueDate}</Label>
                    <Input type="date" lang={language === 'pt-BR' ? 'pt-BR' : language === 'es' ? 'es' : 'en'} value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <DialogClose asChild><Button variant="outline">{t.common.cancel}</Button></DialogClose>
                  <Button onClick={handleAdd} loading={savingTx} disabled={!form.description || !form.value}>{t.financial.createTransaction}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {summaryCards.map(s => (
          <KPICard
            key={s.label}
            label={s.label}
            value={formatCurrency(s.value, language)}
            tooltip={s.tooltip}
            icon={s.icon}
            gradient={s.gradient}
            sparkline
            sub={s.extra}
          />
        ))}
      </div>

      <Card className="mb-4">
        <CardContent className="py-3 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder={t.financial.searchTransaction} value={filters.search} onChange={e => setFilters({ search: e.target.value })} />
          </div>
          <Select value={filters.type} onValueChange={v => setFilters({ type: v as any })}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.financial.allTypes}</SelectItem>
              <SelectItem value="income">{t.financial.incomes}</SelectItem>
              <SelectItem value="expense">{t.financial.expenses}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.status} onValueChange={v => setFilters({ status: v as any })}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.financial.allStatuses}</SelectItem>
              <SelectItem value="paid">{t.financial.paid}</SelectItem>
              <SelectItem value="pending">{t.financial.pending}</SelectItem>
              <SelectItem value="overdue">{t.financial.overdue}</SelectItem>
              <SelectItem value="cancelled">{t.financial.cancelled}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.period} onValueChange={v => setFilters({ period: v as any })}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.financial.allPeriod}</SelectItem>
              <SelectItem value="this_month">{t.financial.thisMonth}</SelectItem>
              <SelectItem value="last_month">{t.financial.lastMonth}</SelectItem>
              <SelectItem value="this_quarter">{t.financial.thisQuarter}</SelectItem>
              <SelectItem value="this_year">{t.financial.thisYear}</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.common.type}</TableHead>
                <TableHead>{t.common.description}</TableHead>
                <TableHead>{t.common.category}</TableHead>
                <TableHead>{t.common.date}</TableHead>
                <TableHead>{t.financial.dueDate}</TableHead>
                <TableHead className="text-right">{t.common.value}</TableHead>
                <TableHead>{t.common.status}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="p-0">
                    <EmptyState
                      icon={<DollarSign className="w-9 h-9 text-muted-foreground/60" />}
                      title={t.financial.noTransactions}
                      description={t.financial.adjustFilters}
                      actionLabel={t.financial.newTransaction}
                      onAction={() => setDialogOpen(true)}
                    />
                  </TableCell>
                </TableRow>
              ) : paginatedTransactions.map(tx => (
                <TableRow key={tx.id}>
                  <TableCell>
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center ${tx.type === 'income' ? 'bg-success/10' : 'bg-destructive/10'}`}>
                      {tx.type === 'income' ? <ArrowUpRight className="w-3.5 h-3.5 text-success" /> : <ArrowDownRight className="w-3.5 h-3.5 text-destructive" />}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{tx.description}</TableCell>
                  <TableCell className="text-muted-foreground">{tx.category}</TableCell>
                  <TableCell className="text-muted-foreground">{format(new Date(tx.date), dateShort, { locale: dateLocale })}</TableCell>
                  <TableCell className="text-muted-foreground">{tx.dueDate ? format(new Date(tx.dueDate), dateShort, { locale: dateLocale }) : '—'}</TableCell>
                  <TableCell className={`text-right font-semibold ${tx.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                    {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.value, language)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[tx.status]}>{STATUS_LABELS[tx.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTarget(tx.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination {...financialPagination} />
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.common.delete}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.financial.confirmDeleteTransaction}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirmed} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
