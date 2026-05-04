import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, Save, Link2, ExternalLink } from 'lucide-react';
import { useProjectsContext } from '@/contexts/ProjectsContext';
import { useI18n } from '@/contexts/I18nContext';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/format-utils';
import { supabase } from '@/integrations/supabase/client';
import { Project } from '@/types/index';

interface SourceDeal {
  id: string;
  title: string;
  value: number;
  stage_name: string;
}

// ── Editable numeric field ───────────────────────────────────────────────────

interface CostFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
}

const CostField = React.memo(function CostField({ label, value, onChange, error }: CostFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number" min="0" step="0.01"
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-invalid={!!error}
        className={error ? 'border-destructive focus-visible:ring-destructive' : ''}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
});

// ── Card ─────────────────────────────────────────────────────────────────────

interface ProjectCostsCardProps {
  project: Project;
}

export const ProjectCostsCard = React.memo(function ProjectCostsCard({
  project,
}: ProjectCostsCardProps) {
  const navigate = useNavigate();
  const { updateProject } = useProjectsContext();
  const { t, language } = useI18n();
  const { toast } = useToast();

  const [labor, setLabor] = useState(String(project.laborCost ?? 0));
  const [supplies, setSupplies] = useState(String(project.suppliesCost ?? 0));
  const [revenue, setRevenue] = useState(String(project.revenue ?? 0));
  const [saving, setSaving] = useState(false);
  const [sourceDeal, setSourceDeal] = useState<SourceDeal | null>(null);

  // Sync fields when project costs change externally
  useEffect(() => {
    setLabor(String(project.laborCost ?? 0));
    setSupplies(String(project.suppliesCost ?? 0));
    setRevenue(String(project.revenue ?? 0));
  }, [project.id, project.laborCost, project.suppliesCost, project.revenue]);

  // Fetch linked CRM deal
  useEffect(() => {
    let cancelled = false;
    if (!project.sourceDealId) { setSourceDeal(null); return; }
    (async () => {
      const { data } = await supabase
        .from('crm_pipeline_deals')
        .select('id, title, value, stage_name')
        .eq('id', project.sourceDealId!)
        .maybeSingle();
      if (!cancelled) setSourceDeal(data ?? null);
    })();
    return () => { cancelled = true; };
  }, [project.sourceDealId]);

  const validate = useCallback((v: string): string | null => {
    if (!v) return null;
    const n = Number(v);
    if (Number.isNaN(n)) return t.projectDetail.invalidNumber;
    if (n < 0) return t.projectDetail.negativeNotAllowed;
    return null;
  }, [t]);

  const laborError = validate(labor);
  const suppliesError = validate(supplies);
  const revenueError = validate(revenue);
  const hasError = !!(laborError || suppliesError || revenueError);

  const totalCost = (Number(labor) || 0) + (Number(supplies) || 0);
  const rev = Number(revenue) || 0;
  const rawMargin = rev > 0
    ? ((rev - totalCost) / rev) * 100
    : totalCost > 0 ? -100 : 0;
  const margin = Math.round(rawMargin * 10) / 10;
  const marginCls = margin < 0 ? 'text-destructive' : margin >= 30 ? 'text-emerald-600' : '';

  const handleSave = useCallback(async () => {
    if (hasError) {
      toast({ title: t.projectDetail.invalidCosts, variant: 'destructive' });
      return;
    }
    setSaving(true);
    await updateProject(project.id, {
      laborCost: Number(labor) || 0,
      suppliesCost: Number(supplies) || 0,
      revenue: Number(revenue) || 0,
    });
    setSaving(false);
    toast({ title: t.projectDetail.costsSaved });
  }, [hasError, labor, supplies, revenue, project.id, updateProject, toast, t]);

  const goToDeal = useCallback(() => {
    navigate(`/crm/pipeline?dealId=${project.sourceDealId}`);
  }, [navigate, project.sourceDealId]);

  return (
    <Card className="mb-5">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            {t.projectDetail.costsTitle}
          </h2>
          <Button
            size="sm"
            className="gap-1.5"
            disabled={saving || hasError}
            onClick={handleSave}
          >
            <Save className="w-3.5 h-3.5" />
            {t.projectDetail.saveCosts}
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <CostField
            label={t.projectDetail.laborCost}
            value={labor}
            onChange={setLabor}
            error={laborError}
          />
          <CostField
            label={t.projectDetail.suppliesCost}
            value={supplies}
            onChange={setSupplies}
            error={suppliesError}
          />
          <CostField
            label={t.projectDetail.revenue}
            value={revenue}
            onChange={setRevenue}
            error={revenueError}
          />

          {/* Total Cost (read-only) */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t.projectDetail.totalCost}</Label>
            <div className="h-10 rounded-md border bg-muted/30 px-3 flex items-center text-sm font-semibold">
              {formatCurrency(totalCost, language)}
            </div>
          </div>

          {/* Margin (read-only) */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t.projectDetail.margin}</Label>
            <div className={`h-10 rounded-md border bg-muted/30 px-3 flex items-center text-sm font-semibold ${marginCls}`}>
              {`${margin}%`}
            </div>
          </div>
        </div>

        {/* Source deal link */}
        {project.sourceDealId && (
          <div className="mt-3 flex items-center gap-2 text-xs">
            <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">{t.projectDetail.sourceDeal}:</span>
            <button
              type="button"
              onClick={goToDeal}
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
  );
});
