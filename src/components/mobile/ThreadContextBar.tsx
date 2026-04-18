/**
 * ThreadContextBar  ·  Part 3 easy win
 *
 * A persistent "context ribbon" pinned to the top of every message thread.
 * It surfaces the **live job state** in plain language + provides a single-tap
 * jump to the job detail, so the two parties never have to ask each other
 * "what's happening?" inside the chat.
 *
 * Below the ribbon, a horizontally-scrollable pill row of **smart suggested
 * replies** that are derived from the Conversation Intelligence service
 * (`@/services/conversationIntelligence`) + the current job stage. These
 * replies are specific to the conversation, not canned boilerplate.
 *
 * No new API is introduced — it reads the existing thread data and drops
 * in above the existing MessageThread scroll area.
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, MapPin, Clock, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import {
    analyseThread,
    suggestReplies,
    type IntelMessage,
    type JobLifecycleStage,
    type SuggestedReply,
} from '@/services/conversationIntelligence';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';

interface ThreadContextBarProps {
    currentLanguage: 'en' | 'ar';
    role: 'buyer' | 'seller';
    myId: string;
    messages: IntelMessage[];
    /** Normalized job lifecycle. Map your DB status to one of these values. */
    stage: JobLifecycleStage;
    /** Job ID for the deep-link when the user taps the bar. */
    jobId?: string;
    /** Human-readable service label ("AC Maintenance", "سباكة"). */
    serviceLabel?: string;
    /** Optional ETA display (string). */
    etaLabel?: string;
    /** Fired when a suggested reply pill is tapped. */
    onSuggestedReply: (reply: SuggestedReply) => void;
}

const STAGE_META: Record<JobLifecycleStage, { icon: React.ComponentType<{ className?: string; size?: number }>; color: string; en: string; ar: string }> = {
    before_accept: { icon: Loader2, color: 'text-amber-600', en: 'Awaiting acceptance', ar: 'بانتظار القبول' },
    accepted: { icon: CheckCircle2, color: 'text-emerald-600', en: 'Accepted — scheduling', ar: 'تم القبول — يتم التجهيز' },
    on_the_way: { icon: MapPin, color: 'text-blue-600', en: 'On the way', ar: 'في الطريق' },
    arrived: { icon: MapPin, color: 'text-indigo-600', en: 'Arrived on site', ar: 'وصل للموقع' },
    in_progress: { icon: Clock, color: 'text-emerald-700', en: 'Work in progress', ar: 'الشغل جاري' },
    awaiting_approval: { icon: AlertTriangle, color: 'text-amber-700', en: 'Price pending approval', ar: 'السعر بانتظار الموافقة' },
    completed: { icon: CheckCircle2, color: 'text-emerald-700', en: 'Completed', ar: 'مكتمل' },
    halted: { icon: AlertTriangle, color: 'text-destructive', en: 'Halted', ar: 'متوقف' },
};

export function ThreadContextBar({
    currentLanguage,
    role,
    myId,
    messages,
    stage,
    jobId,
    serviceLabel,
    etaLabel,
    onSuggestedReply,
}: ThreadContextBarProps) {
    const navigate = useNavigate();

    const intel = useMemo(() => analyseThread(messages), [messages]);
    const suggestions = useMemo(
        () => suggestReplies(intel, stage, role, myId),
        [intel, stage, role, myId],
    );

    const meta = STAGE_META[stage];
    const StageIcon = meta.icon;
    const stageLabel = currentLanguage === 'ar' ? meta.ar : meta.en;

    const handleBarTap = () => {
        if (!jobId) return;
        haptics.selection();
        const target = role === 'seller' ? `/app/seller/job/${jobId}` : `/app/buyer/request/${jobId}`;
        navigate(target);
    };

    const handlePillTap = (reply: SuggestedReply) => {
        haptics.light();
        onSuggestedReply(reply);
    };

    return (
        <div className={cn('w-full border-b border-border/40 bg-background/95 backdrop-blur-md')}
             dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
            {/* ── Live state ribbon ─────────────────────── */}
            <motion.button
                type="button"
                onClick={handleBarTap}
                disabled={!jobId}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5',
                    'text-left',
                    jobId && 'active:bg-muted/40',
                )}
            >
                <div className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                    'bg-muted/60',
                )}>
                    <StageIcon className={cn('h-4 w-4', meta.color)} />
                </div>
                <div className="min-w-0 flex-1">
                    <p className={cn(
                        'text-xs font-medium text-muted-foreground uppercase tracking-wide',
                        currentLanguage === 'ar' ? 'font-ar-body' : 'font-body',
                    )}>
                        {currentLanguage === 'ar' ? 'حالة الطلب' : 'Job status'}
                    </p>
                    <div className="flex items-baseline gap-2">
                        <p className={cn(
                            'text-sm font-bold text-foreground truncate',
                            currentLanguage === 'ar' ? 'font-ar-display' : 'font-display',
                        )}>
                            {stageLabel}
                        </p>
                        {serviceLabel && (
                            <span className="text-xs text-muted-foreground truncate">· {serviceLabel}</span>
                        )}
                        {etaLabel && (
                            <span className="text-xs text-muted-foreground">· {etaLabel}</span>
                        )}
                    </div>
                </div>
                {jobId && (
                    <ChevronRight className={cn(
                        'h-4 w-4 text-muted-foreground shrink-0',
                        currentLanguage === 'ar' && 'rotate-180',
                    )} />
                )}
            </motion.button>

            {/* ── Smart suggested replies ───────────────── */}
            {suggestions.length > 0 && (
                <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide">
                    {suggestions.map((s, i) => (
                        <motion.button
                            key={s.id}
                            onClick={() => handlePillTap(s)}
                            initial={{ opacity: 0, scale: 0.92 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.05, type: 'spring', stiffness: 400, damping: 28 }}
                            whileTap={{ scale: 0.95 }}
                            className={cn(
                                'shrink-0 rounded-full border border-border/60',
                                'bg-muted/40 px-3.5 py-1.5',
                                'text-xs font-medium text-foreground',
                                'hover:bg-muted/70 transition-colors',
                                currentLanguage === 'ar' ? 'font-ar-body' : 'font-body',
                            )}
                        >
                            {currentLanguage === 'ar' ? s.label.ar : s.label.en}
                        </motion.button>
                    ))}
                </div>
            )}
        </div>
    );
}
