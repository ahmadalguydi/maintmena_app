import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

interface PageShellProps {
  children: ReactNode;
  className?: string;
}

export function PageShell({ children, className = "" }: PageShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className={`mx-auto max-w-md pb-24 ${className}`}>
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
