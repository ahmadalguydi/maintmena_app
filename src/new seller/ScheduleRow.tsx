import { MapPin } from "lucide-react";
import type { ScheduleItem } from "@/data/mockDashboardData";

interface ScheduleRowProps {
  item: ScheduleItem;
}

const SERVICE_BG: Record<string, string> = {
  plumbing: "bg-blue-100",
  electrical: "bg-amber-100",
  ac: "bg-cyan-100",
  painting: "bg-purple-100",
  cleaning: "bg-emerald-100",
  carpentry: "bg-orange-100",
  appliance: "bg-rose-100",
};

export function ScheduleRow({ item }: ScheduleRowProps) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-b-0">
      {/* Icon circle */}
      <div
        className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
          SERVICE_BG[item.service] || "bg-muted"
        }`}
      >
        <span className="text-lg">{item.icon}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">
          {item.subCategory}
        </p>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
          <MapPin className="h-2.5 w-2.5 shrink-0" />
          <span className="truncate">{item.location}</span>
          {item.estimatedDuration && (
            <>
              <span>•</span>
              <span className="whitespace-nowrap">{item.estimatedDuration}</span>
            </>
          )}
        </div>
      </div>

      {/* Time pill */}
      <div className="shrink-0 rounded-lg border border-border px-2.5 py-1">
        <span className="text-xs font-bold text-foreground whitespace-nowrap">
          {item.time}
        </span>
      </div>
    </div>
  );
}
