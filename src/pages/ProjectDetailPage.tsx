import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FolderKanban, Plus, ArrowLeft, Pencil, Trash2, LayoutGrid, DollarSign, Save, Link2, ExternalLink, Receipt, ArrowUpRight, ArrowDownRight, Search, ChevronLeft, ChevronRight, X, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { exportToCSV, exportToPDF } from '@/lib/export-utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useI18n } from '@/contexts/I18nContext';
import { useProjectsContext } from '@/contexts/ProjectsContext';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/format-utils';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { getDateLocale } from '@/i18n/date-locale';

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { t, language } = useI18n();
  const { toast } = useToast();
  const { getProjectById, getProjectDeliverables, addDeliverable, updateDeliverable, deleteDeliverable, getDeliverableTasks, updateProject } = useProjectsContext();

  const project = getProjectById(projectId!);
  const deliverables = getProjectDeliverables(projectId!);

  // Costs state (kept in sync with project)
  const [labor, setLabor] = useState<string>('');
  const [supplies, setSupplies] = useState<string>('');
  const [revenue, setRevenue] = useState<string>('');
  const [savingCosts, setSavingCosts] = useState(false);

  // Source deal lookup (CRM pipeline)
  const [sourceDeal, setSourceDeal] = useState<{ id: string; title: string; value: number; stage_name: string } | null>(null);

  // Project transactions (financial history)
  type ProjectTx = {
    id: string;
    date: string;
    description: string;
    category: string;
    type: 'income' | 'expense';
    status: string;
    value: number;
  };
  const [transactions, setTransactions] = useState<ProjectTx[]>([]);
  const [loadingTx, setLoadingTx] = useState(true);
  const [txFilter, setTxFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [txSearch, setTxSearch] = useState('');
  const [txPage, setTxPage] = useState(1);
  const TX_PAGE_SIZE = 10;

  useEffect(() => {
    let cancelled = false;
    if (!projectId) return;
    setLoadingTx(true);
    (async () => {
      const { data } = await supabase
        .from('transactions')
        .select('id, date, description, category, type, status, value')
        .eq('project_id', projectId)
        .order('date', { ascending: false });
      if (!cancelled) {
        setTransactions((data as ProjectTx[]) ?? []);
        setLoadingTx(false);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId, project?.revenue, project?.laborCost, project?.suppliesCost]);

  useEffect(() => {
    if (project) {
      setLabor(String(project.laborCost ?? 0));
      setSupplies(String(project.suppliesCost ?? 0));
      setRevenue(String(project.revenue ?? 0));
    }
  }, [project?.id, project?.laborCost, project?.suppliesCost, project?.revenue]);

  useEffect(() => {
    let cancelled = false;
    if (!project?.sourceDealId) {
      setSourceDeal(null);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('crm_pipeline_deals')
        .select('id, title, value, stage_name')
        .eq('id', project.sourceDealId!)
        .maybeSingle();
      if (!cancelled) setSourceDeal(data ?? null);
    })();
    return () => { cancelled = true; };
  }, [project?.sourceDealId]);

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  if (!project) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">{t.projectDetail.projectNotFound}</p>
        <Button variant="link" onClick={() => navigate('/projects')}>{t.common.back}</Button>
      </div>
    );
  }

  const handleAdd = () => {
    if (!newName.trim()) return;
    addDeliverable(projectId!, newName.trim());
    setNewName('');
    setAddOpen(false);
  };

  const handleEdit = () => {
    if (!editId || !editName.trim()) return;
    updateDeliverable(editId, editName.trim());
    setEditId(null);
    setEditName('');
  };

  return (
    <div>
      <Button variant="ghost" className="mb-4 gap-2 text-muted-foreground" onClick={() => navigate('/projects')}>
        <ArrowLeft className="w-4 h-4" /> {t.projectDetail.backToProjects}
      </Button>

      <PageHeader
        title={project.name}
        description={`${t.projectDetail.clientLabel}: ${project.clientId}`}
        icon={<FolderKanban className="w-5 h-5 text-primary" />}
        actions={<Button className="gap-2" onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" /> {t.projectDetail.addDeliverable}</Button>}
      />

      {/* Costs & Revenue */}
      <Card className="mb-5">
        <CardContent className="p-5">
          {(() => {
            const validateField = (v: string): string | null => {
              if (v === '' || v === undefined) return null;
              const n = Number(v);
              if (Number.isNaN(n)) return t.projectDetail.invalidNumber;
              if (n < 0) return t.projectDetail.negativeNotAllowed;
              return null;
            };
            const laborError = validateField(labor);
            const suppliesError = validateField(supplies);
            const revenueError = validateField(revenue);
            const hasError = !!(laborError || suppliesError || revenueError);
            const totalCost = (Number(labor) || 0) + (Number(supplies) || 0);

            return (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    {t.projectDetail.costsTitle}
                  </h2>
                  <Button
                    size="sm"
                    className="gap-1.5"
                    disabled={savingCosts || hasError}
                    onClick={async () => {
                      if (hasError) {
                        toast({ title: t.projectDetail.invalidCosts, variant: 'destructive' });
                        return;
                      }
                      setSavingCosts(true);
                      await updateProject(project.id, {
                        laborCost: Number(labor) || 0,
                        suppliesCost: Number(supplies) || 0,
                        revenue: Number(revenue) || 0,
                      });
                      setSavingCosts(false);
                      toast({ title: t.projectDetail.costsSaved });
                    }}
                  >
                    <Save className="w-3.5 h-3.5" />
                    {t.projectDetail.saveCosts}
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t.projectDetail.laborCost}</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={labor}
                      onChange={e => setLabor(e.target.value)}
                      aria-invalid={!!laborError}
                      className={laborError ? 'border-destructive focus-visible:ring-destructive' : ''}
                    />
                    {laborError && <p className="text-xs text-destructive">{laborError}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t.projectDetail.suppliesCost}</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={supplies}
                      onChange={e => setSupplies(e.target.value)}
                      aria-invalid={!!suppliesError}
                      className={suppliesError ? 'border-destructive focus-visible:ring-destructive' : ''}
                    />
                    {suppliesError && <p className="text-xs text-destructive">{suppliesError}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t.projectDetail.revenue}</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={revenue}
                      onChange={e => setRevenue(e.target.value)}
                      aria-invalid={!!revenueError}
                      className={revenueError ? 'border-destructive focus-visible:ring-destructive' : ''}
                    />
                    {revenueError && <p className="text-xs text-destructive">{revenueError}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t.projectDetail.totalCost}</Label>
                    <div className="h-10 rounded-md border bg-muted/30 px-3 flex items-center text-sm font-semibold">
                      {formatCurrency(totalCost, language)}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t.projectDetail.margin}</Label>
                    {(() => {
                      const rev = Number(revenue) || 0;
                      // When revenue is 0: 0 cost => 0% margin; any cost => -100% (full loss)
                      const rawMargin = rev > 0
                        ? ((rev - totalCost) / rev) * 100
                        : (totalCost > 0 ? -100 : 0);
                      const m = Math.round(rawMargin * 10) / 10; // 1 decimal precision
                      const cls = m < 0 ? 'text-destructive' : m >= 30 ? 'text-emerald-600' : '';
                      return (
                        <div className={`h-10 rounded-md border bg-muted/30 px-3 flex items-center text-sm font-semibold ${cls}`}>
                          {`${m}%`}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </>
            );
          })()}
          {project.sourceDealId && (
            <div className="mt-3 flex items-center gap-2 text-xs">
              <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">{t.projectDetail.sourceDeal}:</span>
              <button
                type="button"
                onClick={() => navigate(`/crm/pipeline?dealId=${project.sourceDealId}`)}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 font-medium hover:bg-primary/20 transition-colors"
                title={sourceDeal?.title ?? project.sourceDealId}
              >
                <span className="max-w-[240px] truncate">
                  {sourceDeal?.title ?? `${project.sourceDealId.slice(0, 8)}…`}
                </span>
                {sourceDeal && (
                  <span className="text-[10px] opacity-70">
                    · {formatCurrency(sourceDeal.value, language)}
                  </span>
                )}
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Financial History */}
      <Card className="mb-5">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Receipt className="w-4 h-4 text-primary" />
                {t.projectDetail.transactionsTitle}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">{t.projectDetail.transactionsDesc}</p>
            </div>
            {transactions.length > 0 && (() => {
              const income = transactions.filter(tx => tx.type === 'income').reduce((s, tx) => s + Number(tx.value || 0), 0);
              const expense = transactions.filter(tx => tx.type === 'expense').reduce((s, tx) => s + Number(tx.value || 0), 0);
              const net = income - expense;

              const buildExportData = () => {
                const byType = txFilter === 'all' ? transactions : transactions.filter(tx => tx.type === txFilter);
                const q = txSearch.trim().toLowerCase();
                return q
                  ? byType.filter(tx => {
                      const dateStr = format(new Date(tx.date), 'P', { locale: getDateLocale(language) }).toLowerCase();
                      return (
                        tx.description?.toLowerCase().includes(q) ||
                        tx.category?.toLowerCase().includes(q) ||
                        tx.status?.toLowerCase().includes(q) ||
                        dateStr.includes(q)
                      );
                    })
                  : byType;
              };

              const columns = [
                { header: t.projectDetail.txDate, accessor: (r: any) => format(new Date(r.date), 'P', { locale: getDateLocale(language) }) },
                { header: t.projectDetail.txDescription, accessor: (r: any) => r.description ?? '' },
                { header: t.projectDetail.txCategory, accessor: (r: any) => r.category ?? '' },
                { header: t.projectDetail.txStatus, accessor: (r: any) => r.status ?? '' },
                { header: t.projectDetail.txType ?? 'Type', accessor: (r: any) => r.type === 'income' ? t.projectDetail.txFilterIncome : t.projectDetail.txFilterExpense },
                { header: t.projectDetail.txValue, accessor: (r: any) => `${r.type === 'income' ? '+' : '-'}${formatCurrency(Number(r.value || 0), language)}` },
              ];

              const safeName = (project?.name || 'project').replace(/[^a-z0-9]+/gi, '_').toLowerCase();
              const filename = `${safeName}_financial_history_${new Date().toISOString().slice(0, 10)}`;

              const handleCSV = () => {
                const data = buildExportData();
                if (data.length === 0) {
                  toast({ title: t.projectDetail.exportEmpty, variant: 'destructive' });
                  return;
                }
                exportToCSV(filename, columns, data);
              };

              const handlePDF = () => {
                const data = buildExportData();
                if (data.length === 0) {
                  toast({ title: t.projectDetail.exportEmpty, variant: 'destructive' });
                  return;
                }
                const filteredIncome = data.filter((d: any) => d.type === 'income').reduce((s: number, d: any) => s + Number(d.value || 0), 0);
                const filteredExpense = data.filter((d: any) => d.type === 'expense').reduce((s: number, d: any) => s + Number(d.value || 0), 0);
                exportToPDF(
                  filename,
                  `${t.projectDetail.transactionsTitle} — ${project?.name ?? ''}`,
                  columns,
                  data,
                  [
                    { label: t.projectDetail.txTotalIncome, value: formatCurrency(filteredIncome, language) },
                    { label: t.projectDetail.txTotalExpense, value: formatCurrency(filteredExpense, language) },
                    { label: t.projectDetail.txNet, value: formatCurrency(filteredIncome - filteredExpense, language) },
                  ]
                );
              };

              return (
                <div className="flex items-center gap-3">
                  <div className="hidden md:flex items-center gap-4 text-xs">
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t.projectDetail.txTotalIncome}</p>
                      <p className="font-semibold text-emerald-600">{formatCurrency(income, language)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t.projectDetail.txTotalExpense}</p>
                      <p className="font-semibold text-destructive">{formatCurrency(expense, language)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t.projectDetail.txNet}</p>
                      <p className={`font-semibold ${net < 0 ? 'text-destructive' : 'text-foreground'}`}>{formatCurrency(net, language)}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 gap-1.5">
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline text-xs">{t.projectDetail.exportButton}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleCSV} className="text-xs gap-2">
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        {t.projectDetail.exportCSV}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handlePDF} className="text-xs gap-2">
                        <FileText className="w-3.5 h-3.5" />
                        {t.projectDetail.exportPDF}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })()}
          </div>

          {transactions.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
              <div className="inline-flex items-center gap-1 rounded-md bg-muted p-1 text-xs">
                {(['all', 'income', 'expense'] as const).map((key) => {
                  const label = key === 'all' ? t.projectDetail.txFilterAll : key === 'income' ? t.projectDetail.txFilterIncome : t.projectDetail.txFilterExpense;
                  const count = key === 'all' ? transactions.length : transactions.filter(tx => tx.type === key).length;
                  const active = txFilter === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => { setTxFilter(key); setTxPage(1); }}
                      className={`px-3 py-1 rounded transition-colors ${active ? 'bg-background text-foreground shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      {label} <span className="opacity-60">({count})</span>
                    </button>
                  );
                })}
              </div>
              <div className="relative sm:ml-auto sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={txSearch}
                  onChange={(e) => { setTxSearch(e.target.value); setTxPage(1); }}
                  placeholder={t.projectDetail.txSearchPlaceholder}
                  className="h-8 pl-8 pr-8 text-xs"
                />
                {txSearch && (
                  <button
                    type="button"
                    onClick={() => { setTxSearch(''); setTxPage(1); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Clear"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {(() => {
            const byType = txFilter === 'all' ? transactions : transactions.filter(tx => tx.type === txFilter);
            const q = txSearch.trim().toLowerCase();
            const filtered = q
              ? byType.filter(tx => {
                  const dateStr = format(new Date(tx.date), 'P', { locale: getDateLocale(language) }).toLowerCase();
                  return (
                    tx.description?.toLowerCase().includes(q) ||
                    tx.category?.toLowerCase().includes(q) ||
                    tx.status?.toLowerCase().includes(q) ||
                    dateStr.includes(q)
                  );
                })
              : byType;

            if (loadingTx) return (
              <div className="space-y-2">
                <div className="h-9 rounded bg-muted/40 animate-pulse" />
                <div className="h-9 rounded bg-muted/40 animate-pulse" />
                <div className="h-9 rounded bg-muted/40 animate-pulse" />
              </div>
            );
            if (transactions.length === 0) return (
              <div className="py-8 text-center text-sm text-muted-foreground border border-dashed rounded-md">
                <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
                {t.projectDetail.transactionsEmpty}
              </div>
            );
            if (filtered.length === 0) return (
              <div className="py-8 text-center text-sm text-muted-foreground border border-dashed rounded-md">
                <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
                {t.projectDetail.txEmptyFiltered}
              </div>
            );

            const totalPages = Math.max(1, Math.ceil(filtered.length / TX_PAGE_SIZE));
            const currentPage = Math.min(txPage, totalPages);
            const startIdx = (currentPage - 1) * TX_PAGE_SIZE;
            const pageItems = filtered.slice(startIdx, startIdx + TX_PAGE_SIZE);

            return (
              <>
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="text-left py-2 px-2 font-medium">{t.projectDetail.txDate}</th>
                        <th className="text-left py-2 px-2 font-medium">{t.projectDetail.txDescription}</th>
                        <th className="text-left py-2 px-2 font-medium hidden sm:table-cell">{t.projectDetail.txCategory}</th>
                        <th className="text-left py-2 px-2 font-medium hidden md:table-cell">{t.projectDetail.txStatus}</th>
                        <th className="text-right py-2 px-2 font-medium">{t.projectDetail.txValue}</th>
                        <th className="text-right py-2 px-2 font-medium w-[1%] whitespace-nowrap">{t.projectDetail.txActions ?? ''}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.map(tx => {
                        const isIncome = tx.type === 'income';
                        const Icon = isIncome ? ArrowUpRight : ArrowDownRight;
                        const goFinancial = () => navigate(`/financial/transactions/${tx.id}`);
                        const goDeal = (e: React.MouseEvent) => {
                          e.stopPropagation();
                          if (project?.sourceDealId) navigate(`/crm/pipeline?dealId=${project.sourceDealId}`);
                        };
                        return (
                          <tr
                            key={tx.id}
                            className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                            onClick={goFinancial}
                          >
                            <td className="py-2 px-2 text-muted-foreground whitespace-nowrap">
                              {format(new Date(tx.date), 'P', { locale: getDateLocale(language) })}
                            </td>
                            <td className="py-2 px-2 font-medium">{tx.description}</td>
                            <td className="py-2 px-2 text-muted-foreground hidden sm:table-cell">{tx.category}</td>
                            <td className="py-2 px-2 hidden md:table-cell">
                              <Badge variant="secondary" className="text-[10px]">{tx.status}</Badge>
                            </td>
                            <td className={`py-2 px-2 text-right font-semibold whitespace-nowrap ${isIncome ? 'text-emerald-600' : 'text-destructive'}`}>
                              <span className="inline-flex items-center gap-1">
                                <Icon className="w-3 h-3" />
                                {isIncome ? '+' : '-'}{formatCurrency(Number(tx.value || 0), language)}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  title={t.projectDetail.openFinancialEntry}
                                  onClick={goFinancial}
                                >
                                  <Receipt className="w-3.5 h-3.5" />
                                </Button>
                                {project?.sourceDealId && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    title={t.projectDetail.openSourceDeal}
                                    onClick={goDeal}
                                  >
                                    <Link2 className="w-3.5 h-3.5" style={{ color: '#4084F2' }} />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                    <span>
                      {t.projectDetail.txShowing
                        .replace('{from}', String(startIdx + 1))
                        .replace('{to}', String(startIdx + pageItems.length))
                        .replace('{total}', String(filtered.length))}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2"
                        disabled={currentPage <= 1}
                        onClick={() => setTxPage(p => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </Button>
                      <span className="px-2">
                        {t.projectDetail.txPageOf.replace('{current}', String(currentPage)).replace('{total}', String(totalPages))}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2"
                        disabled={currentPage >= totalPages}
                        onClick={() => setTxPage(p => Math.min(totalPages, p + 1))}
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {deliverables.map(del => {
          const taskCount = getDeliverableTasks(del.id).length;
          const doneCount = getDeliverableTasks(del.id).filter(t => t.status === 'done').length;
          return (
            <Card key={del.id} className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate(`/projects/${projectId}/${del.id}`)}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-sm">{del.name}</h3>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setEditId(del.id); setEditName(del.name); }}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); deleteDeliverable(del.id); }}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {doneCount}/{taskCount} {t.projectDetail.tasksCompleted}
                </Badge>
              </CardContent>
            </Card>
          );
        })}
        {deliverables.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <LayoutGrid className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>{t.projectDetail.noDeliverables}</p>
          </div>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.projectDetail.newDeliverable}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>{t.projectDetail.deliverableName}</Label>
            <Input placeholder={t.projectDetail.deliverableNamePlaceholder} value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={handleAdd} disabled={!newName.trim()}>{t.common.add}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editId} onOpenChange={() => setEditId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.projectDetail.editDeliverable}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>{t.common.name}</Label>
            <Input value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleEdit()} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditId(null)}>{t.common.cancel}</Button>
            <Button onClick={handleEdit} disabled={!editName.trim()}>{t.common.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
