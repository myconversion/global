import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format-utils';
import { useI18n } from '@/contexts/I18nContext';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = [
  'hsl(var(--primary))', 'hsl(217, 91%, 60%)', 'hsl(187, 92%, 55%)',
  'hsl(45, 93%, 58%)', 'hsl(24, 95%, 53%)', 'hsl(142, 71%, 45%)',
  'hsl(0, 84%, 60%)', 'hsl(262, 83%, 58%)',
];

interface Stage { name: string; probability: number; order: number; max_days?: number; }
interface Deal { id: string; stage_name: string; title: string; value: number; loss_reason: string | null; entered_stage_at: string; created_at: string; }
interface Props { stages: Stage[]; deals: Deal[]; allDeals?: Deal[]; }

export function CRMPipelineAnalysis({ stages, deals, allDeals }: Props) {
  const { t, language } = useI18n();
  const dealsForKpis = allDeals ?? deals;

  const conversionData = useMemo(() => {
    if (stages.length === 0) return [];
    return stages.map((stage, i) => ({
      name: stage.name,
      count: deals.filter(d => d.stage_name === stage.name).length,
      value: deals.filter(d => d.stage_name === stage.name).reduce((s, d) => s + d.value, 0),
      fill: COLORS[i % COLORS.length],
    }));
  }, [stages, deals]);

  const conversionRateData = useMemo(() => {
    if (stages.length < 2) return [];
    const stageIndex = new Map(stages.map((s, i) => [s.name, i]));
    const results: { name: string; rate: number; fill: string }[] = [];
    for (let i = 1; i < stages.length; i++) {
      const prevCount = deals.filter(d => { const idx = stageIndex.get(d.stage_name) ?? -1; return idx >= i - 1; }).length;
      const currCount = deals.filter(d => { const idx = stageIndex.get(d.stage_name) ?? -1; return idx >= i; }).length;
      results.push({ name: `${stages[i - 1].name} → ${stages[i].name}`, rate: prevCount > 0 ? Math.round((currCount / prevCount) * 100) : 0, fill: COLORS[i % COLORS.length] });
    }
    return results;
  }, [stages, deals]);

  const avgTimeData = useMemo(() => {
    return stages.map((stage, i) => {
      const stageDeals = deals.filter(d => d.stage_name === stage.name);
      const totalDays = stageDeals.reduce((sum, d) => sum + Math.floor((Date.now() - new Date(d.entered_stage_at).getTime()) / (1000 * 60 * 60 * 24)), 0);
      return { name: stage.name, days: stageDeals.length > 0 ? Math.round(totalDays / stageDeals.length) : 0, maxDays: stage.max_days ?? null, fill: COLORS[i % COLORS.length] };
    });
  }, [stages, deals]);

  const lossData = useMemo(() => {
    const map = new Map<string, number>();
    deals.forEach(d => { if (d.loss_reason) map.set(d.loss_reason, (map.get(d.loss_reason) || 0) + 1); });
    return Array.from(map.entries()).map(([reason, count], i) => ({ name: reason, count, fill: COLORS[i % COLORS.length] })).sort((a, b) => b.count - a.count);
  }, [deals]);

  const stats = useMemo(() => {
    const total = dealsForKpis.length;
    const wonStage = stages.find(s => s.probability === 100);
    const lostStage = stages.find(s => s.probability === 0);
    const wonDeals = wonStage ? dealsForKpis.filter(d => d.stage_name === wonStage.name) : [];
    const lostDeals = lostStage ? dealsForKpis.filter(d => d.stage_name === lostStage.name) : [];
    const won = wonDeals.length;
    const lost = lostDeals.length;
    const wonValue = wonDeals.reduce((s, d) => s + d.value, 0);
    const lostValue = lostDeals.reduce((s, d) => s + d.value, 0);
    const totalValue = dealsForKpis.reduce((s, d) => s + d.value, 0);
    const closed = won + lost;
    return {
      total,
      won,
      lost,
      wonValue,
      lostValue,
      totalValue,
      closeRate: closed > 0 ? Math.round((won / closed) * 100) : null,
    };
  }, [dealsForKpis, stages]);

  if (deals.length === 0) return (
    <Card><CardContent className="flex items-center justify-center py-16 text-muted-foreground text-sm">{t.crm.addDealsToSeeAnalysis}</CardContent></Card>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <StatCard label={t.crm.totalDeals} value={String(stats.total)} />
        <StatCard label={t.crm.wonLabel} value={String(stats.won)} accent />
        <StatCard label={t.crm.lostLabel} value={String(stats.lost)} />
        <StatCard label={t.crmPipeline.totalWonValue} value={formatCurrency(stats.wonValue, language)} accent />
        <StatCard label={t.crmPipeline.totalLostValue} value={formatCurrency(stats.lostValue, language)} />
        <StatCard label={t.crmPipeline.closeRate} value={stats.closeRate === null ? '—' : `${stats.closeRate}%`} accent />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t.crm.volumeValueByStage}</CardTitle></CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conversionData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" fontSize={12} />
                <YAxis type="category" dataKey="name" width={90} fontSize={11} />
                <Tooltip formatter={(val: number, name: string) => [name === 'value' ? formatCurrency(val, language) : val, name === 'value' ? t.crm.value : 'Qty']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="count" name="Qty" radius={[0, 4, 4, 0]}>
                  {conversionData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t.crm.conversionRateBetweenStages}</CardTitle></CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conversionRateData} margin={{ left: 10, right: 20 }}>
                <XAxis dataKey="name" fontSize={10} angle={-15} textAnchor="end" height={60} />
                <YAxis fontSize={12} tickFormatter={v => `${v}%`} domain={[0, 100]} />
                <Tooltip formatter={(val: number) => [`${val}%`, t.crm.conversionRate]} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                  {conversionRateData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t.crm.avgTimePerStage}</CardTitle></CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={avgTimeData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" fontSize={12} />
                <YAxis type="category" dataKey="name" width={90} fontSize={11} />
                <Tooltip formatter={(val: number, name: string) => { if (name === 'maxDays') return [val ? `${val}d` : '—', 'Max']; return [`${val} ${t.crm.days}`, t.crm.avgTimePerStage]; }} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="days" name={t.crm.avgTimePerStage} radius={[0, 4, 4, 0]}>
                  {avgTimeData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t.crm.lossReasons}</CardTitle></CardHeader>
          <CardContent className="h-[280px]">
            {lossData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">{t.crm.noLossReasons}</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={lossData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={45} paddingAngle={3} label={({ name, count }) => `${name}: ${count}`} fontSize={11}>
                    {lossData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                  <Legend fontSize={12} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card><CardContent className="p-4">
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <p className={`text-lg font-bold ${accent ? 'text-primary' : 'text-foreground'}`}>{value}</p>
    </CardContent></Card>
  );
}
