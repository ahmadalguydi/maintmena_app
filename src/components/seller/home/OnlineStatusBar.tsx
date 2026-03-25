import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Clock, Navigation, Wrench, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

type StatusBarMode = 'online' | 'offline' | 'accepted' | 'en_route' | 'arrived' | 'in_progress';

const normalizeSellerStatusBarMode = (activeJobStatus?: string | null): StatusBarMode | null => {
    if (!activeJobStatus) return null;

    const status = activeJobStatus.toLowerCase();

    if (status === 'accepted' || status === 'confirmed' || status === 'seller_assigned') {
        return 'accepted';
    }

    if (status === 'en_route' || status === 'in_route' || status === 'on_the_way') {
        return 'en_route';
    }

    if (status === 'arrived') {
        return 'arrived';
    }

    if (status === 'in_progress' || status === 'working' || status === 'seller_marked_complete') {
        return 'in_progress';
    }

    return null;
};

interface OnlineStatusBarProps {
    currentLanguage: 'en' | 'ar';
    isOnline: boolean;
    onToggle: () => void;
    timeOnline?: number; // in minutes
    weeklyEarnings?: number;
    /** Active job status — drives the bar into mission mode */
    activeJobStatus?: string;
    /** ETA in minutes for en_route state */
    eta?: number;
    /** Elapsed time in minutes for in_progress state */
    elapsedMin?: number;
    /** Callback when bar is tapped in mission states */
    onMissionTap?: () => void;
}

// ─── STATE CONFIG ───────────────────────────────────────────────────
const STATE_CONFIG: Record<StatusBarMode, {
    bg: string;
    dotColor: string;
    textColor: string;
    subtitleColor: string;
}> = {
    online: {
        bg: 'bg-[#1E110A]',
        dotColor: 'bg-emerald-500',
        textColor: 'text-white',
        subtitleColor: 'text-muted-foreground',
    },
    offline: {
        bg: 'bg-[#18181A]',
        dotColor: 'bg-muted-foreground/50',
        textColor: 'text-muted-foreground',
        subtitleColor: 'text-muted-foreground/60',
    },
    accepted: {
        bg: 'bg-[#1E110A]',
        dotColor: 'bg-amber-500',
        textColor: 'text-white',
        subtitleColor: 'text-muted-foreground',
    },
    en_route: {
        bg: 'bg-[#0B1A10]',
        dotColor: 'bg-emerald-400',
        textColor: 'text-white',
        subtitleColor: 'text-emerald-500',
    },
    arrived: {
        bg: 'bg-[#0B1426]',
        dotColor: 'bg-blue-400',
        textColor: 'text-white',
        subtitleColor: 'text-blue-500',
    },
    in_progress: {
        bg: 'bg-[#111624]',
        dotColor: 'bg-slate-300',
        textColor: 'text-white',
        subtitleColor: 'text-muted-foreground',
    },
};

export function OnlineStatusBar({
    currentLanguage,
    isOnline,
    onToggle,
    timeOnline = 0,
    weeklyEarnings = 0,
    activeJobStatus,
    eta,
    elapsedMin,
    onMissionTap,
}: OnlineStatusBarProps) {
    const [isAnimating, setIsAnimating] = useState(false);
    const [liveElapsed, setLiveElapsed] = useState(elapsedMin || 0);

    // Live timer for in_progress
    useEffect(() => {
        setLiveElapsed(elapsedMin || 0);
    }, [elapsedMin]);

    useEffect(() => {
        if (mode !== 'in_progress') return;
        const interval = setInterval(() => {
            setLiveElapsed(prev => prev + 1);
        }, 60_000);
        return () => clearInterval(interval);
    }, [activeJobStatus]);

    // Derive the mode
    const mode: StatusBarMode = normalizeSellerStatusBarMode(activeJobStatus) ?? (isOnline ? 'online' : 'offline');

    const isMissionMode = ['accepted', 'en_route', 'arrived', 'in_progress'].includes(mode);
    const config = STATE_CONFIG[mode];

    const content = {
        ar: {
            online: 'متصل',
            offline: 'غير متصل',
            accepted: 'تم القبول',
            en_route: 'في الطريق',
            arrived: 'وصلت',
            in_progress: 'جاري التنفيذ',
            acceptingSub: 'جاهز لاستقبال الطلبات',
            tapToGoOnline: 'اضغط للاتصال',
            notAccepting: 'لا يتم قبول طلبات جديدة',
            startNavigation: 'اضغط لبدء التنقل',
            readyToWork: 'جاهز لبدء العمل',
            eta: 'الوصول خلال',
            elapsed: '~',
            min: 'د',
            active: 'نشط',
        },
        en: {
            online: 'Online',
            offline: 'Offline',
            accepted: 'Job Accepted',
            en_route: 'En Route',
            arrived: 'Arrived',
            in_progress: 'In Progress',
            acceptingSub: 'Accepting jobs near you',
            tapToGoOnline: 'Tap to go online',
            notAccepting: 'Not accepting new jobs',
            startNavigation: 'Tap to start navigation',
            readyToWork: 'Ready to start work',
            eta: 'ETA',
            elapsed: '~',
            min: 'min',
            active: 'Active',
        },
    };

    const t = content[currentLanguage];

    const getTitle = (): string => {
        switch (mode) {
            case 'accepted': return t.accepted;
            case 'en_route': return t.en_route;
            case 'arrived': return t.arrived;
            case 'in_progress': return t.in_progress;
            case 'online': return t.online;
            default: return t.offline;
        }
    };

    const getSubtitle = (): string => {
        switch (mode) {
            case 'accepted': return t.startNavigation;
            case 'en_route': return t.notAccepting;
            case 'arrived': return t.readyToWork;
            case 'in_progress': return t.notAccepting;
            case 'online': return t.acceptingSub;
            default: return t.tapToGoOnline;
        }
    };

    const getRightContent = () => {
        switch (mode) {
            case 'online':
                return (
                    <div className="flex items-center gap-2">
                        {/* Active badge */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            <span className="text-[11px] font-semibold text-emerald-400">{t.active}</span>
                        </div>
                    </div>
                );
            case 'accepted':
                return (
                    <motion.div
                        animate={{ x: [0, 3, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        <Navigation className="h-5 w-5 text-amber-400" />
                    </motion.div>
                );
            case 'en_route':
                return (
                    <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/5">
                        <span className="text-[11px] font-bold text-emerald-300">{t.eta} {eta || '...'} {t.min}</span>
                    </div>
                );
            case 'arrived':
                return (
                    <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/5">
                        <MapPin className="h-3.5 w-3.5 text-blue-300" />
                        <span className="text-[11px] font-bold text-blue-300">{t.arrived}</span>
                    </div>
                );
            case 'in_progress':
                return (
                    <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/5">
                        <Clock className="h-3.5 w-3.5 text-sky-300" />
                        <span className="text-[11px] font-bold text-sky-300 tabular-nums">{t.elapsed}{liveElapsed} {t.min}</span>
                    </div>
                );
            default:
                return null;
        }
    };

    const handleToggle = () => {
        setIsAnimating(true);
        onToggle();
        setTimeout(() => setIsAnimating(false), 600);
    };

    const handleBarTap = () => {
        if (isMissionMode && onMissionTap) {
            onMissionTap();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative"
            layout
        >
            <motion.div
                layout
                onClick={isMissionMode ? handleBarTap : undefined}
                className={cn(
                    "relative flex items-center justify-between rounded-[22px] px-4 py-3.5 transition-colors duration-500 overflow-hidden",
                    config.bg,
                    isMissionMode && "cursor-pointer active:scale-[0.98]",
                )}
            >
                {/* Left side: Toggle (online/offline) or Dot (mission) + Text */}
                <div className="flex items-center gap-3 relative z-10">
                    {/* Online mode: toggle switch */}
                    {!isMissionMode ? (
                        <button
                            onClick={handleToggle}
                            disabled={isAnimating}
                            className={cn(
                                "relative h-8 w-14 rounded-full transition-all duration-500 focus:outline-none shrink-0",
                                isOnline
                                    ? "bg-emerald-500 shadow-lg shadow-emerald-500/30"
                                    : "bg-muted"
                            )}
                        >
                            <motion.div
                                animate={{
                                    x: currentLanguage === 'ar'
                                        ? (isOnline ? 2 : 26)
                                        : (isOnline ? 26 : 2),
                                }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                className={cn(
                                    "absolute top-1 h-6 w-6 rounded-full flex items-center justify-center",
                                    isOnline ? "bg-white shadow-md" : "bg-card shadow"
                                )}
                            >
                                <AnimatePresence mode="wait">
                                    {isOnline ? (
                                        <motion.div key="on" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                            <Wifi className="h-3 w-3 text-emerald-600" />
                                        </motion.div>
                                    ) : (
                                        <motion.div key="off" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                            <WifiOff className="h-3 w-3 text-muted-foreground" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        </button>
                    ) : (
                        /* Mission mode: pulsing status dot */
                        <div className="relative shrink-0">
                            <motion.div
                                animate={{ scale: [1, 1.15, 1], opacity: [1, 0.8, 1] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                className={cn("h-3 w-3 rounded-full", config.dotColor)}
                            />
                            {/* Pulse ring */}
                            <motion.div
                                animate={{ scale: [1, 2.5], opacity: [0.4, 0] }}
                                transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                                className={cn("absolute inset-0 h-3 w-3 rounded-full", config.dotColor)}
                            />
                        </div>
                    )}

                    {/* Status text */}
                    <div className="flex flex-col">
                        <AnimatePresence mode="wait">
                            <motion.span
                                key={mode}
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 4 }}
                                transition={{ duration: 0.2 }}
                                className={cn(
                                    "text-sm font-bold tracking-tight",
                                    config.textColor,
                                    currentLanguage === 'ar' ? 'font-ar-display' : 'font-display'
                                )}
                            >
                                {getTitle()}
                            </motion.span>
                        </AnimatePresence>

                        <AnimatePresence mode="wait">
                            <motion.span
                                key={`sub-${mode}`}
                                initial={{ opacity: 0, y: -3 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 3 }}
                                transition={{ duration: 0.15, delay: 0.05 }}
                                className={cn("text-[11px] font-medium", config.subtitleColor)}
                            >
                                {getSubtitle()}
                            </motion.span>
                        </AnimatePresence>
                    </div>
                </div>

                {/* Right side: contextual content */}
                <div className="relative z-10 shrink-0">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={`right-${mode}`}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.2 }}
                        >
                            {getRightContent()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </motion.div>
        </motion.div>
    );
}
