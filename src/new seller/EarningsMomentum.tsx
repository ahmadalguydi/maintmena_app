import { TrendingUp, Wallet, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EarningsData } from "@/data/mockDashboardData";

interface EarningsMomentumProps {
  earnings: EarningsData;
}

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 120;
  const h = 36;
  const padding = 2;

  const points = data
    .map((v, i) => {
      const x = padding + (i / (data.length - 1)) * (w - padding * 2);
      const y = h - padding - ((v - min) / range) * (h - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} className="shrink-0" viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon
        points={`${padding},${h - padding} ${points} ${w - padding},${h - padding}`}
        fill="url(#sparkGrad)"
      />
      <polyline
        points={points}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.length > 0 && (
        <circle
          cx={w - padding}
          cy={h - padding - ((data[data.length - 1] - min) / range) * (h - padding * 2)}
          r="3"
          fill="hsl(var(--primary))"
        />
      )}
    </svg>
  );
}

export function EarningsMomentum({ earnings }: EarningsMomentumProps) {
  const weeklyProgress = Math.round(
    (earnings.weeklyEarned / earnings.weeklyTarget) * 100
  );

  return (
    <div className="rounded-3xl bg-card shadow-soft overflow-hidden">
      <div className="p-5">
        {/* Top row */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
              Today's Earnings
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-foreground tracking-tight">
                SAR {earnings.todayTotal.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-success" />
              <span className="text-xs font-semibold text-success">
                +{earnings.percentChange}% vs last week
              </span>
            </div>
          </div>
          <Sparkline data={earnings.weeklyData} />
        </div>

        {/* Weekly progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
            <span>Weekly Target</span>
            <span className="font-medium text-foreground">
              SAR {earnings.weeklyEarned.toLocaleString()} / {earnings.weeklyTarget.toLocaleString()}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${Math.min(weeklyProgress, 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 text-right">{weeklyProgress}%</p>
        </div>

        {/* Bottom row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Pending</p>
              <p className="text-sm font-bold text-foreground">
                SAR {earnings.pending.toLocaleString()}
              </p>
            </div>
            <div className="h-6 w-px bg-border" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Jobs Done</p>
              <p className="text-sm font-bold text-foreground">{earnings.jobsDone}</p>
            </div>
          </div>
          <Button size="sm" variant="default" className="h-9 text-xs gap-1.5 rounded-full px-4">
            <Wallet className="h-3.5 w-3.5" />
            Withdraw
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
