import { useState, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { getDateLocale } from '@/i18n/date-locale';

export type ProjectTx = {
  id: string;
  date: string;
  description: string;
  category: string;
  type: 'income' | 'expense';
  status: string;
  value: number;
};

export const TX_PAGE_SIZE = 10;

/**
 * Fetches and manages transactions for a project.
 * @param projectId  The project UUID.
 * @param language   Active locale — used for date formatting in search.
 * @param refetchKey Optional string that, when it changes, triggers a re-fetch
 *                   (e.g. `${laborCost}-${suppliesCost}-${revenue}`).
 */
export function useProjectTransactions(
  projectId: string,
  language: string,
  refetchKey?: string,
) {
  const [transactions, setTransactions] = useState<ProjectTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [txFilter, setTxFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [txSearch, setTxSearch] = useState('');
  const [txPage, setTxPage] = useState(1);

  // ── Fetch ──
  useEffect(() => {
    let cancelled = false;
    if (!projectId) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from('transactions')
        .select('id, date, description, category, type, status, value')
        .eq('project_id', projectId)
        .order('date', { ascending: false });
      if (!cancelled) {
        setTransactions((data as ProjectTx[]) ?? []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, refetchKey]);

  // ── Derived state ──
  const filtered = useMemo(() => {
    const byType =
      txFilter === 'all' ? transactions : transactions.filter(tx => tx.type === txFilter);
    const q = txSearch.trim().toLowerCase();
    if (!q) return byType;
    return byType.filter(tx => {
      const dateStr = format(new Date(tx.date), 'P', {
        locale: getDateLocale(language),
      }).toLowerCase();
      return (
        tx.description?.toLowerCase().includes(q) ||
        tx.category?.toLowerCase().includes(q) ||
        tx.status?.toLowerCase().includes(q) ||
        dateStr.includes(q)
      );
    });
  }, [transactions, txFilter, txSearch, language]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filtered.length / TX_PAGE_SIZE)),
    [filtered.length],
  );

  const currentPage = useMemo(
    () => Math.min(txPage, totalPages),
    [txPage, totalPages],
  );

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * TX_PAGE_SIZE;
    return filtered.slice(start, start + TX_PAGE_SIZE);
  }, [filtered, currentPage]);

  const totals = useMemo(() => {
    const income = transactions
      .filter(tx => tx.type === 'income')
      .reduce((s, tx) => s + Number(tx.value || 0), 0);
    const expense = transactions
      .filter(tx => tx.type === 'expense')
      .reduce((s, tx) => s + Number(tx.value || 0), 0);
    return { income, expense, net: income - expense };
  }, [transactions]);

  // ── Handlers ──
  const handleFilterChange = useCallback((f: 'all' | 'income' | 'expense') => {
    setTxFilter(f);
    setTxPage(1);
  }, []);

  const handleSearchChange = useCallback((s: string) => {
    setTxSearch(s);
    setTxPage(1);
  }, []);

  const handleSearchClear = useCallback(() => {
    setTxSearch('');
    setTxPage(1);
  }, []);

  const prevPage = useCallback(
    () => setTxPage(p => Math.max(1, p - 1)),
    [],
  );

  const nextPage = useCallback(
    () => setTxPage(p => Math.min(totalPages, p + 1)),
    [totalPages],
  );

  return {
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
  };
}
