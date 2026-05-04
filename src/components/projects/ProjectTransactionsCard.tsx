import React, { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Receipt, Search, X, ChevronLeft, ChevronRight,
  ArrowUpRight, ArrowDownRight, Download, FileText, FileSpreadsheet,
} from 'lucide-react';
import { format } from 'date-fns';
import { useI18n } from '@/contexts/I18nContext';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/format-utils';
import { getDateLocale } from '@/i18n/date-locale';
import { exportToCSV, exportToPDF } from '@/lib/export-utils';
import { useProjectTransactions, TX_PAGE_SIZE } from '@/hooks/useProjectTransactions';
import { Project } from '@/types/index';

interface ProjectTransactionsCardProps {
  projectId: string;
  project: Project;
  /** Pass a string that changes when costs/revenue update to trigger a re-fetch. */
  refetchKey?: string;
}

export const ProjectTransactionsCard = React.memo(function ProjectTransactionsCard({
  projectId,
  project,
  refetchKey,
}: ProjectTransactionsCardProps) {
  const navigate = useNavigate();
  const { t, language } = useI18n();
  const { toast } = useToast();

  const {
    transactions,
    loading,
    txFilter,
    txSearch,
    filtered,
    totalPages,
    currentPage,
    pageItems,
    totals,
    handleFilterChange,
    handleSearchChange,
    handleSearchClear,
    prevPage,
    nextPage,
  } = useProjectTransactions(projectId, language, refetchKey);

  const exportColumns = useMemo(() => [
    { header: t.projectDetail.txDate, accessor: (r: any) => format(new Date(r.date), 'P', { locale: getDateLocale(language) }) },
    { header: t.projectDetail.txDescription, accessor: (r: any) => r.description ?? '' },
    { header: t.projectDetail.txCategory, accessor: (r: any) => r.category ?? '' },
    { header: t.projectDetail.txStatus, accessor: (r: any) => r.status ?? '' },
    { header: t.projectDetail.txType ?? 'Type', accessor: (r: any) => r.type === 'income' ? t.projectDetail.txFilterIncome : t.projectDetail.txFilterExpense },
    { header: t.projectDetail.txValue, accessor: (r: any) => `${r.type === 'income' ? '+' : '-'}${formatCurrency(Number(r.value || 0), language)}` },
  ], [t, language]);

  const safeFilename = useMemo(
    () => `${(project.name || 'project').replace(/[^a-z0-9]+/gi, '_').toLowerCase()}_financial_history_${new Date().toISOString().slice(0, 10)}`,
    [project.name],
  );

  const handleExportCSV = useCallback(() => {
    if (filtered.length === 0) {
      toast({ title: t.projectDetail.exportEmpty, variant: 'destructive' });
      return;
    }
    exportToCSV(safeFilename, exportColumns, filtered);
  }, [filtered, safeFilename, exportColumns, toast, t]);

  const handleExportPDF = useCallback(() => {
    if (filtered.length === 0) {
      toast({ title: t.projectDetail.exportEmpty, variant: 'destructive' });
      return;
    }
    const filteredIncome = filtered.filter((d: any) => d.type === 'income').reduce((s: number, d: any) => s + Number(d.value || 0), 0);
    const filteredExpense = filtered.filter((d: any) => d.type === 'expense').reduce((s: number, d: any) => s + Number(d.value || 0), 0);
    exportToPDF(
      safeFilename,
      `${t.projectDetail.transactionsTitle} — ${project.name}`,
      exportColumns,
      filtered,
      [
        { label: t.projectDetail.txTotalIncome, value: formatCurrency(filteredIncome, language) },
        { label: t.projectDetail.txTotalExpense, value: formatCurrency(filteredExpense, language) },
        { label: t.projectDetail.txNet, value: formatCurrency(filteredIncome - filteredExpense, language) },
      ],
    );
  }, [filtered, safeFilename, exportColumns, project.name, language, toast, t]);

  const startIdx = (currentPage - 1) * TX_PAGE_SIZE;

  return (
    <Card className="mb-5">
      <CardContent className="p-5">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" />
              {t.projectDetail.transactionsTitle}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t.projectDetail.transactionsDesc}</p>
          </div>

          {transactions.length > 0 && (
            <div className="flex items-center gap-3">
              {/* Totals summary */}
              <div className="hidden md:flex items-center gap-4 text-xs">
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t.projectDetail.txTotalIncome}</p>
                  <p className="font-semibold text-emerald-600">{formatCurrency(totals.income, language)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t.projectDetail.txTotalExpense}</p>
                  <p className="font-semibold text-destructive">{formatCurrency(totals.expense, language)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t.projectDetail.txNet}</p>
                  <p className={`font-semibold ${totals.net < 0 ? 'text-destructive' : 'text-foreground'}`}>
                    {formatCurrency(totals.net, language)}
                  </p>
                </div>
              </div>

              {/* Export dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5">
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-xs">{t.projectDetail.exportButton}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportCSV} className="text-xs gap-2">
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    {t.projectDetail.exportCSV}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPDF} className="text-xs gap-2">
                    <FileText className="w-3.5 h-3.5" />
                    {t.projectDetail.exportPDF}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* ── Filter + Search ── */}
        {transactions.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
            <div className="inline-flex items-center gap-1 rounded-md bg-muted p-1 text-xs">
              {(['all', 'income', 'expense'] as const).map(key => {
                const label = key === 'all'
                  ? t.projectDetail.txFilterAll
                  : key === 'income' ? t.projectDetail.txFilterIncome : t.projectDetail.txFilterExpense;
                const count = key === 'all'
                  ? transactions.length
                  : transactions.filter(tx => tx.type === key).length;
                const active = txFilter === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleFilterChange(key)}
                    className={`px-3 py-1 rounded transition-colors ${active
                      ? 'bg-background text-foreground shadow-sm font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                    }`}
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
                onChange={e => handleSearchChange(e.target.value)}
                placeholder={t.projectDetail.txSearchPlaceholder}
                className="h-8 pl-8 pr-8 text-xs"
              />
              {txSearch && (
                <button
                  type="button"
                  onClick={handleSearchClear}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Content ── */}
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-9 rounded bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground border border-dashed rounded-md">
            <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
            {t.projectDetail.transactionsEmpty}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground border border-dashed rounded-md">
            <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
            {t.projectDetail.txEmptyFiltered}
          </div>
        ) : (
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
                      if (project.sourceDealId) navigate(`/crm/pipeline?dealId=${project.sourceDealId}`);
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
                          <div className="inline-flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <Button
                              variant="ghost" size="sm" className="h-7 w-7 p-0"
                              title={t.projectDetail.openFinancialEntry}
                              onClick={goFinancial}
                            >
                              <Receipt className="w-3.5 h-3.5" />
                            </Button>
                            {project.sourceDealId && (
                              <Button
                                variant="ghost" size="sm" className="h-7 w-7 p-0"
                                title={t.projectDetail.openSourceDeal}
                                onClick={goDeal}
                              >
                                <Receipt className="w-3.5 h-3.5" style={{ color: '#4084F2' }} />
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

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                <span>
                  {t.projectDetail.txShowing
                    .replace('{from}', String(startIdx + 1))
                    .replace('{to}', String(startIdx + pageItems.length))
                    .replace('{total}', String(filtered.length))}
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-7 px-2" disabled={currentPage <= 1} onClick={prevPage}>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <span className="px-2">
                    {t.projectDetail.txPageOf
                      .replace('{current}', String(currentPage))
                      .replace('{total}', String(totalPages))}
                  </span>
                  <Button variant="outline" size="sm" className="h-7 px-2" disabled={currentPage >= totalPages} onClick={nextPage}>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
});
