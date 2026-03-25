import { Badge } from "@/components/ui/badge";
import { OnlineStatusBar } from "./OnlineStatusBar";
import { RequestCard } from "./RequestCard";
import { GrowthHub } from "./GrowthHub";
import { PrideStrip } from "./PrideStrip";
import { EarningsMomentum } from "./EarningsMomentum";
import { ReputationGrowth } from "./ReputationGrowth";
import type { ServiceRequest } from "@/data/mockData";
import type {
  EarningsData,
  PrideStats,
  ReputationDataType,
  GrowthInsightData,
} from "@/data/mockDashboardData";

interface OnlineHomeProps {
  requests: ServiceRequest[];
  growthInsights: GrowthInsightData[];
  earnings: EarningsData;
  prideStats: PrideStats;
  reputation: ReputationDataType;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}

export function OnlineHome({
  requests,
  growthInsights,
  earnings,
  prideStats,
  reputation,
  onAccept,
  onDecline,
}: OnlineHomeProps) {
  return (
    <div className="animate-fade-in">
      {/* 1. Compact Online Status Bar */}
      <div className="px-5 mb-5">
        <OnlineStatusBar todayEarnings={earnings.todayTotal} />
      </div>

      {/* 2. Incoming Opportunities */}
      {requests.length > 0 && (
        <section className="px-5 mb-6">
          <div className="flex items-center gap-2 mb-4 px-1">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
            </span>
            <h2 className="text-lg font-extrabold text-foreground">
              Opportunities Now
            </h2>
            <Badge variant="secondary" className="text-[10px] h-5 px-2 font-bold rounded-full">
              {requests.length}
            </Badge>
          </div>
          <div className="space-y-4">
            {requests.map((req, index) => (
              <div
                key={req.id}
                className={`animate-slide-up${index > 0 ? `-delay-${index}` : ""}`}
              >
                <RequestCard
                  request={req}
                  onAccept={onAccept}
                  onDecline={onDecline}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Growth Hub */}
      <section className="px-5 mb-6">
        <GrowthHub insights={growthInsights} />
      </section>

      {/* 4. Pride Strip */}
      <section className="px-5 mb-6">
        <PrideStrip stats={prideStats} />
      </section>

      {/* 5. Earnings Momentum */}
      <section className="px-5 mb-6">
        <EarningsMomentum earnings={earnings} />
      </section>

      {/* 6. Reputation Growth */}
      <section className="px-5 mb-6">
        <ReputationGrowth reputation={reputation} />
      </section>
    </div>
  );
}
