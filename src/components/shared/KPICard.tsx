import { Card, CardContent } from '@/components/ui/card';
import { InfoTooltip } from '@/components/shared/InfoTooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface KPICardProps {
  label: string;
  value: string;
  tooltip?: string;
  sub?: string;
  icon?: React.ReactNode;
  color?: string;
  loading?: boolean;
  /** Tailwind gradient classes e.g. "from-blue-500 to-blue-600" — enables rich layout */
  gradient?: string;
  /** Trend badge text e.g. "+12%" */
  trend?: string;
  /** Whether trend is positive (green) or negative (red) */
  trendUp?: boolean;
  /** Show decorative sparkline bars */
  sparkline?: boolean;
}

export function KPICard({ label, value, tooltip, sub, icon, color = 'text-foreground', loading, gradient, trend, trendUp, sparkline }: KPICardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <Skeleton className="h-11 w-11 rounded-xl" />
          </div>
          <Skeleton className="h-3 w-24 mb-3" />
          <Skeleton className="h-7 w-20 mb-2" />
          <Skeleton className="h-3 w-16" />
          {sparkline !== false && (
            <div className="mt-3 flex items-end gap-[2px] h-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="flex-1 rounded-sm" style={{ height: `${Math.max(15, Math.random() * 100)}%` }} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Rich layout with gradient icon
  if (gradient) {
    return (
      <Card
        className="group hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 border border-border/60"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className={cn(
              "w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm",
              gradient
            )}>
              {icon && <span className="text-white">{icon}</span>}
            </div>
            {trend && (
              <span className={cn(
                "inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-md",
                trendUp ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
              )}>
                {trend}
              </span>
            )}
          </div>
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            {label}
            {tooltip && <InfoTooltip text={tooltip} />}
          </p>
          <p className="text-2xl font-extrabold text-foreground mt-1 tracking-tight truncate">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          {sparkline && (
            <div className="mt-3 h-6 flex items-end gap-[2px]">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className={cn("flex-1 rounded-sm bg-gradient-to-t opacity-40 group-hover:opacity-60 transition-opacity", gradient)}
                  style={{ height: `${Math.max(15, Math.random() * 100)}%` }}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Simple layout (backward compatible)
  return (
    <Card className="transition-all duration-150 hover:shadow-md hover:-translate-y-0.5">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            {label}
            {tooltip && <InfoTooltip text={tooltip} />}
          </p>
          {icon && <span className="text-muted-foreground">{icon}</span>}
        </div>
        <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}
