import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SkeletonShimmerProps {
    className?: string;
    children?: React.ReactNode;
}

/**
 * A shimmer effect overlay for skeleton loaders
 */
export const SkeletonShimmer = ({ className }: SkeletonShimmerProps) => (
    <div className={cn(
        "absolute inset-0 -translate-x-full",
        "bg-gradient-to-r from-transparent via-white/20 to-transparent",
        "animate-shimmer",
        className
    )} />
);

/**
 * Base skeleton with shimmer effect
 */
export const ShimmerSkeleton = ({ className }: { className?: string }) => (
    <div className={cn(
        "relative overflow-hidden rounded-md bg-muted",
        className
    )}>
        <SkeletonShimmer />
    </div>
);

/**
 * Quote Card Skeleton with shimmer effect
 */
export const QuoteCardSkeleton = ({ currentLanguage = 'en' }: { currentLanguage?: 'en' | 'ar' }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-background rounded-3xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border/30"
    >
        <div className="space-y-4">
            {/* Provider row */}
            <div className="flex items-center gap-3">
                <div className="relative size-12 rounded-full bg-muted overflow-hidden">
                    <SkeletonShimmer />
                </div>
                <div className="flex-1 space-y-2">
                    <div className="relative h-4 w-32 rounded bg-muted overflow-hidden">
                        <SkeletonShimmer />
                    </div>
                    <div className="relative h-3 w-20 rounded bg-muted/70 overflow-hidden">
                        <SkeletonShimmer />
                    </div>
                </div>
            </div>

            {/* Price box */}
            <div className="relative h-20 rounded-2xl bg-muted/30 overflow-hidden">
                <SkeletonShimmer />
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
                <div className="relative flex-1 h-11 rounded-full bg-muted overflow-hidden">
                    <SkeletonShimmer />
                </div>
                <div className="relative flex-1 h-11 rounded-full bg-muted/60 overflow-hidden">
                    <SkeletonShimmer />
                </div>
            </div>
        </div>
    </motion.div>
);

/**
 * Request Card Skeleton with shimmer effect
 */
export const RequestCardSkeleton = () => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-w-[220px] max-w-[220px] bg-background rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border/30"
    >
        {/* Image placeholder */}
        <div className="relative h-32 bg-muted overflow-hidden">
            <SkeletonShimmer />
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
            <div className="relative h-5 w-3/4 rounded bg-muted overflow-hidden">
                <SkeletonShimmer />
            </div>
            <div className="space-y-1.5">
                <div className="relative h-3 w-full rounded bg-muted/70 overflow-hidden">
                    <SkeletonShimmer />
                </div>
                <div className="relative h-3 w-2/3 rounded bg-muted/70 overflow-hidden">
                    <SkeletonShimmer />
                </div>
            </div>
            <div className="relative h-11 rounded-full bg-muted overflow-hidden">
                <SkeletonShimmer />
            </div>
        </div>
    </motion.div>
);

/**
 * Job Tracking Card Skeleton
 */
export const JobTrackingCardSkeleton = () => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-background rounded-3xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border/30"
    >
        <div className="space-y-4">
            {/* Header with status */}
            <div className="flex items-center justify-between">
                <div className="relative h-6 w-40 rounded bg-muted overflow-hidden">
                    <SkeletonShimmer />
                </div>
                <div className="relative h-6 w-20 rounded-full bg-muted overflow-hidden">
                    <SkeletonShimmer />
                </div>
            </div>

            {/* Timeline */}
            <div className="flex justify-between items-center py-3">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                        <div className="relative size-8 rounded-full bg-muted overflow-hidden">
                            <SkeletonShimmer />
                        </div>
                        <div className="relative h-2 w-12 rounded bg-muted/70 overflow-hidden">
                            <SkeletonShimmer />
                        </div>
                    </div>
                ))}
            </div>

            {/* Info row */}
            <div className="flex gap-3">
                <div className="relative flex-1 h-16 rounded-xl bg-muted/30 overflow-hidden">
                    <SkeletonShimmer />
                </div>
                <div className="relative flex-1 h-16 rounded-xl bg-muted/30 overflow-hidden">
                    <SkeletonShimmer />
                </div>
            </div>

            {/* Action button */}
            <div className="relative h-12 rounded-full bg-muted overflow-hidden">
                <SkeletonShimmer />
            </div>
        </div>
    </motion.div>
);

/**
 * Profile Card Skeleton
 */
export const ProfileCardSkeleton = () => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-background rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border/30"
    >
        <div className="flex items-center gap-4">
            <div className="relative size-16 rounded-full bg-muted overflow-hidden">
                <SkeletonShimmer />
            </div>
            <div className="flex-1 space-y-2">
                <div className="relative h-5 w-32 rounded bg-muted overflow-hidden">
                    <SkeletonShimmer />
                </div>
                <div className="relative h-4 w-24 rounded bg-muted/70 overflow-hidden">
                    <SkeletonShimmer />
                </div>
            </div>
        </div>
    </motion.div>
);

/**
 * Generic list skeleton
 */
export const ListSkeleton = ({ count = 3 }: { count?: number }) => (
    <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
            <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-background rounded-2xl p-4 shadow-sm border border-border/30"
            >
                <div className="flex items-center gap-3">
                    <div className="relative size-10 rounded-full bg-muted overflow-hidden">
                        <SkeletonShimmer />
                    </div>
                    <div className="flex-1 space-y-2">
                        <div className="relative h-4 w-3/4 rounded bg-muted overflow-hidden">
                            <SkeletonShimmer />
                        </div>
                        <div className="relative h-3 w-1/2 rounded bg-muted/70 overflow-hidden">
                            <SkeletonShimmer />
                        </div>
                    </div>
                </div>
            </motion.div>
        ))}
    </div>
);
