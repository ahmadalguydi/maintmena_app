/**
 * MissionBreathingBackdrop  ·  Part 2, Moment 3
 *
 * A subtle living aura behind the Mission Hero card. While the seller is
 * actively on a job, the screen *breathes* — an imperceptible 1.0 → 1.012 →
 * 1.0 scale + 0.85 → 1.0 → 0.85 opacity cycle over 4 seconds.
 *
 * Why: Apple's Dynamic Island, Oura's "Readiness" glow, and Headspace's
 * breathing orb all lean on this same trick — living, not animated.
 *
 * When the seller enters "Flow State" (status = in_progress), the backdrop
 * shifts into **TOOL MODE** — a deep Saudi-green (#0B1A10) canvas with a
 * slower 6s breath, minimal UI chrome. The seller's hands are full; the
 * app gets quieter so they don't have to fight for attention.
 *
 * The component renders absolutely-positioned behind its children.
 */

import { ReactNode, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useMotion } from '@/hooks/useMotion';
import { cn } from '@/lib/utils';

interface MissionBreathingBackdropProps {
    /** Current mission phase — in_progress triggers Tool Mode. */
    phase: 'accepted' | 'en_route' | 'arrived' | 'in_progress' | 'seller_completed';
    children: ReactNode;
    className?: string;
}

export function MissionBreathingBackdrop({ phase, children, className }: MissionBreathingBackdropProps) {
    const m = useMotion();
    const toolMode = phase === 'in_progress';

    const auraStyle = useMemo(() => {
        if (toolMode) {
            // Deep tool-mode canvas
            return {
                background: 'radial-gradient(ellipse at 50% 30%, rgba(11,26,16,0.95) 0%, rgba(7,17,11,0.98) 40%, rgba(0,0,0,1) 100%)',
                color: 'rgb(220, 252, 231)',
            } as const;
        }
        return {
            background: 'radial-gradient(ellipse at 50% 25%, rgba(180,83,9,0.06) 0%, transparent 70%)',
        } as const;
    }, [toolMode]);

    const breathDuration = toolMode ? 6 : 4;

    return (
        <div className={cn('relative', toolMode && 'rounded-3xl overflow-hidden', className)}>
            {/* Breathing aura */}
            <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={auraStyle}
                animate={m.isReduced ? undefined : {
                    scale: [1, 1.012, 1],
                    opacity: [0.88, 1, 0.88],
                }}
                transition={m.isReduced ? undefined : {
                    duration: breathDuration,
                    ease: m.easing.breathe as number[] | undefined,
                    repeat: Infinity,
                }}
            />
            {/* Optional inner halo ring — only in tool mode (flow state) */}
            {toolMode && !m.isReduced && (
                <motion.div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1.5 }}
                >
                    <motion.div
                        className="h-[90%] w-[90%] rounded-full"
                        style={{
                            background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 60%)',
                        }}
                        animate={{ scale: [0.92, 1, 0.92], opacity: [0.6, 0.9, 0.6] }}
                        transition={{ duration: breathDuration, ease: 'easeInOut', repeat: Infinity }}
                    />
                </motion.div>
            )}
            {/* Subtle breathing dot indicator — signals "live" state, top-right */}
            {!m.isReduced && (
                <div className="absolute top-3 right-4 z-10 flex items-center gap-1.5">
                    <motion.span
                        className={cn(
                            'block h-2 w-2 rounded-full',
                            toolMode ? 'bg-emerald-400' : 'bg-primary',
                        )}
                        animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.25, 1] }}
                        transition={{ duration: breathDuration / 2, ease: 'easeInOut', repeat: Infinity }}
                    />
                    <span className={cn(
                        'text-[10px] font-bold uppercase tracking-widest',
                        toolMode ? 'text-emerald-300/80' : 'text-muted-foreground',
                    )}>
                        {toolMode ? 'flow' : 'live'}
                    </span>
                </div>
            )}
            <div className="relative z-[1]">
                {children}
            </div>
        </div>
    );
}
