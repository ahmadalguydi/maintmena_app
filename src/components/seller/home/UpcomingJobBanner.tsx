import React, { useState, useEffect, useMemo, useRef } from 'react';
import { EditJobPriceSheet } from './EditJobPriceSheet';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin, Clock, ChevronUp, User, AlertTriangle, Zap,
    Calendar, Timer, Phone, MessageCircle, Target, Flame,
    ArrowRight, MoreVertical, X, Navigation2, Ban, Edit3, Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { MAPBOX_TOKEN } from '@/lib/mapbox';

interface UpcomingJobBannerProps {
    currentLanguage: 'en' | 'ar';
    id: string;
    serviceType?: string;
    description?: string;
    scheduledAt: string;
    location?: string;
    lat?: number;
    lng?: number;
    buyerName?: string;
    buyerPhone?: string;
    sellerPricing?: any;
    commitmentType: 'soft' | 'hard';
    distance?: number;
    onEdit?: () => void;
    onCancel?: () => void;
    onEditPrice?: (jobId: string, pricing: any) => void;
    onMessage?: () => void;
    onCall?: () => void;
    onClick?: () => void;
    onEnterFocusMode?: () => void;
    onReschedule?: () => void;
}

const SERVICE_CONFIG: Record<string, { emoji: string; tint: string }> = {
    'plumbing': { emoji: '🔧', tint: '#e0f0ff' },
    'Plumbing': { emoji: '🔧', tint: '#e0f0ff' },
    'electrical': { emoji: '⚡', tint: '#fff8e0' },
    'Electrical': { emoji: '⚡', tint: '#fff8e0' },
    'ac': { emoji: '❄️', tint: '#e0f4ff' },
    'AC': { emoji: '❄️', tint: '#e0f4ff' },
    'AC Maintenance': { emoji: '❄️', tint: '#e0f4ff' },
    'painting': { emoji: '🎨', tint: '#f0e0ff' },
    'Painting': { emoji: '🎨', tint: '#f0e0ff' },
    'cleaning': { emoji: '🧹', tint: '#e0ffe0' },
    'Cleaning': { emoji: '🧹', tint: '#e0ffe0' },
    'carpentry': { emoji: '🪚', tint: '#fff0e0' },
    'Carpentry': { emoji: '🪚', tint: '#fff0e0' },
    'appliance': { emoji: '🔌', tint: '#e8e0ff' },
};

export function UpcomingJobBanner({
    currentLanguage,
    id,
    serviceType,
    description,
    scheduledAt,
    location,
    lat,
    lng,
    buyerName,
    buyerPhone,
    sellerPricing,
    commitmentType,
    distance,
    onEdit,
    onCancel,
    onEditPrice,
    onMessage,
    onCall,
    onClick,
    onEnterFocusMode,
    onReschedule,
}: UpcomingJobBannerProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showEditSheet, setShowEditSheet] = useState(false);
    const [now, setNow] = useState(new Date());
    const menuRef = useRef<HTMLDivElement>(null);
    const isRTL = currentLanguage === 'ar';

    // Tick every 20s for live countdown
    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 20000);
        return () => clearInterval(interval);
    }, []);

    // Close menu on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowMenu(false);
            }
        };
        if (showMenu) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showMenu]);

    const t = useMemo(() => ({
        ar: {
            scheduled: 'مجدول',
            confirmed: 'مؤكد',
            today: 'اليوم',
            tomorrow: 'غداً',
            asap: 'بأقرب وقت',
            startingSoon: 'يبدأ الآن!',
            min: 'د',
            hr: 'س',
            focusMode: 'وضع التركيز',
            focusRequired: 'ادخل وضع التركيز',
            tapToExpand: 'اضغط لعرض الخريطة',
            tapToCollapse: 'اضغط للإغلاق',
            client: 'العميل',
            contact: 'تواصل',
            readyToGo: 'حان وقت البداية!',
            prepareAlert: 'استعد — على وشك البدء',
            cancel: 'إلغاء المهمة',
            reschedule: 'إعادة جدولة',
            editDetails: 'تعديل السعر',
            setReminder: 'تعيين تذكير',
            freeInspection: 'معاينة مجانية',
            myPrice: 'سعري',
            sar: 'ريال',
        },
        en: {
            scheduled: 'SCHEDULED',
            confirmed: 'Confirmed',
            today: 'Today',
            tomorrow: 'Tomorrow',
            asap: 'ASAP',
            startingSoon: 'Starting now!',
            min: 'min',
            hr: 'hr',
            focusMode: 'Focus Mode',
            focusRequired: 'Enter Focus Mode',
            tapToExpand: 'Tap to view map',
            tapToCollapse: 'Tap to collapse',
            client: 'Client',
            contact: 'Contact',
            readyToGo: 'Time to go!',
            prepareAlert: 'Get ready — starting soon',
            cancel: 'Cancel Job',
            reschedule: 'Reschedule',
            editDetails: 'Edit Price',
            setReminder: 'Set Reminder',
            freeInspection: 'Free Inspection',
            myPrice: 'My Price',
            sar: 'SAR',
        },
    }), [])[currentLanguage];

    // Config
    const config = serviceType ? SERVICE_CONFIG[serviceType] : undefined;
    const emoji = config?.emoji || '🛠️';
    const tint = config?.tint || '#f6ede6';

    // Time calculations
    const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
    const isValidDate = scheduledDate && !isNaN(scheduledDate.getTime());
    const diffMs = isValidDate ? scheduledDate.getTime() - now.getTime() : null;
    const diffMinutes = diffMs !== null ? Math.max(0, Math.floor(diffMs / 60000)) : null;

    type Urgency = 'critical' | 'warning' | 'normal';
    const urgency: Urgency = diffMinutes !== null && diffMinutes <= 30
        ? 'critical'
        : diffMinutes !== null && diffMinutes <= 120
            ? 'warning'
            : 'normal';

    const isForcedFocus = urgency === 'critical';
    const showFocusButton = urgency !== 'normal';

    // Time remaining text
    const timeText = useMemo(() => {
        if (diffMinutes === null) return t.asap;
        if (diffMinutes <= 0) return t.startingSoon;
        if (diffMinutes < 60) return `${diffMinutes}${t.min}`;
        const hrs = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        return mins > 0 ? `${hrs}${t.hr} ${mins}${t.min}` : `${hrs}${t.hr}`;
    }, [diffMinutes, t]);

    // Formatted date
    const displayDate = useMemo(() => {
        if (!isValidDate) return t.asap;
        const todayStr = now.toDateString();
        const tmrw = new Date(now); tmrw.setDate(tmrw.getDate() + 1);
        const timeStr = scheduledDate!.toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' });
        if (scheduledDate!.toDateString() === todayStr) return `${t.today}, ${timeStr}`;
        if (scheduledDate!.toDateString() === tmrw.toDateString()) return `${t.tomorrow}, ${timeStr}`;
        try {
            return format(scheduledDate!, 'EEE, MMM d · h:mm a', { locale: isRTL ? ar : enUS });
        } catch { return timeStr; }
    }, [scheduledDate, now, isRTL, t, isValidDate]);

    // Map
    const mapLat = lat || 24.7136;
    const mapLng = lng || 46.6753;
    const staticMapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/${mapLng},${mapLat},14,0/600x300@2x?access_token=${MAPBOX_TOKEN}`;

    // Urgency styles
    const urgencyStyles = {
        critical: {
            border: 'border-red-400/70 dark:border-red-500/50',
            ring: 'ring-2 ring-red-400/20',
            headerBg: 'from-red-500/8 via-primary/5 to-background',
            countdownBg: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
            alertBg: 'bg-red-50 dark:bg-red-950/30 border border-red-200/50 dark:border-red-800/30',
            alertText: 'text-red-700 dark:text-red-300',
            buttonBg: 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 shadow-red-500/25',
        },
        warning: {
            border: 'border-amber-400/60 dark:border-amber-500/40',
            ring: 'ring-1 ring-amber-400/15',
            headerBg: 'from-amber-500/8 via-primary/5 to-background',
            countdownBg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
            alertBg: 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/30',
            alertText: 'text-amber-700 dark:text-amber-300',
            buttonBg: 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 shadow-amber-500/25',
        },
        normal: {
            border: 'border-border/40',
            ring: '',
            headerBg: 'from-primary/10 via-primary/5 to-background',
            countdownBg: 'bg-primary/10 text-primary',
            alertBg: '',
            alertText: '',
            buttonBg: 'bg-primary hover:bg-primary/90',
        },
    };
    const s = urgencyStyles[urgency];

    // Menu items
    const menuItems = [
        { icon: Edit3, label: t.editDetails, action: () => setShowEditSheet(true), color: 'text-foreground' },
        { icon: Calendar, label: t.reschedule, action: onReschedule, color: 'text-foreground' },
        { icon: Bell, label: t.setReminder, action: () => { }, color: 'text-foreground' },
        { icon: Ban, label: t.cancel, action: onCancel, color: 'text-red-600 dark:text-red-400' },
    ];

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
                "rounded-3xl bg-card overflow-hidden transition-all duration-300 border",
                s.border, s.ring,
                "shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]"
            )}
            dir={isRTL ? 'rtl' : 'ltr'}
        >
            {/* ═══ Expandable Map Header ═══ */}
            <motion.div
                className={cn(
                    "relative overflow-hidden cursor-pointer bg-gradient-to-br",
                    s.headerBg
                )}
                animate={{ height: isExpanded ? 200 : 100 }}
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {/* Collapsed: Grid pattern */}
                <motion.div
                    className="absolute inset-0"
                    animate={{ opacity: isExpanded ? 0 : 0.35 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="absolute inset-0" style={{
                        backgroundImage: `linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
                                          linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)`,
                        backgroundSize: '36px 36px',
                    }} />
                </motion.div>

                {/* Expanded: Mapbox static map */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            className="absolute inset-0 pointer-events-none"
                            initial={{ opacity: 0, filter: 'blur(4px)' }}
                            animate={{ opacity: 1, filter: 'blur(0px)' }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <img src={staticMapUrl} alt="Location" className="w-full h-full object-cover" />
                            {/* Location pin overlay */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="absolute w-24 h-24 rounded-full bg-primary/10 border-2 border-primary/25 animate-pulse" />
                                <div className="absolute w-12 h-12 rounded-full bg-primary/15 border border-primary/35" />
                                <div className="relative w-3.5 h-3.5 rounded-full bg-primary shadow-lg shadow-primary/50 border-2 border-white/80" />
                            </div>
                            {/* Bottom fade */}
                            <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent opacity-60" />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Collapsed: Center pin */}
                <motion.div
                    className="absolute inset-0 flex items-center justify-center z-10"
                    animate={{ opacity: isExpanded ? 0 : 1 }}
                    transition={{ duration: 0.2 }}
                >
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-primary" />
                    </div>
                </motion.div>

                {/* Urgency badge — top left */}
                {urgency === 'critical' && (
                    <motion.div
                        className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                    >
                        <Flame className="h-3 w-3" />
                        {timeText}
                    </motion.div>
                )}
                {urgency === 'warning' && (
                    <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-amber-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                        <Timer className="h-3 w-3" />
                        {timeText}
                    </div>
                )}

                {/* Distance badge — bottom right */}
                {distance !== undefined && (
                    <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-card/90 backdrop-blur-sm rounded-full px-2.5 py-1 z-20">
                        <Navigation2 className="h-3 w-3 text-foreground" />
                        <span className="text-[11px] font-semibold text-foreground">{distance} km</span>
                    </div>
                )}

                {/* Expand/collapse hint */}
                <motion.div
                    className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-card/80 backdrop-blur-sm rounded-full px-2.5 py-1"
                >
                    <motion.div animate={{ rotate: isExpanded ? 0 : 180 }} transition={{ duration: 0.3 }}>
                        <ChevronUp className="h-3 w-3 text-muted-foreground" />
                    </motion.div>
                    <span className="text-[10px] font-medium text-muted-foreground">
                        {isExpanded ? t.tapToCollapse : t.tapToExpand}
                    </span>
                </motion.div>

                {/* Location label when expanded */}
                <AnimatePresence>
                    {isExpanded && location && (
                        <motion.div
                            className="absolute bottom-8 left-4 z-20"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.25, delay: 0.4 }}
                        >
                            <p className={cn(
                                "text-sm font-semibold text-foreground",
                                isRTL ? 'font-ar-display' : 'font-display'
                            )}>
                                {location}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* ═══ Content ═══ */}
            <div className="p-5">
                {/* Row 1: Service icon + info + three dots */}
                <div className="flex items-start gap-3.5 mb-3">
                    {/* Service icon */}
                    <div
                        className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
                        style={{ backgroundColor: tint }}
                    >
                        <span className="text-2xl">{emoji}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center gap-2 mb-0.5">
                            <h3 className={cn(
                                "font-bold text-base text-foreground leading-tight truncate",
                                isRTL ? 'font-ar-display' : 'font-display'
                            )}>
                                {serviceType || description || 'Service'}
                            </h3>
                            <span className={cn(
                                "shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold",
                                commitmentType === 'hard'
                                    ? "bg-green-100/80 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                                    : "bg-primary/10 text-primary"
                            )}>
                                {commitmentType === 'hard' ? `✓ ${t.confirmed}` : t.scheduled}
                            </span>
                        </div>
                        <p className="text-sm text-primary font-medium">{displayDate}</p>
                    </div>

                    {/* Price Right side */}
                    {sellerPricing && (
                        <div className="text-right shrink-0 flex flex-col justify-center gap-0.5">
                            {sellerPricing.type === 'fixed' && (
                                <div className="text-lg font-bold text-foreground tracking-tight">
                                    {sellerPricing.fixedPrice} <span className="text-xs text-muted-foreground">{t.sar}</span>
                                </div>
                            )}
                            {sellerPricing.type === 'range' && (
                                <div className="text-lg font-bold text-foreground tracking-tight">
                                    {sellerPricing.minPrice} - {sellerPricing.maxPrice} <span className="text-xs text-muted-foreground">{t.sar}</span>
                                </div>
                            )}
                            {sellerPricing.type === 'inspection' && (
                                <div className="text-sm font-bold text-foreground">
                                    {sellerPricing.freeInspection ? t.freeInspection : `${sellerPricing.inspectionFee} ${t.sar}`}
                                </div>
                            )}
                            <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider text-right">
                                {t.myPrice}
                            </div>
                        </div>
                    )}

                    {/* Three dots menu */}
                    <div className="relative shrink-0" ref={menuRef}>
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                            className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted/80 transition-colors"
                        >
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </button>

                        {/* Dropdown menu */}
                        <AnimatePresence>
                            {showMenu && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: -4 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: -4 }}
                                    transition={{ duration: 0.15 }}
                                    className={cn(
                                        "absolute top-9 z-50 w-48 bg-card rounded-2xl border border-border/60 shadow-xl overflow-hidden",
                                        isRTL ? 'left-0' : 'right-0'
                                    )}
                                >
                                    {menuItems.map((item, i) => (
                                        <button
                                            key={i}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowMenu(false);
                                                item.action?.();
                                            }}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-muted/60 transition-colors",
                                                item.color,
                                                i < menuItems.length - 1 && "border-b border-border/30",
                                                isRTL ? 'font-ar-body' : ''
                                            )}
                                        >
                                            <item.icon className="h-4 w-4 shrink-0" />
                                            {item.label}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Description */}
                {description && (
                    <p className={cn(
                        "text-sm text-muted-foreground line-clamp-2 mb-3 leading-relaxed",
                        isRTL ? 'font-ar-body' : ''
                    )}>
                        {description}
                    </p>
                )}

                {/* Location + time summary */}
                <div className="space-y-2 mb-4">
                    {location && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4 shrink-0 text-primary/70" strokeWidth={1.5} />
                            <span className={cn(isRTL ? 'font-ar-body' : '')}>{location}</span>
                        </div>
                    )}
                    {isValidDate && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4 shrink-0 text-primary/70" strokeWidth={1.5} />
                            <span className={cn(isRTL ? 'font-ar-body' : '')}>{displayDate}</span>
                        </div>
                    )}
                </div>

                {/* Buyer info */}
                {buyerName && (
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40 border border-border/30 mb-4">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{t.client}</span>
                            <p className={cn("text-sm font-semibold text-foreground", isRTL ? 'font-ar-body' : '')}>
                                {buyerName}
                            </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            {onMessage && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onMessage(); }}
                                    className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                                >
                                    <MessageCircle className="h-3.5 w-3.5 text-primary" />
                                </button>
                            )}
                            {buyerPhone && onCall && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onCall(); }}
                                    className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                                >
                                    <Phone className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Separator */}
                <div className="h-px bg-border/60 mb-4" />

                {/* Bottom row: urgency alert OR focus CTA */}
                {urgency !== 'normal' ? (
                    <div className="space-y-3">
                        {/* Alert bar */}
                        <div className={cn(
                            "flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm font-semibold",
                            s.alertBg, s.alertText
                        )}>
                            {urgency === 'critical'
                                ? <Flame className="w-4 h-4 shrink-0" />
                                : <AlertTriangle className="w-4 h-4 shrink-0" />
                            }
                            <span className={cn("flex-1", isRTL ? 'font-ar-body' : '')}>
                                {urgency === 'critical' ? t.readyToGo : t.prepareAlert}
                            </span>
                            <span className={cn("text-xs font-bold", s.alertText)}>
                                {timeText}
                            </span>
                        </div>

                        {/* Focus mode CTA */}
                        <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={(e) => { e.stopPropagation(); onEnterFocusMode?.(); }}
                            className={cn(
                                "w-full h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 text-white shadow-md transition-all",
                                s.buttonBg,
                                isRTL ? 'font-ar-heading' : 'font-display'
                            )}
                        >
                            <Target className="w-4 h-4" />
                            {isForcedFocus ? t.focusRequired : t.focusMode}
                            <ArrowRight className={cn("w-4 h-4", isRTL && 'rotate-180')} />
                        </motion.button>
                    </div>
                ) : (
                    /* Normal: just countdown badge + small info */
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {diffMinutes !== null && (
                                <div className={cn(
                                    "flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full",
                                    s.countdownBg
                                )}>
                                    <Timer className="h-3 w-3" />
                                    {timeText}
                                </div>
                            )}
                            <span className={cn(
                                "px-2.5 py-1 rounded-full text-[11px] font-medium bg-green-100/60 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                            )}>
                                ✓ {t.confirmed}
                            </span>
                        </div>
                        {onEnterFocusMode && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onEnterFocusMode(); }}
                                className={cn(
                                    "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm",
                                    isRTL ? 'font-ar-heading' : 'font-display'
                                )}
                            >
                                <Target className="w-3 h-3" />
                                {t.focusMode}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Edit Price Sheet */}
            <EditJobPriceSheet
                currentLanguage={currentLanguage}
                isOpen={showEditSheet}
                onClose={() => setShowEditSheet(false)}
                currentPricing={sellerPricing}
                onSave={(newPricing) => {
                    setShowEditSheet(false);
                    onEditPrice?.(id, newPricing);
                }}
            />
        </motion.div>
    );
}
