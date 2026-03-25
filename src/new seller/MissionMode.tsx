import {
  Navigation,
  MapPin,
  Phone,
  Play,
  CheckCircle2,
  Clock,
  ChevronDown,
  AlertCircle,
  MessageCircle,
  CalendarClock,
  Camera,
  AlertTriangle,
  PhoneOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapVisual } from "./MapVisual";
import { StatusStepper } from "./StatusStepper";
import { toast } from "sonner";
import type { Job, JobStatus } from "@/data/mockData";
import type { ScheduleItem } from "@/data/mockDashboardData";

interface MissionModeProps {
  activeJob: Job;
  nextScheduledJob: ScheduleItem | null;
  todayEarnings: number;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  en_route: {
    label: "EN ROUTE",
    color: "text-warning",
    bgColor: "bg-warning/10 border-warning/20",
  },
  arrived: {
    label: "ARRIVED",
    color: "text-primary",
    bgColor: "bg-primary/10 border-primary/20",
  },
  in_progress: {
    label: "IN PROGRESS",
    color: "text-success",
    bgColor: "bg-success/10 border-success/20",
  },
  confirmed: {
    label: "CONFIRMED",
    color: "text-primary",
    bgColor: "bg-primary/10 border-primary/20",
  },
};

function getCtaForStatus(status: JobStatus) {
  switch (status) {
    case "confirmed":
    case "en_route":
      return { label: "Navigate", icon: Navigation };
    case "arrived":
      return { label: "Start Job", icon: Play };
    case "in_progress":
      return { label: "Complete Job", icon: CheckCircle2 };
    default:
      return { label: "View Details", icon: Play };
  }
}

const SERVICE_EMOJI: Record<string, string> = {
  plumbing: "🔧",
  electrical: "⚡",
  ac: "❄️",
  painting: "🎨",
  cleaning: "🧹",
  carpentry: "🪚",
  appliance: "🔌",
};

export function MissionMode({
  activeJob,
  nextScheduledJob,
  todayEarnings,
}: MissionModeProps) {
  const navigate = useNavigate();
  const [manageOpen, setManageOpen] = useState(false);

  const statusCfg = STATUS_CONFIG[activeJob.status] || STATUS_CONFIG.confirmed;
  const cta = getCtaForStatus(activeJob.status);
  const CtaIcon = cta.icon;

  return (
    <div className="px-5 pt-2 pb-6 animate-fade-in">
      {/* 0. Progress Stepper */}
      <div className="rounded-3xl bg-card shadow-soft px-5 py-4 mb-5">
        <StatusStepper currentStatus={activeJob.status} />
      </div>

      {/* 1. Mission Header */}
      <div className="rounded-3xl bg-card shadow-soft overflow-hidden mb-5">
        <MapVisual
          variant="eta"
          className="h-32 rounded-t-3xl"
          pinLabel={activeJob.location}
        />

        <div className="p-5">
          {/* Status badge */}
          <div className="flex items-center justify-between mb-4">
            <Badge
              className={`text-[11px] font-bold tracking-wider px-3 py-1 rounded-full border ${statusCfg.bgColor} ${statusCfg.color}`}
            >
              <span className="relative flex h-2 w-2 mr-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
              </span>
              {statusCfg.label}
            </Badge>
            <span className="text-2xl">
              {SERVICE_EMOJI[activeJob.service] || "🔧"}
            </span>
          </div>

          {/* Service info */}
          <h2 className="text-xl font-extrabold text-foreground leading-tight mb-1">
            {activeJob.subCategory}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {activeJob.description}
          </p>

          {/* Location */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-5">
            <MapPin className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.5} />
            <span>{activeJob.location}</span>
          </div>

          {/* Customer row */}
          <div className="flex items-center justify-between bg-muted/30 rounded-2xl px-4 py-3.5 mb-5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-base font-bold text-primary">
                  {activeJob.customerName.charAt(0)}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {activeJob.customerName}
                </p>
                <p className="text-[11px] text-muted-foreground">Customer</p>
              </div>
            </div>
            <a
              href="tel:+966551234567"
              className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center"
            >
              <Phone className="h-4 w-4 text-success" />
            </a>
          </div>

          {/* Primary CTA */}
          <Button
            size="lg"
            className="w-full h-14 text-base font-bold gap-2.5 rounded-full shadow-lg"
            onClick={() => navigate(`/job/${activeJob.id}`)}
          >
            <CtaIcon className="h-5 w-5" />
            {cta.label}
          </Button>
        </div>
      </div>

      {/* 2. Next Up Preview */}
      {nextScheduledJob && (
        <div className="rounded-2xl bg-card shadow-soft px-5 py-3.5 mb-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
            <span className="text-lg">{nextScheduledJob.icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              After this
            </p>
            <p className="text-sm font-semibold text-foreground truncate">
              {nextScheduledJob.subCategory} at {nextScheduledJob.time}
            </p>
          </div>
          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      )}

      {/* 3. Tiny Earnings Ticker */}
      <div className="rounded-2xl bg-card shadow-soft px-5 py-3.5 mb-4 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Today's Earnings</span>
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-bold text-foreground">
            SAR {todayEarnings.toLocaleString()}
          </span>
          <span className="text-[10px] text-success font-semibold">
            (+SAR {activeJob.amount})
          </span>
        </div>
      </div>

      {/* 4. Manage */}
      <button
        className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground py-2 hover:text-foreground transition-colors"
        onClick={() => setManageOpen(!manageOpen)}
      >
        <span>Manage</span>
        <ChevronDown
          className={`h-3 w-3 transition-transform ${manageOpen ? "rotate-180" : ""}`}
        />
      </button>

      {manageOpen && (
        <div className="rounded-2xl bg-card shadow-soft px-5 py-3 mt-1 space-y-1 animate-fade-in">
          <div className="border-b border-border/40 pb-1 mb-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-0.5 pt-1 pb-1">
              Quick Updates
            </p>
            <button
              className="w-full flex items-center gap-2.5 py-2.5 text-sm text-warning hover:text-warning/80 transition-colors"
              onClick={() => toast.success("Late notification sent to customer")}
            >
              <AlertTriangle className="h-4 w-4" />
              Running Late (send update)
            </button>
            <button
              className="w-full flex items-center gap-2.5 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => toast.success("Support notified about unresponsive customer")}
            >
              <PhoneOff className="h-4 w-4" />
              Customer Not Responding
            </button>
            <button
              className="w-full flex items-center gap-2.5 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => toast.success("Photo note added to job record")}
            >
              <Camera className="h-4 w-4" />
              Add Photo Note
            </button>
          </div>

          <button className="w-full flex items-center gap-2.5 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <AlertCircle className="h-4 w-4" />
            Cancel Job
          </button>
          <button className="w-full flex items-center gap-2.5 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <CalendarClock className="h-4 w-4" />
            Reschedule
          </button>
          <button className="w-full flex items-center gap-2.5 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <MessageCircle className="h-4 w-4" />
            Contact Support
          </button>
        </div>
      )}
    </div>
  );
}
