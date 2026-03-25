import { CalendarClock, MapPin, MessageCircle, Pencil, X, Clock, Shield, ShieldCheck, RefreshCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapVisual } from "./MapVisual";
import { OnlineHome } from "./OnlineHome";
import type { ScheduleItem, EarningsData, PrideStats, ReputationDataType, GrowthInsightData } from "@/data/mockDashboardData";
import type { ServiceRequest } from "@/data/mockData";

interface ScheduledHomeProps {
  scheduledJob: ScheduleItem;
  scheduledEarnings: number;
  requests: ServiceRequest[];
  growthInsights: GrowthInsightData[];
  earnings: EarningsData;
  prideStats: PrideStats;
  reputation: ReputationDataType;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}

export function ScheduledHome({
  scheduledJob,
  requests,
  growthInsights,
  earnings,
  prideStats,
  reputation,
  onAccept,
  onDecline,
}: ScheduledHomeProps) {
  const isHardReservation = scheduledJob.reservationStatus === "hard";

  return (
    <div className="animate-fade-in">
      {/* 1. Upcoming Job Card */}
      <section className="px-5 mb-6">
        <div className="rounded-3xl bg-card shadow-soft overflow-hidden">
          <MapVisual variant="coverage" className="h-28 rounded-t-3xl" pinLabel={scheduledJob.location} />

          <div className="p-5">
            {/* Badge + icon */}
            <div className="flex items-center justify-between mb-3">
              <Badge className="text-[11px] font-bold tracking-wider px-3 py-1 rounded-full bg-primary/10 border-primary/20 text-primary">
                <CalendarClock className="h-3 w-3 mr-1.5" />
                UPCOMING
              </Badge>
              <span className="text-2xl">{scheduledJob.icon}</span>
            </div>

            {/* Service + time */}
            <h2 className="text-lg font-extrabold text-foreground leading-tight mb-0.5">
              {scheduledJob.subCategory}
            </h2>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>{scheduledJob.time}</span>
              </div>
              {scheduledJob.estimatedDuration && (
                <span className="text-xs">· {scheduledJob.estimatedDuration}</span>
              )}
            </div>

            {/* Location */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <MapPin className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.5} />
              <span>{scheduledJob.location}</span>
            </div>

            {/* Reservation Status */}
            <div className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 mb-4 text-xs ${
              isHardReservation
                ? "bg-success/8 border border-success/15"
                : "bg-warning/8 border border-warning/15"
            }`}>
              {isHardReservation ? (
                <>
                  <ShieldCheck className="h-4 w-4 text-success shrink-0" />
                  <span className="font-semibold text-success">Confirmed</span>
                  <span className="text-muted-foreground">· locked in</span>
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 text-warning shrink-0" />
                  <span className="font-semibold text-warning">Reserved (soft)</span>
                  {scheduledJob.reconfirmBy && (
                    <span className="text-muted-foreground">
                      · Reconfirm by <span className="font-semibold text-foreground">{scheduledJob.reconfirmBy}</span>
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Customer row */}
            <div className="flex items-center gap-3 bg-muted/30 rounded-2xl px-4 py-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">
                  {scheduledJob.customerName.charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{scheduledJob.customerName}</p>
                <p className="text-[11px] text-muted-foreground">Customer</p>
              </div>
              {scheduledJob.isPremium && (
                <Badge variant="secondary" className="text-[9px] px-2 font-bold rounded-full">
                  ⭐ Premium
                </Badge>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              {isHardReservation ? (
                <>
                  <Button variant="outline" size="sm" className="flex-1 gap-1.5 h-10 text-xs rounded-full">
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 gap-1.5 h-10 text-xs text-destructive hover:text-destructive rounded-full">
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 gap-1.5 h-10 text-xs rounded-full">
                    <MessageCircle className="h-3.5 w-3.5" />
                    Message
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" className="flex-1 gap-1.5 h-10 text-xs rounded-full">
                    <RefreshCcw className="h-3.5 w-3.5" />
                    Keep Reserved
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 gap-1.5 h-10 text-xs text-destructive hover:text-destructive rounded-full">
                    <X className="h-3.5 w-3.5" />
                    Release
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 gap-1.5 h-10 text-xs rounded-full">
                    <MessageCircle className="h-3.5 w-3.5" />
                    Message
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Normal Opportunity Flow */}
      <OnlineHome
        requests={requests}
        growthInsights={growthInsights}
        earnings={earnings}
        prideStats={prideStats}
        reputation={reputation}
        onAccept={onAccept}
        onDecline={onDecline}
      />
    </div>
  );
}
