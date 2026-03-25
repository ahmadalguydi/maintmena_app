/**
 * MapVisual — SVG-based map placeholder with roads, pins, and demand dots.
 * Multiple variants for different contexts.
 */

interface MapVisualProps {
  variant?: "location" | "demand" | "route" | "eta" | "coverage";
  className?: string;
  pinLabel?: string;
}

export function MapVisual({ variant = "location", className = "", pinLabel }: MapVisualProps) {
  return (
    <div className={`relative w-full overflow-hidden bg-gradient-to-br from-muted/50 via-muted/30 to-background ${className}`}>
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 400 200"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Grid pattern — subtle streets */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.6" />
          </pattern>
        </defs>
        <rect width="400" height="200" fill="url(#grid)" />

        {/* Main roads */}
        <line x1="0" y1="100" x2="400" y2="100" stroke="hsl(var(--warning))" strokeWidth="2.5" opacity="0.2" />
        <line x1="200" y1="0" x2="200" y2="200" stroke="hsl(var(--warning))" strokeWidth="2.5" opacity="0.2" />
        <line x1="50" y1="0" x2="350" y2="200" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" opacity="0.1" />
        <line x1="350" y1="0" x2="50" y2="200" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" opacity="0.1" />

        {/* Secondary roads */}
        <line x1="0" y1="50" x2="400" y2="50" stroke="hsl(var(--muted-foreground))" strokeWidth="0.8" opacity="0.1" />
        <line x1="0" y1="150" x2="400" y2="150" stroke="hsl(var(--muted-foreground))" strokeWidth="0.8" opacity="0.1" />
        <line x1="100" y1="0" x2="100" y2="200" stroke="hsl(var(--muted-foreground))" strokeWidth="0.8" opacity="0.1" />
        <line x1="300" y1="0" x2="300" y2="200" stroke="hsl(var(--muted-foreground))" strokeWidth="0.8" opacity="0.1" />

        {variant === "demand" && (
          <>
            <circle cx="120" cy="70" r="25" fill="hsl(var(--destructive))" opacity="0.1" />
            <circle cx="120" cy="70" r="12" fill="hsl(var(--destructive))" opacity="0.18" />
            <circle cx="280" cy="120" r="30" fill="hsl(var(--primary))" opacity="0.1" />
            <circle cx="280" cy="120" r="15" fill="hsl(var(--primary))" opacity="0.18" />
            <circle cx="180" cy="150" r="20" fill="hsl(var(--success))" opacity="0.12" />
            <circle cx="180" cy="150" r="10" fill="hsl(var(--success))" opacity="0.22" />
            <circle cx="330" cy="50" r="18" fill="hsl(var(--warning))" opacity="0.12" />
            <circle cx="70" cy="140" r="22" fill="hsl(var(--destructive))" opacity="0.08" />
            <circle cx="120" cy="70" r="4" fill="hsl(var(--destructive))" />
            <circle cx="280" cy="120" r="4" fill="hsl(var(--primary))" />
            <circle cx="180" cy="150" r="3" fill="hsl(var(--success))" />
            <circle cx="330" cy="50" r="3" fill="hsl(var(--warning))" />
            <circle cx="70" cy="140" r="3" fill="hsl(var(--destructive))" />
          </>
        )}

        {variant === "route" && (
          <>
            <path
              d="M 80 160 Q 120 120 180 100 Q 240 80 300 60 Q 340 45 360 40"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="3"
              strokeDasharray="8 4"
              opacity="0.6"
            />
            <circle cx="80" cy="160" r="6" fill="hsl(var(--primary))" opacity="0.8" />
            <circle cx="80" cy="160" r="3" fill="hsl(var(--card))" />
            <circle cx="360" cy="40" r="8" fill="hsl(var(--destructive))" opacity="0.8" />
            <circle cx="360" cy="40" r="4" fill="hsl(var(--card))" />
            <circle cx="180" cy="100" r="5" fill="hsl(var(--primary))">
              <animate attributeName="cx" values="80;180;360" dur="3s" repeatCount="indefinite" />
              <animate attributeName="cy" values="160;100;40" dur="3s" repeatCount="indefinite" />
            </circle>
          </>
        )}

        {variant === "location" && (
          <>
            {/* Location pin — styled like reference brown pin */}
            <circle cx="200" cy="85" r="22" fill="hsl(var(--primary))" opacity="0.08" />
            <circle cx="200" cy="85" r="12" fill="hsl(var(--primary))" opacity="0.15" />
            {/* Pin shape */}
            <path d="M200 65 C190 65 183 72 183 82 C183 95 200 108 200 108 C200 108 217 95 217 82 C217 72 210 65 200 65Z" fill="hsl(var(--primary))" opacity="0.85" />
            <circle cx="200" cy="80" r="5" fill="hsl(var(--card))" />
            {/* Nearby dots */}
            <circle cx="140" cy="60" r="3" fill="hsl(var(--success))" opacity="0.6" />
            <circle cx="260" cy="130" r="3" fill="hsl(var(--success))" opacity="0.6" />
            <circle cx="310" cy="70" r="3" fill="hsl(var(--warning))" opacity="0.6" />
          </>
        )}

        {variant === "eta" && (
          <>
            <path
              d="M 60 170 Q 100 140 160 110 Q 220 80 290 55 Q 340 40 370 35"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="4"
              opacity="0.5"
            />
            <path
              d="M 60 170 Q 100 140 160 110 Q 220 80 290 55 Q 340 40 370 35"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              opacity="0.8"
            />
            <circle cx="60" cy="170" r="8" fill="hsl(var(--primary))" opacity="0.2" />
            <circle cx="60" cy="170" r="5" fill="hsl(var(--primary))" />
            <circle cx="60" cy="170" r="2.5" fill="hsl(var(--card))" />
            <circle cx="370" cy="35" r="10" fill="hsl(var(--destructive))" opacity="0.2" />
            <circle cx="370" cy="35" r="6" fill="hsl(var(--destructive))" />
            <circle cx="370" cy="35" r="3" fill="hsl(var(--card))" />
            <circle r="6" fill="hsl(var(--primary))">
              <animate attributeName="cx" values="60;160;370" dur="2.5s" repeatCount="indefinite" />
              <animate attributeName="cy" values="170;110;35" dur="2.5s" repeatCount="indefinite" />
            </circle>
            <rect x="145" y="130" rx="12" ry="12" width="110" height="50" fill="hsl(var(--card))" opacity="0.92" stroke="hsl(var(--border))" strokeWidth="0.5" />
            <text x="200" y="152" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="20" fontWeight="800" fontFamily="system-ui">8 min</text>
            <text x="200" y="170" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10" fontWeight="500" fontFamily="system-ui">ETA</text>
          </>
        )}

        {variant === "coverage" && (
          <>
            <polygon
              points="100,40 300,30 360,90 340,170 180,180 80,140"
              fill="hsl(var(--primary))"
              opacity="0.06"
            />
            <polygon
              points="100,40 300,30 360,90 340,170 180,180 80,140"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="1.5"
              strokeDasharray="6 3"
              opacity="0.25"
            />
            <polygon
              points="140,60 270,55 310,100 290,150 190,155 120,120"
              fill="hsl(var(--primary))"
              opacity="0.04"
            />
            <circle cx="160" cy="80" r="4" fill="hsl(var(--success))" opacity="0.7" />
            <circle cx="250" cy="70" r="3.5" fill="hsl(var(--success))" opacity="0.6" />
            <circle cx="300" cy="120" r="3" fill="hsl(var(--warning))" opacity="0.7" />
            <circle cx="200" cy="140" r="4" fill="hsl(var(--success))" opacity="0.6" />
            <circle cx="130" cy="120" r="3" fill="hsl(var(--warning))" opacity="0.5" />
            <circle cx="270" cy="150" r="3.5" fill="hsl(var(--success))" opacity="0.7" />
            <circle cx="200" cy="100" r="14" fill="hsl(var(--primary))" opacity="0.1">
              <animate attributeName="r" values="14;20;14" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.1;0.05;0.1" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="200" cy="100" r="7" fill="hsl(var(--primary))" opacity="0.3" />
            <circle cx="200" cy="100" r="4" fill="hsl(var(--primary))" />
          </>
        )}
      </svg>

      {/* Pin label overlay */}
      {pinLabel && (
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 bg-card/92 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-soft">
          <div className="h-2 w-2 rounded-full bg-primary" />
          <span className="text-[10px] font-semibold text-foreground">{pinLabel}</span>
        </div>
      )}
    </div>
  );
}
