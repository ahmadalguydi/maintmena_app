import { Check } from "lucide-react";
import { JOB_STATUS_LABELS, type JobStatus } from "@/data/mockData";

const STEPS: JobStatus[] = [
  "quote_sent",
  "confirmed",
  "en_route",
  "arrived",
  "in_progress",
  "completed",
];

interface StatusStepperProps {
  currentStatus: JobStatus;
  onAdvance?: (nextStatus: JobStatus) => void;
}

export function StatusStepper({ currentStatus, onAdvance }: StatusStepperProps) {
  const currentIndex = STEPS.indexOf(currentStatus);
  const progressPercent = currentIndex === 0 ? 0 : (currentIndex / (STEPS.length - 1)) * 100;

  return (
    <div className="w-full">
      {/* Current step label */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-primary uppercase tracking-wider">
          {JOB_STATUS_LABELS[currentStatus]}
        </span>
        <span className="text-[10px] text-muted-foreground">
          Step {currentIndex + 1} of {STEPS.length}
        </span>
      </div>

      {/* Progress track */}
      <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Step dots */}
      <div className="relative flex justify-between mt-[-5px]">
        {STEPS.map((step, i) => {
          const isDone = i < currentIndex;
          const isCurrent = i === currentIndex;
          const isNext = i === currentIndex + 1;

          return (
            <button
              key={step}
              disabled={!isNext || !onAdvance}
              onClick={() => isNext && onAdvance?.(step)}
              className={`
                h-3.5 w-3.5 rounded-full border-2 transition-all
                ${isDone
                  ? "bg-primary border-primary"
                  : isCurrent
                  ? "bg-background border-primary ring-2 ring-primary/20"
                  : isNext && onAdvance
                  ? "bg-background border-muted-foreground/30 cursor-pointer hover:border-primary/60"
                  : "bg-background border-muted-foreground/20"
                }
              `}
              title={JOB_STATUS_LABELS[step]}
            >
              {isDone && <Check className="h-2 w-2 text-primary-foreground m-auto" />}
            </button>
          );
        })}
      </div>

      {/* Abbreviated labels under dots */}
      <div className="flex justify-between mt-1">
        {STEPS.map((step, i) => {
          const isCurrent = i === currentIndex;
          return (
            <span
              key={step}
              className={`text-[8px] leading-tight text-center w-10 truncate ${
                isCurrent ? "text-primary font-semibold" : "text-muted-foreground/60"
              }`}
            >
              {getShortLabel(step)}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** Short labels for compact display under dots */
function getShortLabel(status: JobStatus): string {
  switch (status) {
    case "quote_sent": return "Quote";
    case "confirmed": return "Confirmed";
    case "en_route": return "En Route";
    case "arrived": return "Arrived";
    case "in_progress": return "Working";
    case "completed": return "Done";
    default: return "";
  }
}
