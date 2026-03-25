import { Star, Clock, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  SERVICE_ICONS,
  SERVICE_LABELS,
  JOB_STATUS_LABELS,
  type Job,
} from "@/data/mockData";
import { useNavigate } from "react-router-dom";

interface JobCardProps {
  job: Job;
}

const statusColors: Record<string, string> = {
  quote_sent: "bg-accent text-accent-foreground",
  confirmed: "bg-primary/15 text-primary",
  en_route: "bg-primary/20 text-primary",
  arrived: "bg-primary/30 text-primary",
  in_progress: "bg-warning/20 text-warning-foreground",
  completed: "bg-success/20 text-success",
};

export function JobCard({ job }: JobCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md"
      onClick={() => {
        if (job.isWaitlisted) return;
        if (job.status === "completed") return;
        navigate(`/job/${job.id}`);
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{SERVICE_ICONS[job.service]}</span>
            <div>
              <h3 className="font-semibold text-sm">
                {SERVICE_LABELS[job.service]}
              </h3>
              <p className="text-xs text-muted-foreground">
                {job.subCategory}
              </p>
            </div>
          </div>
          <Badge
            variant="secondary"
            className={`text-xs ${statusColors[job.status] || ""}`}
          >
            {job.isWaitlisted
              ? `Waitlisted #${job.waitlistPosition}`
              : JOB_STATUS_LABELS[job.status]}
          </Badge>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{job.customerName} · {job.location}</span>
          <div className="flex items-center gap-2">
            {job.isWaitlisted && (
              <span className="flex items-center gap-1 text-primary">
                <Users className="h-3 w-3" />
                #{job.waitlistPosition}
              </span>
            )}
            {job.amount > 0 && (
              <span className="font-semibold text-foreground">
                SAR {job.amount}
              </span>
            )}
            {job.rating && (
              <span className="flex items-center gap-0.5 text-warning">
                <Star className="h-3 w-3 fill-current" />
                {job.rating}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {job.date}
        </div>
      </CardContent>
    </Card>
  );
}
