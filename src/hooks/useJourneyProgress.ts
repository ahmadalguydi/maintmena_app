import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
    FlowType,
    UserRole,
    getStagesForFlow,
    deriveStageIndex,
    JourneyStage,
} from '@/lib/journeyStages';

interface UseJourneyProgressProps {
    flowType: FlowType;
    role: UserRole;
    entityId: string;
    entityTable: 'booking_requests' | 'maintenance_requests';
    // Status data for deriving current stage
    bookingStatus?: string;
    contractStatus?: string;
    buyerSigned?: boolean;
    sellerSigned?: boolean;
    quoteStatus?: string;
    requestStatus?: string;
    // Last seen stage from DB
    lastSeenStage: number | null;
}

interface UseJourneyProgressResult {
    stages: JourneyStage[];
    currentStageIndex: number;
    showOverlay: boolean;
    isCompleted: boolean;
    markAsSeen: () => Promise<void>;
}

/**
 * Hook for managing journey progress state and overlay visibility.
 * Automatically determines if an overlay should be shown based on stage advancement.
 * 
 * PURPOSE DISTINCTION:
 * - useJourneyProgress: PASSIVE detection - shows overlay when user VIEWS a detail page
 *   where progress has advanced (e.g., seller signed while buyer was offline)
 * - CelebrationContext: ACTIVE triggering - shows celebration when user PERFORMS an action
 *   (e.g., buyer clicks "Accept Quote")
 * 
 * These systems are COMPLEMENTARY:
 * - CelebrationContext handles the immediate feedback for user actions
 * - useJourneyProgress catches progress updates that happened while user was away
 */
export const useJourneyProgress = ({
    flowType,
    role,
    entityId,
    entityTable,
    bookingStatus,
    contractStatus,
    buyerSigned,
    sellerSigned,
    quoteStatus,
    requestStatus,
    lastSeenStage,
}: UseJourneyProgressProps): UseJourneyProgressResult => {
    const [hasShownOverlay, setHasShownOverlay] = useState(false);

    // Get stage definitions for this flow
    const stages = useMemo(() => getStagesForFlow(flowType, role), [flowType, role]);

    // Derive current stage from status
    const currentStageIndex = useMemo(
        () =>
            deriveStageIndex(flowType, role, {
                bookingStatus,
                contractStatus,
                buyerSigned,
                sellerSigned,
                quoteStatus,
                requestStatus,
            }),
        [flowType, role, bookingStatus, contractStatus, buyerSigned, sellerSigned, quoteStatus, requestStatus]
    );

    // Check if this is the final stage (job active)
    const isCompleted = currentStageIndex === stages.length - 1;

    // Determine if we should show the overlay
    const showOverlay = useMemo(() => {
        // Don't show if we've already dismissed it this session
        if (hasShownOverlay) return false;

        // Show if current stage is greater than what user has seen
        const lastSeen = lastSeenStage ?? -1;
        return currentStageIndex > lastSeen;
    }, [currentStageIndex, lastSeenStage, hasShownOverlay]);

    // Mark the current stage as seen
    const markAsSeen = useCallback(async () => {
        setHasShownOverlay(true);

        const columnName = role === 'buyer' ? 'buyer_last_seen_stage' : 'seller_last_seen_stage';

        try {
            const { error } = await supabase
                .from(entityTable)
                .update({ [columnName]: currentStageIndex })
                .eq('id', entityId);

            if (error) {
                console.error('[useJourneyProgress] Error updating last seen stage:', error);
            }
        } catch (err) {
            console.error('[useJourneyProgress] Exception updating last seen stage:', err);
        }
    }, [entityTable, entityId, role, currentStageIndex]);

    return {
        stages,
        currentStageIndex,
        showOverlay,
        isCompleted,
        markAsSeen,
    };
};
