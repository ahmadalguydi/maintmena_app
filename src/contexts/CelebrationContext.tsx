import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

import { JourneyStage, getStagesForFlow, FlowType, UserRole } from '@/lib/journeyStages';

interface CelebrationData {
    flowType: FlowType;
    role: UserRole;
    currentStageIndex: number;
    flowTitle?: string;
    navigationUrl?: string;
}

interface CelebrationContextType {
    celebrate: (data: CelebrationData) => void;
}

const CelebrationContext = createContext<CelebrationContextType | null>(null);

/**
 * Hook to trigger celebrations from anywhere in the app.
 * Call celebrate() after successful user actions.
 * 
 * PURPOSE DISTINCTION:
 * - CelebrationContext: ACTIVE triggering - shows celebration when user PERFORMS an action
 *   (e.g., buyer clicks "Accept Quote", seller submits quote)
 * - useJourneyProgress: PASSIVE detection - shows overlay when user VIEWS a detail page
 *   where progress has advanced while they were away
 * 
 * These systems are COMPLEMENTARY - use CelebrationContext for immediate action feedback,
 * useJourneyProgress catches updates that happened offline.
 */
export const useCelebration = () => {
    const context = useContext(CelebrationContext);
    if (!context) {
        console.warn('[useCelebration] Must be used within CelebrationProvider');
        return { celebrate: () => { } };
    }
    return context;
};

interface CelebrationProviderProps {
    children: ReactNode;
    currentLanguage: 'en' | 'ar';
}

/**
 * Provider that wraps the app and handles celebration overlays
 */
export const CelebrationProvider = ({ children, currentLanguage }: CelebrationProviderProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [celebrationData, setCelebrationData] = useState<CelebrationData | null>(null);
    const [stages, setStages] = useState<JourneyStage[]>([]);

    const celebrate = useCallback((data: CelebrationData) => {
        const flowStages = getStagesForFlow(data.flowType, data.role);
        setStages(flowStages);
        setCelebrationData(data);
        setIsOpen(true);
    }, []);

    const handleClose = useCallback(() => {
        setIsOpen(false);
        setCelebrationData(null);
    }, []);

    const isCompleted = celebrationData?.currentStageIndex === stages.length - 1;

    return (
        <CelebrationContext.Provider value={{ celebrate }}>
            {children}

        </CelebrationContext.Provider>
    );
};
