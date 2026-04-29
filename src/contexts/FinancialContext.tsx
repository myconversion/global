import { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from 'react';
import type { Transaction, TransactionType, TransactionStatus, RecurrenceFrequency, ID } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { withBuFilter } from '@/lib/bu-filter';

interface FinancialKPIs {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  pendingReceivables: number;
  pendingPayables: number;
  overdueCount: number;
}

interface FinancialFilters {
  search: string;
  type: TransactionType | 'all';
  status: TransactionStatus | 'all';
  period: 'all' | 'this_month' | 'last_month' | 'this_quarter' | 'this_year';
}

interface FinancialContextValue {
  transactions: Transaction[];
  filters: FinancialFilters;
  setFilters: (f: Partial<FinancialFilters>) => void;
  filteredTransactions: Transaction[];
  kpis: FinancialKPIs;
  loading: boolean;
  addTransaction: (t: Omit<Transaction, 'id' | 'companyId' | 'createdAt'>) => Promise<void>;
  updateTransaction: (id: ID, data: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: ID) => Promise<void>;
  refreshTransactions: () => Promise<void>;
}

const FinancialContext = createContext<FinancialContextValue | null>(null);

function mapTransaction(row: any): Transaction {
  return {
    id: row.id,
    companyId: row.company_id,
    type: row.type as TransactionType,
    category: row.category,
    description: row.description,
    value: Number(row.value),
    date: row.date,
    dueDate: row.due_date ?? undefined,
    status: row.status as TransactionStatus,
    clientId: row.client_id ?? undefined,
    projectId: row.project_id ?? undefined,
    recurrence: row.recurrence as RecurrenceFrequency,
    createdAt: row.created_at,
  };
}

function isInPeriod(dateStr: string, period: FinancialFilters['period']): boolean {
  if (period === 'all') return true;
  const d = new Date(dateStr);
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (period) {
    case 'this_month': return d.getFullYear() === y && d.getMonth() === m;
    case 'last_month': {
      const lm = new Date(y, m - 1, 1);
      return d.getFullYear() === lm.getFullYear() && d.getMonth() === lm.getMonth();
    }
    case 'this_quarter': {
      const qStart = Math.floor(m / 3) * 3;
      return d.getFullYear() === y && d.getMonth() >= qStart && d.getMonth() <= qStart + 2;
    }
    case 'this_year': return d.getFullYear() === y;
    default: return true;
  }
}

export function FinancialProvider({ children }: { children: ReactNode }) {
  const { currentCompany, supabaseUser, currentBusinessUnit } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFiltersState] = useState<FinancialFilters>({
    search: '', type: 'all', status: 'all', period: 'this_month',
  });

  const companyId = currentCompany?.id;
  const buId = currentBusinessUnit?.id;

  const fetchTransactions = useCallback(async () => {
    if (!companyId) { setTransactions([]); setLoading(false); return; }
    setLoading(true);
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('company_id', companyId)
      .order('date', { ascending: false });
    query = withBuFilter(query, buId);
    const { data, error } = await query;
    if (!error && data) setTransactions(data.map(mapTransaction));
    setLoading(false);
  }, [companyId, buId]);

  const refreshTransactions = useCallback(async () => {
    await fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const setFilters = useCallback((partial: Partial<FinancialFilters>) => {
    setFiltersState(prev => ({ ...prev, ...partial }));
  }, []);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (filters.type !== 'all' && t.type !== filters.type) return false;
      if (filters.status !== 'all' && t.status !== filters.status) return false;
      if (!isInPeriod(t.date, filters.period)) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        return t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
      }
      return true;
    });
  }, [transactions, filters]);

  const kpis = useMemo<FinancialKPIs>(() => {
    const monthTx = transactions.filter(t => isInPeriod(t.date, 'this_month'));
    const totalIncome = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.value, 0);
    const totalExpense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.value, 0);
    const pendingReceivables = transactions.filter(t => t.type === 'income' && t.status === 'pending').reduce((s, t) => s + t.value, 0);
    const pendingPayables = transactions.filter(t => t.type === 'expense' && t.status === 'pending').reduce((s, t) => s + t.value, 0);
    const overdueCount = transactions.filter(t => t.status === 'overdue').length;
    return { totalIncome, totalExpense, netProfit: totalIncome - totalExpense, pendingReceivables, pendingPayables, overdueCount };
  }, [transactions]);

  const addTransaction = useCallback(async (data: Omit<Transaction, 'id' | 'companyId' | 'createdAt'>) => {
    if (!companyId || !supabaseUser) return;
    const { data: row, error } = await supabase
      .from('transactions')
      .insert({
        company_id: companyId,
        business_unit_id: buId ?? null,
        type: data.type,
        category: data.category,
        description: data.description,
        value: data.value,
        date: data.date,
        due_date: data.dueDate ?? null,
        status: data.status,
        client_id: data.clientId ?? null,
        project_id: data.projectId ?? null,
        recurrence: data.recurrence,
        created_by: supabaseUser.id,
      } as any)
      .select()
      .single();
    if (error) { console.error('Error creating transaction:', error); return; }
    setTransactions(prev => [mapTransaction(row), ...prev]);
  }, [companyId, supabaseUser, buId]);

  const updateTransaction = useCallback(async (id: ID, data: Partial<Transaction>) => {
    const updates: any = {};
    if (data.type !== undefined) updates.type = data.type;
    if (data.category !== undefined) updates.category = data.category;
    if (data.description !== undefined) updates.description = data.description;
    if (data.value !== undefined) updates.value = data.value;
    if (data.date !== undefined) updates.date = data.date;
    if (data.dueDate !== undefined) updates.due_date = data.dueDate;
    if (data.status !== undefined) updates.status = data.status;
    if (data.recurrence !== undefined) updates.recurrence = data.recurrence;

    const { error } = await supabase.from('transactions').update(updates).eq('id', id);
    if (error) { console.error('Error updating transaction:', error); return; }
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
  }, []);

  const deleteTransaction = useCallback(async (id: ID) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) { console.error('Error deleting transaction:', error); return; }
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <FinancialContext.Provider value={{ transactions, filters, setFilters, filteredTransactions, kpis, loading, addTransaction, updateTransaction, deleteTransaction, refreshTransactions }}>
      {children}
    </FinancialContext.Provider>
  );
}

export function useFinancial() {
  const ctx = useContext(FinancialContext);
  if (!ctx) throw new Error('useFinancial must be used within FinancialProvider');
  return ctx;
}
