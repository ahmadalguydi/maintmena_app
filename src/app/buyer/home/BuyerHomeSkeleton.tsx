import { Skeleton } from "@/components/ui/skeleton";
import { JobTrackingCardSkeleton } from "@/components/mobile/JobTrackingCardSkeleton";
import { ActivityCardSkeleton } from "@/components/mobile/ActivityCard";

export const BuyerHomeSkeleton = () => {
    return (
        <div className="pb-24 min-h-screen bg-background pt-4 px-4 space-y-6">
            {/* Active Job Skeleton */}
            <div className="space-y-4">
                <Skeleton className="h-7 w-32 rounded-lg" />
                <JobTrackingCardSkeleton />
            </div>

            {/* Activity Hub Skeleton (Top) */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-7 w-32 rounded-lg" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                </div>
                <ActivityCardSkeleton />
                <ActivityCardSkeleton />
            </div>

            {/* Promo Banner Skeleton */}
            <Skeleton className="h-40 w-full rounded-3xl" />

            {/* Primary CTAs Skeleton */}
            <div className="space-y-3">
                <Skeleton className="h-24 w-full rounded-3xl" />
                <Skeleton className="h-20 w-full rounded-3xl" />
            </div>

            {/* Categories Skeleton */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-7 w-40 rounded-lg" />
                    <Skeleton className="h-6 w-16 rounded-lg" />
                </div>
                <div className="flex gap-4 overflow-hidden">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex flex-col items-center gap-2">
                            <Skeleton className="h-16 w-16 rounded-full" />
                            <Skeleton className="h-3 w-12 rounded-full" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
