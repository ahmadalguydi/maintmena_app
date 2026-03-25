import { Skeleton } from "@/components/ui/skeleton";
import { SoftCard } from "./SoftCard";

export const JobTrackingCardSkeleton = () => {
    return (
        <SoftCard className="p-4 space-y-6">
            {/* Header */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-1/2 rounded-full" />
                    <Skeleton className="h-8 w-24 rounded-full" />
                </div>
                <Skeleton className="h-4 w-3/4 rounded-full" />
            </div>

            {/* Timeline */}
            <div className="flex justify-between items-center px-2">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-2 w-12 rounded-full" />
                    </div>
                ))}
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="flex gap-2">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <div className="space-y-1">
                        <Skeleton className="h-3 w-12 rounded-full" />
                        <Skeleton className="h-4 w-20 rounded-full" />
                    </div>
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <div className="space-y-1">
                        <Skeleton className="h-3 w-12 rounded-full" />
                        <Skeleton className="h-4 w-20 rounded-full" />
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2">
                <Skeleton className="h-12 w-full rounded-full" />
            </div>
        </SoftCard>
    );
};
