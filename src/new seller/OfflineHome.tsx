import { Power, TrendingUp, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapVisual } from "./MapVisual";
import { mockDemandCategories, type DemandCategory } from "@/data/mockDashboardData";

interface OfflineHomeProps {
  onGoOnline: () => void;
}

function DemandRow({ cat }: { cat: DemandCategory }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/40 last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-accent/50 flex items-center justify-center">
          <span className="text-lg">{cat.icon}</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{cat.label}</p>
          <p className="text-[11px] text-muted-foreground">
            {cat.activeRequests} requests near you
          </p>
        </div>
      </div>
      {cat.demandLevel === "surge" && (
        <Badge className="text-[10px] h-5 px-2.5 bg-success/10 text-success border-0 font-bold rounded-full">
          ↑ +{cat.surgePercent}%
        </Badge>
      )}
      {cat.demandLevel === "high" && (
        <Badge variant="destructive" className="text-[10px] h-5 px-2.5 font-bold rounded-full">
          High
        </Badge>
      )}
      {cat.demandLevel === "medium" && (
        <Badge variant="secondary" className="text-[10px] h-5 px-2.5 font-semibold rounded-full">
          Steady
        </Badge>
      )}
    </div>
  );
}

export function OfflineHome({ onGoOnline }: OfflineHomeProps) {
  const topDemand = mockDemandCategories.filter(
    (c) => c.demandLevel === "high" || c.demandLevel === "surge"
  );
  const otherDemand = mockDemandCategories.filter(
    (c) => c.demandLevel === "medium"
  );

  return (
    <div className="px-5 pt-2 pb-6 space-y-5 animate-fade-in">
      {/* Hero: You're Offline */}
      <div className="text-center pt-2 pb-1">
        <div className="inline-flex items-center gap-2 rounded-full bg-card shadow-soft px-4 py-1.5 mb-3">
          <div className="h-2 w-2 rounded-full bg-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Offline
          </span>
        </div>
        <h2 className="text-2xl font-extrabold text-foreground leading-tight">
          You're Offline
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Ready to take requests?
        </p>
      </div>

      {/* Demand Heatmap */}
      <div className="rounded-3xl bg-card overflow-hidden shadow-soft">
        <MapVisual variant="demand" className="h-36" pinLabel="Your area" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Near You Right Now</h3>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground">
                Updated 12s ago
              </span>
            </div>
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
      </div>

      {/* Service Radius */}
      <div className="rounded-3xl bg-card shadow-soft px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-accent/50 flex items-center justify-center">
            <MapPin className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground">Service Radius</span>
        </div>
        <select className="text-sm font-semibold text-primary bg-transparent border-none focus:outline-none cursor-pointer">
          <option value="5">5 km</option>
          <option value="8">8 km</option>
          <option value="12">12 km</option>
          <option value="20">20 km</option>
        </select>
      </div>

      {/* Demand Rising */}
      <div className="rounded-3xl bg-card shadow-soft p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="h-9 w-9 rounded-xl bg-success/10 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-success" />
          </div>
          <h3 className="text-sm font-bold text-foreground">Demand Rising</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">❄️ AC Repair</span>
            <span className="text-xs font-semibold text-success">↑ tonight</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">🔧 Emergency Plumbing</span>
            <span className="text-xs font-semibold text-success">↑ after 9 PM</span>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-border/40 flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-warning" />
          <span className="text-xs text-muted-foreground">
            Peak demand expected in <span className="font-semibold text-foreground">45 min</span>
          </span>
        </div>
      </div>

      {/* Estimated Earnings */}
      <div className="rounded-3xl bg-card shadow-soft p-5 text-center">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
          Estimated Earnings If Online Now
        </p>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-3xl font-extrabold text-primary tracking-tight">
            SAR 220 – 380
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          next 3 hours · Based on nearby demand
        </p>
      </div>

      {/* Go Online CTA */}
      <Button
        size="lg"
        className="w-full h-14 text-base font-bold gap-2.5 rounded-full shadow-lg animate-cta-pulse"
        onClick={onGoOnline}
      >
        <Power className="h-5 w-5" />
        Go Online
      </Button>
    </div>
  );
}
