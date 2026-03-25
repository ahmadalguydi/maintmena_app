import { Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface ReputationData {
  currentXP: number;
  nextTierXP: number;
  currentTier: string;
  nextTier: string;
}

interface ReputationGrowthProps {
  reputation: ReputationData;
}

export function ReputationGrowth({ reputation }: ReputationGrowthProps) {
  const progress = Math.round((reputation.currentXP / reputation.nextTierXP) * 100);
  const remaining = reputation.nextTierXP - reputation.currentXP;

  return (
    <div className="rounded-3xl bg-card shadow-soft p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Award className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-bold text-foreground">Reputation Growth</span>
        </div>
        <Badge className="text-[10px] h-5 px-2.5 bg-primary/10 text-primary border border-primary/20 font-semibold rounded-full">
          NEXT: {reputation.nextTier}
        </Badge>
      </div>

      <div className="h-2.5 w-full rounded-full bg-secondary overflow-hidden mb-2">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-700"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        You are <span className="font-bold text-foreground">{remaining} XP</span> away from unlocking lower fees.
      </p>
    </div>
  );
}
