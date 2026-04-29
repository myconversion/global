import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const ALL_WIDGETS = [
  'kpi_cards',
  'cash_flow',
  'pipeline_crm',
  'revenue_expense',
  'task_distribution',
  'upcoming_tasks',
  'project_progress',
  'recent_activity',
] as const;

export type WidgetId = (typeof ALL_WIDGETS)[number];

export const WIDGET_LABELS: Record<WidgetId, string> = {
  kpi_cards: 'KPIs Resumo',
  cash_flow: 'Fluxo de Caixa',
  pipeline_crm: 'Pipeline CRM',
  revenue_expense: 'Receita vs Despesa',
  task_distribution: 'Distribuição de Tarefas',
  upcoming_tasks: 'Próximas Tarefas',
  project_progress: 'Progresso dos Projetos',
  recent_activity: 'Atividade Recente',
};

interface Preferences {
  widgetOrder: WidgetId[];
  hiddenWidgets: WidgetId[];
}

export function useDashboardPreferences() {
  const { supabaseUser, currentCompany } = useAuth();
  const [prefs, setPrefs] = useState<Preferences>({
    widgetOrder: [...ALL_WIDGETS],
    hiddenWidgets: [],
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!supabaseUser || !currentCompany) return;
    supabase
      .from('dashboard_preferences')
      .select('widget_order, hidden_widgets')
      .eq('user_id', supabaseUser.id)
      .eq('company_id', currentCompany.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const order = (data.widget_order as string[]).filter(w => ALL_WIDGETS.includes(w as WidgetId)) as WidgetId[];
          // Add any new widgets not in saved order
          const missing = ALL_WIDGETS.filter(w => !order.includes(w));
          setPrefs({
            widgetOrder: [...order, ...missing],
            hiddenWidgets: (data.hidden_widgets as string[]).filter(w => ALL_WIDGETS.includes(w as WidgetId)) as WidgetId[],
          });
        }
        setLoaded(true);
      });
  }, [supabaseUser, currentCompany]);

  const persist = useCallback(async (next: Preferences) => {
    if (!supabaseUser || !currentCompany) return;
    const payload = {
      user_id: supabaseUser.id,
      company_id: currentCompany.id,
      widget_order: next.widgetOrder,
      hidden_widgets: next.hiddenWidgets,
      updated_at: new Date().toISOString(),
    };
    await supabase
      .from('dashboard_preferences')
      .upsert(payload, { onConflict: 'user_id,company_id' });
  }, [supabaseUser, currentCompany]);

  const reorder = useCallback((fromIndex: number, toIndex: number) => {
    setPrefs(prev => {
      const next = [...prev.widgetOrder];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      const updated = { ...prev, widgetOrder: next };
      persist(updated);
      return updated;
    });
  }, [persist]);

  const toggleWidget = useCallback((widgetId: WidgetId) => {
    setPrefs(prev => {
      const hidden = prev.hiddenWidgets.includes(widgetId)
        ? prev.hiddenWidgets.filter(w => w !== widgetId)
        : [...prev.hiddenWidgets, widgetId];
      const updated = { ...prev, hiddenWidgets: hidden };
      persist(updated);
      return updated;
    });
  }, [persist]);

  const resetDefaults = useCallback(() => {
    const defaults: Preferences = { widgetOrder: [...ALL_WIDGETS], hiddenWidgets: [] };
    setPrefs(defaults);
    persist(defaults);
  }, [persist]);

  return { ...prefs, loaded, reorder, toggleWidget, resetDefaults };
}
