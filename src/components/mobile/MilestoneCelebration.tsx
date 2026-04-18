/**
 * MilestoneCelebration  ·  Part 5.4
 *
 * Full-screen, 3.5-second ceremony for true milestones:
 *   – 10th job completed
 *   – 100th job completed
 *   – First "Elite" (5-star) review
 *
 * Inspired by Oura's 100-night streak celebration: a quiet bloom, one line
 * of recognition, and a short voiceover in the seller's native language.
 *
 * Visual language:
 *   – Saudi geometric rosette (16-point star inside an octagon)
 *   – Deep tool-mode canvas (#0B1A10 → #1A0F0A gradient) so the geometry
 *     glows in warm gold (#C68E17)
 *   – Minimal typography, large breath marks
 *
 * Voiceover:
 *   – Uses the Web Speech API (`SpeechSynthesisUtterance`) — no network call,
 *     no audio asset to ship. Picks an Arabic or English voice by `lang`.
 *   – Falls back to silence if speechSynthesis is unavailable.
 *   – Respects an in-app preference key `mm_milestone_voice` (default on).
 *
 * Ceremony is gated behind the `CelebrationProvider` — the caller just imports
 * `triggerMilestone(milestone)` and the provider mounts this component for
 * the duration of the ceremony.
 */

import { useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { useMotion } from '@/hooks/useMotion';

export type MilestoneKind = 'tenth_job' | 'hundredth_job' | 'first_elite_review' | 'weekly_target_hit';

interface MilestoneCelebrationProps {
    kind: MilestoneKind;
    currentLanguage: 'en' | 'ar';
    sellerName?: string;
    onDone: () => void;
}

// Copy registry — short, dignified, never emoji-heavy.
const MILESTONE_COPY: Record<MilestoneKind, {
    en: { line1: string; line2: string; voice: string };
    ar: { line1: string; line2: string; voice: string };
}> = {
    tenth_job: {
        en: {
            line1: 'Ten jobs.',
            line2: 'You\'ve built the first ring of trust.',
            voice: 'Ten jobs done. You are no longer new. You are becoming known.',
        },
        ar: {
            line1: 'عشرة طلبات.',
            line2: 'بنيت أول حلقة من الثقة.',
            voice: 'عشرة طلبات مكتملة. ما عدت جديد. صرت معروف.',
        },
    },
    hundredth_job: {
        en: {
            line1: 'One hundred jobs.',
            line2: 'You\'re a name in your city now.',
            voice: 'One hundred jobs. You have earned your reputation one visit at a time.',
        },
        ar: {
            line1: 'مئة طلب.',
            line2: 'صرت اسماً في مدينتك.',
            voice: 'مئة طلب مكتمل. سمعتك بُنيت بزيارة زيارة. ما شاء الله.',
        },
    },
    first_elite_review: {
        en: {
            line1: 'First five-star review.',
            line2: 'A client chose to say: elite.',
            voice: 'A client took a moment to call your work elite. That memory is now yours.',
        },
        ar: {
            line1: 'أول تقييم خمس نجوم.',
            line2: 'وصفك عميل بالأسطوري.',
            voice: 'عميل أخذ لحظة ليقول إن شغلك أسطوري. هذي الشهادة لك.',
        },
    },
    weekly_target_hit: {
        en: {
            line1: 'Weekly target hit.',
            line2: 'You finished the week on your terms.',
            voice: 'You hit your weekly target. That is rhythm, not luck.',
        },
        ar: {
            line1: 'الهدف الأسبوعي تحقق.',
            line2: 'ختمت أسبوعك كما أردت.',
            voice: 'حققت هدفك الأسبوعي. هذا إيقاع، ليس مصادفة.',
        },
    },
};

function speak(text: string, lang: 'en' | 'ar') {
    try {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
        // Respect user preference
        if (localStorage.getItem('mm_milestone_voice') === 'off') return;
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
        u.rate = 0.92;
        u.pitch = 1;
        u.volume = 0.9;
        // Pick a matching voice if available
        const voices = window.speechSynthesis.getVoices();
        const match = voices.find((v) => v.lang.startsWith(lang === 'ar' ? 'ar' : 'en'));
        if (match) u.voice = match;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
    } catch {/* swallow */}
}

export function MilestoneCelebration({
    kind,
    currentLanguage,
    sellerName,
    onDone,
}: MilestoneCelebrationProps) {
    const m = useMotion();
    const fired = useRef(false);
    const copy = MILESTONE_COPY[kind][currentLanguage];
    const name = sellerName ? (currentLanguage === 'ar' ? `يا ${sellerName}،` : `${sellerName},`) : '';

    useEffect(() => {
        haptics.celebration();
        // Voiceover fires after the geometry blooms (~1s in)
        const timers: ReturnType<typeof setTimeout>[] = [];
        timers.push(setTimeout(() => {
            speak(`${name} ${copy.voice}`.trim(), currentLanguage);
        }, m.isReduced ? 200 : 900));
        // Gentle second haptic at the headline moment
        timers.push(setTimeout(() => haptics.medium(), m.isReduced ? 0 : 600));
        // Exit after 3.5s (or instant in reduced motion)
        timers.push(setTimeout(() => {
            if (fired.current) return;
            fired.current = true;
            try { window.speechSynthesis?.cancel(); } catch {/* swallow */}
            onDone();
        }, m.isReduced ? 1200 : 3500));
        return () => {
            timers.forEach((t) => clearTimeout(t));
            try { window.speechSynthesis?.cancel(); } catch {/* swallow */}
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <AnimatePresence>
            <motion.div
                key={kind}
                dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
                className="fixed inset-0 z-[10000] flex flex-col items-center justify-center overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                aria-live="polite"
                role="status"
                style={{
                    background: 'radial-gradient(ellipse at 50% 30%, #1a0f0a 0%, #0b1a10 55%, #000 100%)',
                }}
            >
                {/* Geometric rosette */}
                <SaudiGeometricRosette reduced={m.isReduced} />

                {/* Text block */}
                <div className="relative z-10 text-center max-w-md px-6 mt-4">
                    {name && (
                        <motion.p
                            className="text-amber-200/70 text-sm tracking-[0.3em] uppercase mb-3"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 0.5 }}
                        >
                            {name.trim().replace(/,$/,'')}
                        </motion.p>
                    )}
                    <motion.h1
                        className={cn(
                            'text-white text-5xl md:text-6xl font-black mb-4 leading-tight',
                            currentLanguage === 'ar' ? 'font-ar-display' : 'font-display',
                        )}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: m.isReduced ? 0 : 0.6, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        style={{ textShadow: '0 2px 30px rgba(198,142,23,0.25)' }}
                    >
                        {copy.line1}
                    </motion.h1>
                    <motion.p
                        className={cn(
                            'text-amber-100/80 text-base md:text-lg leading-relaxed',
                            currentLanguage === 'ar' ? 'font-ar-body' : 'font-body',
                        )}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: m.isReduced ? 0 : 1.0, duration: 0.6 }}
                    >
                        {copy.line2}
                    </motion.p>
                </div>

                {/* Tap to dismiss hint */}
                <motion.button
                    type="button"
                    onClick={() => {
                        if (fired.current) return;
                        fired.current = true;
                        try { window.speechSynthesis?.cancel(); } catch {/* swallow */}
                        onDone();
                    }}
                    className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/50 text-xs tracking-[0.25em] uppercase"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: m.isReduced ? 0 : 2.0, duration: 0.4 }}
                >
                    {currentLanguage === 'ar' ? 'اضغط للإغلاق' : 'Tap to close'}
                </motion.button>
            </motion.div>
        </AnimatePresence>
    );
}

/**
 * 16-point Saudi geometric rosette rendered with SVG.
 * Blooms from 0.4 → 1.0 scale, rotates once during the ceremony,
 * then gently pulses.
 */
function SaudiGeometricRosette({ reduced }: { reduced: boolean }) {
    const points = useMemo(() => {
        const out: [number, number][] = [];
        const cx = 200; const cy = 200;
        const outerR = 160; const innerR = 90;
        const count = 16;
        for (let i = 0; i < count * 2; i += 1) {
            const r = i % 2 === 0 ? outerR : innerR;
            const theta = (i / (count * 2)) * Math.PI * 2 - Math.PI / 2;
            out.push([cx + r * Math.cos(theta), cy + r * Math.sin(theta)]);
        }
        return out;
    }, []);

    const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`).join(' ') + ' Z';

    return (
        <motion.svg
            className="absolute inset-0 m-auto pointer-events-none"
            width={400}
            height={400}
            viewBox="0 0 400 400"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.4, rotate: -12 }}
            animate={reduced ? { opacity: 0.65 } : { opacity: [0, 0.75, 0.65], scale: [0.4, 1.08, 1], rotate: 0 }}
            transition={{
                duration: reduced ? 0.2 : 1.4,
                ease: [0.16, 1, 0.3, 1],
                times: [0, 0.7, 1],
            }}
        >
            <defs>
                <radialGradient id="rosette-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#C68E17" stopOpacity="0.85" />
                    <stop offset="60%" stopColor="#B45309" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#047857" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="rosette-stroke" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0" stopColor="#FBBF24" />
                    <stop offset="1" stopColor="#B45309" />
                </linearGradient>
            </defs>

            {/* Outer glow */}
            <circle cx="200" cy="200" r="190" fill="url(#rosette-glow)" />

            {/* Outer octagon */}
            <polygon
                points={Array.from({ length: 8 }).map((_, i) => {
                    const theta = (i / 8) * Math.PI * 2 - Math.PI / 8;
                    const r = 170;
                    return `${200 + r * Math.cos(theta)},${200 + r * Math.sin(theta)}`;
                }).join(' ')}
                fill="none"
                stroke="url(#rosette-stroke)"
                strokeWidth="1.2"
                opacity="0.4"
            />

            {/* 16-point star */}
            <motion.path
                d={path}
                fill="none"
                stroke="url(#rosette-stroke)"
                strokeWidth="1.6"
                strokeLinejoin="round"
                initial={reduced ? { pathLength: 1 } : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: reduced ? 0.1 : 1.3, ease: [0.16, 1, 0.3, 1] }}
            />

            {/* Inner gold circle */}
            <circle cx="200" cy="200" r="12" fill="#C68E17" opacity="0.9" />
            <circle cx="200" cy="200" r="24" fill="none" stroke="#FBBF24" strokeWidth="0.8" opacity="0.5" />
        </motion.svg>
    );
}
