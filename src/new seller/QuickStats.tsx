import { Briefcase, Wallet, Star } from "lucide-react";

interface QuickStatsProps {
  todayJobs: number;
  todayEarnings: number;
  rating: number;
}

export function QuickStats({ todayJobs, todayEarnings, rating }: QuickStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-card shadow-soft p-4">
        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Briefcase className="h-4 w-4 text-primary" />
        </div>
        <span className="text-lg font-bold">{todayJobs}</span>
        <span className="text-[10px] text-muted-foreground">Today's Jobs</span>
      </div>
      <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-card shadow-soft p-4">
        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Wallet className="h-4 w-4 text-primary" />
        </div>
        <span className="text-lg font-bold">
          {todayEarnings.toLocaleString()}
        </span>
        <span className="text-[10px] text-muted-foreground">Earnings (SAR)</span>
      </div>
      <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-card shadow-soft p-4">
        <div className="h-9 w-9 rounded-xl bg-warning/10 flex items-center justify-center">
          <Star className="h-4 w-4 text-warning fill-warning" />
        </div>
        <span className="text-lg font-bold">{rating}</span>
        <span className="text-[10px] text-muted-foreground">Rating</span>
      </div>
    </div>
  );
}
