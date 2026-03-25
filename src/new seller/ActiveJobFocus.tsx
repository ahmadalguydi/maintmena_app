import { MapPin, Phone, Clock, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import type { ScheduleItem } from "@/data/mockDashboardData";
import { ScheduleRow } from "./ScheduleRow";

interface ActiveJobFocusProps {
  nextJob: ScheduleItem | null;
  upcomingJobs: ScheduleItem[];
  activeJobId?: string;
}

export function ActiveJobFocus({ nextJob, upcomingJobs, activeJobId }: ActiveJobFocusProps) {
  const navigate = useNavigate();

  if (!nextJob) {
    return (
      <div className="rounded-2xl border border-dashed border-muted-foreground/30 bg-muted/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No active jobs — stay online for new opportunities
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          We'll notify you when a request comes in
        </p>
      </div>
    );
  }

  // Split time into number and period
  const timeParts = nextJob.time.match(/(\d+:\d+)\s*(AM|PM)/i);
  const timeNum = timeParts?.[1] || nextJob.time;
  const timePeriod = timeParts?.[2] || "";

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-lg font-extrabold text-foreground">Today's Schedule</h2>
        <button className="text-xs font-semibold text-primary hover:underline">
          See All
        </button>
      </div>

      {/* NEXT UP card */}
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden mb-2">
        <div className="p-5">
          {/* Top row: NEXT UP badge + Time */}
          <div className="flex items-start justify-between mb-4">
            <Badge className="bg-primary text-primary-foreground text-[11px] font-bold tracking-wide px-3 py-1 rounded-full">
              NEXT UP
            </Badge>
            <div className="text-right">
              <span className="text-3xl font-extrabold text-foreground leading-none tracking-tight">
                {timeNum}
              </span>
              <p className="text-xs font-medium text-muted-foreground mt-0.5">{timePeriod}</p>
            </div>
          </div>

          {/* Service info */}
          <h3 className="text-xl font-bold text-foreground mb-1">
            {nextJob.subCategory}
          </h3>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-5">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span>{nextJob.location}</span>
          </div>

          {/* Customer row */}
          <div className="flex items-center justify-between bg-muted/40 rounded-xl px-4 py-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">
                  {nextJob.customerName.charAt(0)}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{nextJob.customerName}</p>
                {nextJob.isPremium && (
                  <p className="text-[11px] text-primary font-medium">Premium Customer</p>
                )}
              </div>
            </div>
            {nextJob.phone && (
              <a
                href={`tel:${nextJob.phone}`}
                className="h-10 w-10 rounded-full bg-success/15 flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                <Phone className="h-4.5 w-4.5 text-success" />
              </a>
            )}
          </div>

          {/* Start Job button */}
          <Button
            className="w-full h-12 text-base font-bold gap-2.5 rounded-full shadow-lg"
            onClick={() => navigate(activeJobId ? `/job/${activeJobId}` : "#")}
          >
            <Play className="h-4 w-4 fill-current" />
            Start Job
          </Button>
        </div>
      </div>

      {/* Upcoming schedule rows */}
      {upcomingJobs.length > 0 && (
        <div className="rounded-2xl border bg-card px-4 py-1">
          {upcomingJobs.map((item) => (
            <ScheduleRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
