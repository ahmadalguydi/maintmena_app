interface OnlineStatusBarProps {
  todayEarnings: number;
}

export function OnlineStatusBar({ todayEarnings }: OnlineStatusBarProps) {
  return (
    <div className="flex items-center justify-between rounded-full bg-card shadow-soft px-5 py-3">
      {/* Online indicator */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/50" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
        </span>
        <span className="text-sm font-semibold text-foreground">Online</span>
      </div>

      {/* Time online */}
      <span className="text-xs text-muted-foreground font-medium">1h 23m</span>

      {/* Today earnings ticker */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">Today</span>
        <span className="text-sm font-bold text-foreground">
          SAR {todayEarnings.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
