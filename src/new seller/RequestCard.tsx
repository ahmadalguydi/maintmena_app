import { Clock, MapPin, Navigation2, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapVisual } from "./MapVisual";
import { SERVICE_ICONS, SERVICE_LABELS, type ServiceRequest } from "@/data/mockData";
import { useNavigate } from "react-router-dom";

interface RequestCardProps {
  request: ServiceRequest;
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
}

const EST_PAY: Record<string, number> = {
  plumbing: 180,
  electrical: 250,
  ac: 300,
  painting: 350,
  cleaning: 120,
  carpentry: 280,
  appliance: 200,
};

const MOCK_DISTANCE: Record<string, string> = {
  "req-001": "2.1 km",
  "req-002": "5.1 km",
  "req-003": "3.8 km",
};

const SERVICE_EMOJI: Record<string, string> = {
  plumbing: "🔧",
  electrical: "⚡",
  ac: "❄️",
  painting: "🎨",
  cleaning: "🧹",
  carpentry: "🪚",
  appliance: "🔌",
};

export function RequestCard({ request, onAccept, onDecline }: RequestCardProps) {
  const navigate = useNavigate();
  const minutes = Math.floor(request.responseDeadline / 60);
  const seconds = request.responseDeadline % 60;
  const distance = MOCK_DISTANCE[request.id] || "4 km";
  const estPay = EST_PAY[request.service] || 200;
  const isUrgent = request.timing === "asap" && !request.hasProvider;

  return (
    <div
      className={`rounded-3xl bg-card overflow-hidden cursor-pointer transition-all shadow-soft hover:shadow-soft-hover ${
        isUrgent ? "ring-2 ring-primary/30 animate-pulse-border" : ""
      }`}
      onClick={() => navigate(`/request/${request.id}`)}
    >
      {/* Map header */}
      <div className="relative h-28">
        <MapVisual
          variant={isUrgent ? "route" : "location"}
          className="h-full"
          pinLabel={`${request.neighborhood} · ${distance}`}
        />

        {isUrgent && (
          <Badge className="absolute top-3 left-3 bg-destructive text-destructive-foreground text-[10px] font-bold px-2.5 py-1 gap-1 rounded-full z-10">
            <Zap className="h-3 w-3 fill-current" />
            URGENT FIX
          </Badge>
        )}

        <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-card/90 backdrop-blur-sm rounded-full px-2.5 py-1 z-10">
          <Navigation2 className="h-3 w-3 text-foreground" />
          <span className="text-[11px] font-semibold text-foreground">{distance} away</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Service icon + info + Price */}
        <div className="flex items-start gap-3 mb-3">
          {/* Service icon in tinted circle */}
          <div className="h-12 w-12 rounded-2xl bg-accent/60 flex items-center justify-center shrink-0">
            <span className="text-xl">{SERVICE_EMOJI[request.service] || "🔧"}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base text-foreground leading-tight">
              {SERVICE_LABELS[request.service]}
            </h3>
            <p className="text-sm text-primary font-medium mt-0.5">{request.subCategory}</p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-2xl font-extrabold text-foreground">{estPay}</span>
            <span className="text-xs font-medium text-muted-foreground ml-0.5">SAR</span>
          </div>
        </div>

        {/* Separator */}
        <div className="h-px bg-border/60 mb-3" />

        {/* Location + timing */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            <span>{request.neighborhood} District</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            <span>{request.timing === "asap" ? "Earliest" : "Scheduled"}</span>
          </div>
        </div>

        {/* Tags + Action row */}
        <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-full bg-success/8 px-2.5 py-1">
              <span className="text-[10px]">💸</span>
              <span className="text-[11px] font-medium text-success">Fast Payer</span>
            </div>
            {isUrgent && request.responseDeadline > 0 && (
              <div className={`flex items-center gap-1 text-[11px] font-bold ${
                minutes < 3 ? "text-destructive" : "text-muted-foreground"
              }`}>
                <Clock className="h-3 w-3" />
                {minutes}:{seconds.toString().padStart(2, "0")}
              </div>
            )}
            {request.hasProvider && (
              <span className="text-[11px] text-muted-foreground">
                {request.waitlistCount} in waitlist
              </span>
            )}
          </div>

          {!request.hasProvider ? (
            <Button
              size="sm"
              className="rounded-full text-xs h-10 px-6 font-bold shadow-soft"
              onClick={() => onAccept?.(request.id)}
            >
              Accept
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              className="rounded-full text-xs h-9 px-5"
              onClick={() => navigate(`/request/${request.id}`)}
            >
              Join Waitlist
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
