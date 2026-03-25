import { Badge } from "@/components/ui/badge";
import type { DemandCategory } from "@/data/mockDashboardData";

interface OpportunityRadarProps {
  categories: DemandCategory[];
}

export function OpportunityRadar({ categories }: OpportunityRadarProps) {
  return (
    <section>
      {/* Header with pulsing dot */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive/60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
        </span>
        <h2 className="text-sm font-semibold text-foreground">High Demand Today</h2>
      </div>

      {/* Horizontal scroll */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="shrink-0 w-36 rounded-2xl bg-card shadow-soft hover:shadow-soft-hover transition-shadow cursor-pointer p-4 flex flex-col items-start gap-2"
          >
            <div className="h-10 w-10 rounded-xl bg-accent/50 flex items-center justify-center">
              <span className="text-xl">{cat.icon}</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground leading-tight">
                {cat.label}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {cat.activeRequests} active requests
              </p>
            </div>
            {cat.demandLevel === "high" && (
              <Badge variant="destructive" className="text-[9px] h-4 px-2 rounded-full">
                High Demand
              </Badge>
            )}
            {cat.demandLevel === "surge" && (
              <Badge className="text-[9px] h-4 px-2 bg-success text-success-foreground rounded-full">
                +{cat.surgePercent}% Surge
              </Badge>
            )}
            {cat.demandLevel === "medium" && (
              <Badge variant="secondary" className="text-[9px] h-4 px-2 rounded-full">
                Steady
              </Badge>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
