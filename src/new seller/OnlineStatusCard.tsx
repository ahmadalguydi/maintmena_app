import { Power, TrendingUp, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockDemandCategories, type DemandCategory } from "@/data/mockDashboardData";

interface OnlineStatusCardProps {
  isOnline: boolean;
  onToggle: (value: boolean) => void;
}

function DemandRow({ cat }: { cat: DemandCategory }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-b-0">
      <div className="flex items-center gap-3">
        <span className="text-lg">{cat.icon}</span>
        <div>
          <p className="text-sm font-semibold text-foreground">{cat.label}</p>
          <p className="text-[11px] text-muted-foreground">
            {cat.activeRequests} requests near you
          </p>
        </div>
      </div>
      {cat.demandLevel === "surge" && (
        <Badge className="text-[10px] h-5 px-2 bg-success/15 text-success border-0 font-bold">
          ↑ +{cat.surgePercent}%
        </Badge>
      )}
      {cat.demandLevel === "high" && (
        <Badge variant="destructive" className="text-[10px] h-5 px-2 font-bold">
          High
        </Badge>
      )}
      {cat.demandLevel === "medium" && (
        <Badge variant="secondary" className="text-[10px] h-5 px-2 font-semibold">
          Steady
        </Badge>
      )}
    </div>
  );
}

export function OnlineStatusCard({ isOnline, onToggle }: OnlineStatusCardProps) {
  if (isOnline) return null;

  // Top demand categories for offline view
  const topDemand = mockDemandCategories.filter(
    (c) => c.demandLevel === "high" || c.demandLevel === "surge"
  );
  const otherDemand = mockDemandCategories.filter(
    (c) => c.demandLevel === "medium"
  );

  return (
    <div className="space-y-4">
      {/* Hero: You're Offline */}
      <div className="text-center pt-2 pb-1">
        <div className="inline-flex items-center gap-2 rounded-full border border-muted-foreground/20 bg-card px-3 py-1 mb-3">
          <div className="h-2 w-2 rounded-full bg-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Offline
          </span>
        </div>
        <h2 className="text-2xl font-extrabold text-foreground leading-tight">
          You're Offline
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Ready to take jobs?
        </p>
      </div>

      {/* Demand Near You — the opportunity pull */}
      <div className="rounded-2xl border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Near You Right Now</h3>
        </div>
        <div>
          {topDemand.map((cat) => (
            <DemandRow key={cat.id} cat={cat} />
          ))}
          {otherDemand.map((cat) => (
            <DemandRow key={cat.id} cat={cat} />
          ))}
        </div>
      </div>

      {/* Demand Rising — future opportunity FOMO */}
      <div className="rounded-2xl border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-success" />
          <h3 className="text-sm font-bold text-foreground">Demand Rising</h3>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">❄️ AC Repair</span>
            <span className="text-xs font-semibold text-success">↑ tonight</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">🔧 Emergency Plumbing</span>
            <span className="text-xs font-semibold text-success">↑ after 9 PM</span>
          </div>
        </div>
      </div>

      {/* Estimated Earnings — anticipation dopamine */}
      <div className="rounded-2xl border bg-gradient-to-br from-primary/8 via-card to-card p-4 text-center">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
          Estimated Earnings If Online Now
        </p>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-3xl font-extrabold text-primary tracking-tight">
            SAR 220 – 380
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">next 3 hours</p>
      </div>

      {/* Go Online CTA */}
      <Button
        size="lg"
        className="w-full h-14 text-base font-bold gap-2.5 rounded-full shadow-lg"
        onClick={() => onToggle(true)}
      >
        <Power className="h-5 w-5" />
        Go Online
      </Button>
    </div>
  );
}
