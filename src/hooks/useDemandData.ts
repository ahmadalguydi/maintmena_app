import { useMemo } from 'react';

interface DemandCategory {
    id: string;
    name: string;
    nameAr: string;
    icon: string;
    requestCount: number;
    trend: 'high' | 'rising' | 'steady';
    trendPercent?: number;
}

interface DemandForecast {
    category: string;
    categoryAr: string;
    icon: string;
    peakTime: string;
    peakTimeAr: string;
}

interface DemandData {
    categories: DemandCategory[];
    forecasts: DemandForecast[];
    peakInMinutes: number;
    estimatedEarnings: {
        min: number;
        max: number;
    };
}

export function useDemandData(): DemandData {
    return useMemo(() => ({
        categories: [
            {
                id: 'ac-repair',
                name: 'AC Repair',
                nameAr: 'إصلاح التكييف',
                icon: '❄️',
                requestCount: 12,
                trend: 'high' as const,
            },
            {
                id: 'plumbing',
                name: 'Plumbing',
                nameAr: 'السباكة',
                icon: '🔧',
                requestCount: 8,
                trend: 'rising' as const,
                trendPercent: 15,
            },
            {
                id: 'electrical',
                name: 'Electrical',
                nameAr: 'كهرباء',
                icon: '⚡',
                requestCount: 5,
                trend: 'steady' as const,
            },
        ],
        forecasts: [
            {
                category: 'AC Repair',
                categoryAr: 'إصلاح التكييف',
                icon: '❄️',
                peakTime: 'tonight',
                peakTimeAr: 'الليلة',
            },
            {
                category: 'Emergency Plumbing',
                categoryAr: 'سباكة طارئة',
                icon: '🔧',
                peakTime: 'after 9 PM',
                peakTimeAr: 'بعد 9 مساءً',
            },
        ],
        peakInMinutes: 45,
        estimatedEarnings: {
            min: 220,
            max: 380,
        },
    }), []);
}
