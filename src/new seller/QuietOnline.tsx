import { Cloud, Expand, Zap, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OnlineStatusBar } from "./OnlineStatusBar";
import { GrowthHub } from "./GrowthHub";
import { PrideStrip } from "./PrideStrip";
import { ReputationGrowth } from "./ReputationGrowth";
import { mockDemandHints, type DemandHint } from "@/data/mockDashboardData";
import type { EarningsData, PrideStats, ReputationDataType, GrowthInsightData } from "@/data/mockDashboardData";
import { toast } from "sonner";

interface QuietOnlineProps {
  earnings: EarningsData;
  growthInsights: GrowthInsightData[];
  prideStats: PrideStats;
  reputation: ReputationDataType;
}

function DemandHintRow({ hint }: { hint: DemandHint }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-2.5">
        <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
        <span className="text-sm text-foreground">{hint.area}</span>
        {hint.category && (
          <span className="text-xs text-muted-foreground">· {hint.category}</span>
        )}
      </div>
      <Badge className="text-[10px] h-5 px-2.5 bg-success/10 text-success border-0 font-bold rounded-full">
        {hint.demandChange}
      </Badge>
    </div>
  );
}

export function QuietOnline({ earnings, growthInsights, prideStats, reputation }: QuietOnlineProps) {
  return (
    <div className="animate-fade-in">
      {/* 1. Online Status Bar */}
      <div className="px-5 mb-5">
        <OnlineStatusBar todayEarnings={earnings.todayTotal} />
      </div>

      {/* 2. Calm Status Header */}
      <section className="px-5 mb-6">
        <div className="rounded-3xl bg-card shadow-soft p-6 text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-muted/50 mb-4">
            <Cloud className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-extrabold text-foreground leading-tight mb-1">
            It's calm in your area right now
          </h2>
          <p className="text-sm text-muted-foreground">
            Next wave expected: <span className="font-semibold text-foreground">~18 min</span>
          </p>

          <div className="flex items-center justify-center gap-1.5 mt-3">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            <span className="text-[10px] text-muted-foreground font-medium">
              System scanning · 4 providers nearby
            </span>
          </div>
        </div>
      </section>

      {/* 3. Mini Opportunity Radar */}
      <section className="px-5 mb-6">
        <div className="rounded-3xl bg-card shadow-soft p-5">
          <h3 className="text-sm font-bold text-foreground mb-3">Higher Demand Nearby</h3>
          <div className="divide-y divide-border/40">
            {mockDemandHints.map((hint) => (
              <DemandHintRow key={hint.id} hint={hint} />
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            Emergency plumbing peaks after 9 PM
          </p>
        </div>
      </section>

      {/* 4. Boost Actions */}
      <section className="px-5 mb-6">
        <h3 className="text-sm font-bold text-foreground mb-3 px-1">Increase Your Odds</h3>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2 h-12 rounded-2xl text-xs font-semibold bg-card shadow-soft border-border/60"
            onClick={() => toast.success("Radius expanded to 8 km")}
          >
            <Expand className="h-4 w-4 text-primary" />
            Expand Radius (5 → 8 km)
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2 h-12 rounded-2xl text-xs font-semibold bg-card shadow-soft border-border/60"
            onClick={() => toast.success("Urgent jobs enabled")}
          >
            <Zap className="h-4 w-4 text-warning" />
            Enable Urgent Jobs
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 gap-1.5 h-9 text-xs text-muted-foreground"
          onClick={() => toast.success("Add a new service from your profile")}
        >
          <Plus className="h-3.5 w-3.5" />
          Add one more service
        </Button>
      </section>

      {/* 5. Single Actionable Growth Insight */}
      <section className="px-5 mb-6">
        <GrowthHub insights={growthInsights} singleCard />
      </section>

      {/* 6. Pride Strip */}
      <section className="px-5 mb-6">
        <PrideStrip stats={prideStats} />
      </section>

      {/* 7. Reputation Growth */}
      <section className="px-5 mb-6">
        <ReputationGrowth reputation={reputation} />
      </section>
    </div>
  );
}
