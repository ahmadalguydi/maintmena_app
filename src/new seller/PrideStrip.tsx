import { Heart, Shield, Zap } from "lucide-react";
import type { PrideStats } from "@/data/mockDashboardData";

interface PrideStripProps {
  stats: PrideStats;
}

export function PrideStrip({ stats }: PrideStripProps) {
  return (
    <div className="flex items-center gap-2.5 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-hide">
      <div className="shrink-0 flex items-center gap-2 rounded-full bg-card shadow-soft px-4 py-2">
        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
          <Heart className="h-3.5 w-3.5 text-primary fill-primary/30" />
        </div>
        <span className="text-[11px] font-medium text-foreground whitespace-nowrap">
          {stats.customersChoseYou} customers chose you
        </span>
      </div>

      <div className="shrink-0 flex items-center gap-2 rounded-full bg-card shadow-soft px-4 py-2">
        <div className="h-7 w-7 rounded-full bg-success/10 flex items-center justify-center">
          <Shield className="h-3.5 w-3.5 text-success" />
        </div>
        <span className="text-[11px] font-medium text-foreground whitespace-nowrap">
          {stats.satisfactionStreak} day streak
        </span>
      </div>

      <div className="shrink-0 flex items-center gap-2 rounded-full bg-card shadow-soft px-4 py-2">
        <div className="h-7 w-7 rounded-full bg-warning/10 flex items-center justify-center">
          <Zap className="h-3.5 w-3.5 text-warning" />
        </div>
        <span className="text-[11px] font-medium text-foreground whitespace-nowrap">
          {stats.responseSpeed} response
        </span>
      </div>
    </div>
  );
}
