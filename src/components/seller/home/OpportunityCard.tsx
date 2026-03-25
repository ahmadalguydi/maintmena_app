import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Clock, Timer, Navigation2, Zap, ChevronRight, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MAPBOX_TOKEN } from '@/lib/mapbox';

interface OpportunityCardProps {
    currentLanguage: 'en' | 'ar';
    type: 'request' | 'booking';
    id: string;
    category: string;
    subCategory?: string;
    categoryIcon: React.ReactNode;
    title: string;
    description?: string;
    photos?: string[];
    location: string;
    locationDistrict?: string;
    lat?: number;
    lng?: number;
    distance?: number;
    urgency: 'urgent' | 'asap' | 'scheduled' | 'flexible';
    timing?: string;
    priceRange?: { min: number; max: number };
    priceExact?: number;
    buyerTags?: string[];
    expiresAt?: Date;
    waitlistPosition?: number;
    onAccept: (id: string) => void;
    onDecline?: (id: string) => void;
    onJoinWaitlist?: (id: string) => void;
}

export const OpportunityCard = React.forwardRef<HTMLDivElement, OpportunityCardProps>(({
    currentLanguage,
    id,
    type,
    category,
    subCategory,
    categoryIcon,
    title,
    description,
    photos,
    location,
    locationDistrict,
    lat,
    lng,
    distance,
    urgency,
    timing,
    priceRange,
    priceExact,
    buyerTags = [],
    expiresAt,
    waitlistPosition,
    onAccept,
    onDecline,
    onJoinWaitlist,
}, ref) => {
    const [isMapExpanded, setIsMapExpanded] = useState(false);

    const content = {
        ar: {
            accept: 'قبول',
            decline: 'رفض',
            joinWaitlist: 'انضم للقائمة',
            urgentFix: 'عاجل',
            asap: 'ASAP',
            earliest: 'الأقرب',
            km: 'كم',
            away: 'away',
            fastPayer: 'دفع سريع',
            inLine: 'في القائمة',
            tapToExpand: 'اضغط لعرض الخريطة',
            tapToCollapse: 'اضغط للإغلاق',
        },
        en: {
            accept: 'Accept',
            decline: 'Decline',
            joinWaitlist: 'Join Waitlist',
            urgentFix: 'URGENT FIX',
            asap: 'ASAP',
            earliest: 'Earliest',
            km: 'km',
            away: 'away',
            fastPayer: 'Fast Payer',
            inLine: 'in waitlist',
            tapToExpand: 'Tap to view map',
            tapToCollapse: 'Tap to collapse',
        },
    };

    const t = content[currentLanguage];
    const isUrgent = urgency === 'urgent';
    const isAsap = urgency === 'asap' || timing?.toLowerCase().includes('earliest') || timing?.toLowerCase().includes('asap');

    // Calculate time remaining for timer badge
    const getTimeRemaining = () => {
        if (!expiresAt) return null;
        const now = new Date();
        const diff = expiresAt.getTime() - now.getTime();
        if (diff <= 0) return null;
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const timeRemaining = getTimeRemaining();

    const handleMapToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMapExpanded(!isMapExpanded);
    };

    const mapLat = lat || 24.7136;
    const mapLng = lng || 46.6753;
    // Zoom 12 = neighbourhood level — hides exact address, shows general area
    const staticMapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/${mapLng},${mapLat},12,0/600x300@2x?access_token=${MAPBOX_TOKEN}`;

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ 
                opacity: 0, 
                x: currentLanguage === 'ar' ? 80 : -80, 
                scale: 0.92, 
                filter: 'blur(6px)',
                transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] }
            }}
            layout
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className={cn(
                "rounded-3xl bg-card overflow-hidden cursor-pointer transition-all duration-300 border border-border/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-0.5",
                isUrgent && "ring-2 ring-destructive/30 animate-pulse-border",
                isAsap && !isUrgent && "animate-pulse-border"
            )}
        >
            {/* Expandable Map Header */}
            <motion.div
                className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-background overflow-hidden cursor-pointer"
                animate={{ height: isMapExpanded ? 220 : 112 }}
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                onClick={handleMapToggle}
            >
                {/* Collapsed: Simple grid pattern + pin */}
                <motion.div
                    className="absolute inset-0"
                    animate={{ opacity: isMapExpanded ? 0 : 0.4 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="absolute inset-0" style={{
                        backgroundImage: `linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
                                          linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)`,
                        backgroundSize: '40px 40px'
                    }} />
                </motion.div>

                {/* Expanded: Mapbox static image */}
                <AnimatePresence>
                    {isMapExpanded && (
                        <motion.div
                            className="absolute inset-0 pointer-events-none"
                            initial={{ opacity: 0, filter: 'blur(4px)' }}
                            animate={{ opacity: 1, filter: 'blur(0px)' }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <img
                                src={staticMapUrl}
                                alt="Location Area"
                                className="w-full h-full object-cover"
                            />
                            {/* Radius circle overlay — approximate area, not exact pin */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                {/* Outer pulsing glow ring */}
                                <div className="absolute w-32 h-32 rounded-full bg-primary/10 border-2 border-primary/25 animate-pulse" />
                                {/* Mid filled circle */}
                                <div className="absolute w-16 h-16 rounded-full bg-primary/15 border border-primary/35" />
                                {/* Centre dot */}
                                <div className="relative w-3.5 h-3.5 rounded-full bg-primary shadow-lg shadow-primary/50 border-2 border-white/80" />
                            </div>
                            {/* Bottom fade */}
                            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-60" />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Center pin – visible when collapsed */}
                <motion.div
                    className="absolute inset-0 flex items-center justify-center z-10"
                    animate={{ opacity: isMapExpanded ? 0 : 1 }}
                    transition={{ duration: 0.2 }}
                >
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-primary" />
                    </div>
                </motion.div>

                {/* Urgent Badge */}
                {isUrgent && (
                    <Badge className="absolute top-3 left-3 bg-destructive text-destructive-foreground text-[10px] font-bold px-2.5 py-1 gap-1 rounded-full z-20">
                        <Zap className="h-3 w-3 fill-current" />
                        {t.urgentFix}
                    </Badge>
                )}

                {/* Distance Badge */}
                {distance !== undefined && (
                    <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-card/90 backdrop-blur-sm rounded-full px-2.5 py-1 z-20">
                        <Navigation2 className="h-3 w-3 text-foreground" />
                        <span className="text-[11px] font-semibold text-foreground">{distance} {t.km} {t.away}</span>
                    </div>
                )}

                {/* Expand/Collapse hint */}
                <motion.div
                    className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-card/80 backdrop-blur-sm rounded-full px-2.5 py-1"
                    animate={{ opacity: 1 }}
                >
                    <motion.div animate={{ rotate: isMapExpanded ? 0 : 180 }} transition={{ duration: 0.3 }}>
                        <ChevronUp className="h-3 w-3 text-muted-foreground" />
                    </motion.div>
                    <span className="text-[10px] font-medium text-muted-foreground">
                        {isMapExpanded ? t.tapToCollapse : t.tapToExpand}
                    </span>
                </motion.div>

                {/* Location label when expanded */}
                <AnimatePresence>
                    {isMapExpanded && (
                        <motion.div
                            className="absolute bottom-8 left-4 z-20"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.25, delay: 0.4 }}
                        >
                            <p className={cn(
                                "text-sm font-semibold text-foreground",
                                currentLanguage === 'ar' ? 'font-ar-display' : 'font-display'
                            )}>
                                {locationDistrict ? `${locationDistrict}, ${location}` : location}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Content */}
            <div className="p-5">
                {/* Service icon + info + Price */}
                <div className="flex items-start gap-4 mb-3">
                    {/* Service icon in tinted circle */}
                    <div className="h-12 w-12 rounded-2xl bg-[#f6ede6] flex items-center justify-center shrink-0 shadow-sm">
                        <span className="text-2xl">{categoryIcon}</span>
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                        <h3 className={cn(
                            "font-bold text-lg text-foreground leading-tight mb-1",
                            currentLanguage === 'ar' ? 'font-ar-display' : 'font-display'
                        )}>
                            {title}
                        </h3>
                        {subCategory && (
                            <p className="text-[15px] font-semibold text-foreground/80">{subCategory}</p>
                        )}
                        {description && (
                            <p className="text-[13.5px] text-muted-foreground mt-1 line-clamp-2 leading-snug">
                                {description.startsWith(subCategory || '') 
                                  ? description.substring((subCategory || '').length).replace(/^[\s-:]+/, '') 
                                  : description}
                            </p>
                        )}
                    </div>
                    {(priceRange || priceExact !== undefined) && (
                        <div className="text-right shrink-0 flex flex-col justify-center">
                            <div className="flex items-baseline justify-end gap-1">
                                <span className="text-xl font-extrabold text-foreground tracking-tight">
                                    {priceRange ? `${priceRange.min} - ${priceRange.max}` : priceExact}
                                </span>
                                <span className="text-xs font-bold text-muted-foreground">SAR</span>
                            </div>
                            {priceRange && (
                                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider text-right">
                                    {currentLanguage === 'ar' ? 'الميزانية المتوقعة' : 'Est. Budget'}
                                </span>
                            )}
                        </div>
                    )}
                </div>


                {/* Photos */}
                {photos && photos.length > 0 && (
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2 -mx-1 px-1 custom-scrollbar">
                        {photos.map((photo, index) => (
                            <img
                                key={index}
                                src={photo}
                                alt={`Request photo ${index + 1}`}
                                className="h-20 w-20 object-cover rounded-xl border border-border/50 shrink-0"
                            />
                        ))}
                    </div>
                )}

                {/* Location + timing */}
                <div className="space-y-2 mb-5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 shrink-0 text-primary/70" strokeWidth={1.5} />
                        <span className={cn(currentLanguage === 'ar' ? 'font-ar-body' : 'font-body')}>
                            {locationDistrict ? `${locationDistrict}, ${location}` : location}
                        </span>
                    </div>
                    {timing && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4 shrink-0 text-primary/70" strokeWidth={1.5} />
                            <span className={cn(currentLanguage === 'ar' ? 'font-ar-body' : 'font-body')}>
                                {timing}
                            </span>
                        </div>
                    )}
                </div>

                {/* Separator */}
                <div className="h-px bg-border/60 mb-4" />

                {/* Tags + Action row */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                        {buyerTags.map((tag, index) => (
                            <div key={index} className="flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1">
                                <span className="text-[10px]">💸</span>
                                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">{tag}</span>
                            </div>
                        ))}
                        {timeRemaining && (
                            <div className={cn(
                                "flex items-center gap-1.5 text-[11px] font-bold bg-muted/50 px-2.5 py-1 rounded-full border border-border/50",
                                parseInt(timeRemaining.split(':')[0]) < 3 ? "text-destructive bg-destructive/5 border-destructive/20" : "text-muted-foreground"
                            )}>
                                <Timer className="h-3 w-3" />
                                {timeRemaining}
                            </div>
                        )}
                        {waitlistPosition !== undefined && (
                            <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                                #{waitlistPosition} {t.inLine}
                            </span>
                        )}
                    </div>

                    {waitlistPosition === undefined && (
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            {onDecline && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-10 px-6 text-sm font-bold rounded-full border-2 border-muted hover:bg-destructive/5 hover:text-destructive hover:border-destructive/20 transition-all duration-300"
                                    onClick={() => onDecline(id)}
                                >
                                    {t.decline}
                                </Button>
                            )}
                            {onJoinWaitlist && !onAccept && (
                                <Button
                                    size="sm"
                                    className="h-10 px-6 text-sm font-bold rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 border-none shadow-sm hover:shadow-md transition-all duration-300"
                                    onClick={() => onJoinWaitlist(id)}
                                >
                                    {t.joinWaitlist}
                                </Button>
                            )}
                            {onAccept && (
                                <Button
                                    size="sm"
                                    className="h-10 px-6 text-sm font-bold rounded-full bg-primary text-primary-foreground hover:bg-primary/90 border-none shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300 gap-1.5"
                                    onClick={() => onAccept(id)}
                                >
                                    {t.accept}
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>

        </motion.div>
    );
});

OpportunityCard.displayName = 'OpportunityCard';
