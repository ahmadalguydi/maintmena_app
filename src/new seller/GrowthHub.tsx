import { useState } from "react";
import { TrendingUp, ChevronRight, ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface GrowthInsight {
  id: string;
  headline: string;
  highlight: string;
  highlightColor: "primary" | "success" | "warning";
  detail: string;
  ctaLabel: string;
  ctaAction?: string;
}

interface GrowthHubProps {
  insights: GrowthInsight[];
  singleCard?: boolean;
}

const HIGHLIGHT_CLASSES: Record<string, string> = {
  primary: "text-primary font-extrabold",
  success: "text-success font-extrabold",
  warning: "text-warning font-extrabold",
};

export function GrowthHub({ insights, singleCard }: GrowthHubProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!insights.length) return null;

  const handleCta = (insight: GrowthInsight) => {
    toast.success(`Action: ${insight.ctaLabel}`);
  };

  const currentInsight = insights[activeIndex % insights.length];

  return (
    <section>
      <h2 className="text-sm font-semibold text-foreground mb-3 px-1">
        {singleCard ? "What to Do Now" : "Growth Hub"}
      </h2>

      <div className="rounded-3xl bg-foreground/95 p-5 shadow-soft">
        {/* Badge */}
        <div className="flex items-center gap-1.5 mb-3">
          <TrendingUp className="h-3.5 w-3.5 text-muted" />
          <Badge
            variant="secondary"
            className="text-[10px] font-bold tracking-wider px-2.5 py-0.5 bg-muted/15 text-muted border-none rounded-full"
          >
            {singleCard ? "SMART TIP" : "ACTIONABLE INSIGHT"}
          </Badge>
        </div>

        {/* Headline */}
        <p className="text-base font-bold text-background leading-snug mb-4">
          {renderHighlightedText(
            currentInsight.headline,
            currentInsight.highlight,
            HIGHLIGHT_CLASSES[currentInsight.highlightColor]
          )}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground/80 max-w-[50%] leading-relaxed">
            {currentInsight.detail}
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="h-9 px-5 text-xs font-bold rounded-full bg-primary text-primary-foreground hover:bg-primary/90 border-none gap-1"
            onClick={() => handleCta(currentInsight)}
          >
            {currentInsight.ctaLabel}
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>

        {/* Navigation */}
        {insights.length > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4 pt-3 border-t border-muted/15">
            <button
              className="h-7 w-7 rounded-full flex items-center justify-center text-muted/60 hover:text-muted transition-colors"
              onClick={() =>
                setActiveIndex((i) => (i - 1 + insights.length) % insights.length)
              }
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <div className="flex gap-1.5">
              {insights.map((_, i) => (
                <button
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === activeIndex % insights.length
                      ? "w-5 bg-primary"
                      : "w-1.5 bg-muted/30"
                  }`}
                  onClick={() => setActiveIndex(i)}
                />
              ))}
            </div>
            <button
              className="h-7 w-7 rounded-full flex items-center justify-center text-muted/60 hover:text-muted transition-colors"
              onClick={() => setActiveIndex((i) => (i + 1) % insights.length)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function renderHighlightedText(text: string, highlight: string, className: string) {
  if (!highlight) return text;
  const idx = text.toLowerCase().indexOf(highlight.toLowerCase());
  if (idx === -1) return text;

  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + highlight.length);
  const after = text.slice(idx + highlight.length);

  return (
    <>
      {before}
      <span className={className}>{match}</span>
      {after}
    </>
  );
}
