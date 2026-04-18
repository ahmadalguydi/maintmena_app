import { useState } from 'react';
import { TrendingUp, ChevronRight, ChevronLeft, Heart, Shield, Zap, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getSellerLevelProgress } from '@/lib/sellerLevel';

interface WhatToDoNowProps {
    currentLanguage: 'en' | 'ar';
    onEnableCategory?: (category: string) => void;
}

interface GrowthInsight {
    id: string;
    headline: string;
    headlineAr: string;
    highlight: string;
    highlightAr: string;
    highlightColor: 'primary' | 'success' | 'warning';
    detail: string;
    detailAr: string;
    ctaLabel: string;
    ctaLabelAr: string;
    category?: string;
}

const mockInsights: GrowthInsight[] = [
    {
        id: '1',
        headline: 'Plumbing is in high demand. Enable it?',
        headlineAr: 'السباكة عليها طلب عالي. تفعلها؟',
        highlight: 'Plumbing',
        highlightAr: 'السباكة',
        highlightColor: 'success',
        detail: '12 requests nearby in last hour',
        detailAr: '12 طلب قريب في الساعة الأخيرة',
        ctaLabel: 'Enable',
        ctaLabelAr: 'تفعيل',
        category: 'plumbing',
    },
    {
        id: '2',
        headline: 'AC repairs peak tonight. Be ready!',
        headlineAr: 'إصلاحات التكييف تزداد الليلة. كن جاهزاً!',
        highlight: 'tonight',
        highlightAr: 'الليلة',
        highlightColor: 'warning',
        detail: 'Demand up 35% vs last week',
        detailAr: 'الطلب ارتفع 35% عن الأسبوع الماضي',
        ctaLabel: 'Got it',
        ctaLabelAr: 'فهمت',
    },
];

// ReputationData removed — using shared getSellerLevelProgress instead

const HIGHLIGHT_CLASSES: Record<string, string> = {
    primary: 'text-primary font-extrabold',
    success: 'text-success font-extrabold',
    warning: 'text-warning font-extrabold',
};

function renderHighlightedText(text: string, highlight: string, className: string) {
    if (!highlight) return text;
    const idx = text.toLowerCase().indexOf(highlight.toLowerCase());
    if (idx === -1) return text;

    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + highlight.length);
    const after = text.slice(idx + highlight.length);

    return (
        <>
            {before}
            <span className={className}>{match}</span>
            {after}
        </>
    );
}

export function WhatToDoNow({ currentLanguage, onEnableCategory }: WhatToDoNowProps) {
    const { user } = useAuth();
    const [activeIndex, setActiveIndex] = useState(0);
    const currentInsight = mockInsights[activeIndex % mockInsights.length];

    const { data: stats } = useQuery({
        queryKey: ['seller-pride-stats', user?.id],
        queryFn: async () => {
            if (!user?.id) return { completed: 0 };

            const { count } = await supabase
                .from('maintenance_requests')
                .select('*', { count: 'exact', head: true })
                .eq('assigned_seller_id', user.id)
                .eq('status', 'completed');

            return { completed: count || 0 };
        },
        enabled: !!user?.id,
    });

    const completedCount = stats?.completed || 0;
    const levelProgress = getSellerLevelProgress(completedCount);

    const prideStats = {
        customersChoseYou: completedCount,
        satisfactionStreak: completedCount > 0 ? Math.min(completedCount, 5) : 0,
        responseSpeed: 'Fast',
        responseSpeedAr: 'سريع',
    };

    const content = {
        ar: {
            whatToDo: 'ماذا تفعل الآن',
            smartTip: 'نصيحة ذكية',
            customersChoseYou: 'عميل اختارك',
            dayStreak: 'تقييم ممتاز',
            reputationGrowth: 'نمو السمعة',
            next: 'التالي:',
            jobsAway: 'مهمة للمستوى التالي',
        },
        en: {
            whatToDo: 'What to Do Now',
            smartTip: 'SMART TIP',
            customersChoseYou: 'customers chose you',
            dayStreak: 'top ratings',
            reputationGrowth: 'Reputation Growth',
            next: 'NEXT:',
            jobsAway: 'jobs to next level',
        },
    };

    const t = content[currentLanguage];

    const handleCta = (insight: GrowthInsight) => {
        if (insight.category) {
            onEnableCategory?.(insight.category);
        }
    };

    return (
        <div className="space-y-5">
            {/* Section Header */}
            <h2 className={cn(
                "text-sm font-bold text-foreground px-1",
                currentLanguage === 'ar' ? 'font-ar-display' : 'font-display'
            )}>
                {t.whatToDo}
            </h2>

            {/* Growth Insight Card - Dark custom color #332921 */}
            <div
                className="rounded-3xl p-5"
                style={{
                    backgroundColor: '#332921',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
            >
                {/* Badge */}
                <div className="flex items-center gap-1.5 mb-3">
                    <TrendingUp className="h-3.5 w-3.5 text-amber-200/60" />
                    <Badge
                        variant="secondary"
                        className="text-[10px] font-bold tracking-wider px-2.5 py-0.5 bg-amber-200/15 text-amber-200/80 border-none rounded-full"
                    >
                        {t.smartTip}
                    </Badge>
                </div>

                {/* Headline */}
                <p className={cn(
                    "text-base font-bold text-amber-50 leading-snug mb-4",
                    currentLanguage === 'ar' ? 'font-ar-display' : 'font-display'
                )}>
                    {renderHighlightedText(
                        currentLanguage === 'ar' ? currentInsight.headlineAr : currentInsight.headline,
                        currentLanguage === 'ar' ? currentInsight.highlightAr : currentInsight.highlight,
                        HIGHLIGHT_CLASSES[currentInsight.highlightColor]
                    )}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between">
                    <p className="text-xs text-amber-200/60 max-w-[50%] leading-relaxed">
                        {currentLanguage === 'ar' ? currentInsight.detailAr : currentInsight.detail}
                    </p>
                    <Button
                        variant="secondary"
                        size="sm"
                        className="h-9 px-5 text-xs font-bold rounded-full bg-amber-500 text-amber-950 hover:bg-amber-400 border-none gap-1"
                        onClick={() => handleCta(currentInsight)}
                    >
                        {currentLanguage === 'ar' ? currentInsight.ctaLabelAr : currentInsight.ctaLabel}
                        <ChevronRight className={cn("h-3 w-3", currentLanguage === 'ar' && "rotate-180")} />
                    </Button>
                </div>

                {/* Navigation Dots */}
                {mockInsights.length > 1 && (
                    <div className="flex items-center justify-center gap-3 mt-4 pt-3 border-t border-amber-200/10">
                        <button
                            className="h-7 w-7 rounded-full flex items-center justify-center text-amber-200/40 hover:text-amber-200/60 transition-colors"
                            onClick={() => setActiveIndex((i) => (i - 1 + mockInsights.length) % mockInsights.length)}
                        >
                            <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                        <div className="flex gap-1.5">
                            {mockInsights.map((_, i) => (
                                <button
                                    key={i}
                                    className={`h-1.5 rounded-full transition-all ${i === activeIndex % mockInsights.length
                                        ? 'w-5 bg-amber-500'
                                        : 'w-1.5 bg-amber-200/20'
                                        }`}
                                    onClick={() => setActiveIndex(i)}
                                />
                            ))}
                        </div>
                        <button
                            className="h-7 w-7 rounded-full flex items-center justify-center text-amber-200/40 hover:text-amber-200/60 transition-colors"
                            onClick={() => setActiveIndex((i) => (i + 1) % mockInsights.length)}
                        >
                            <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}
            </div>

            {/* Pride Strip - Scrollable */}
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                <div className="shrink-0 flex items-center gap-2 rounded-full bg-card px-4 py-2 border border-border/40" style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                        <Heart className="h-3.5 w-3.5 text-primary fill-primary/30" />
                    </div>
                    <span className="text-[11px] font-medium text-foreground whitespace-nowrap">
                        {prideStats.customersChoseYou} {t.customersChoseYou}
                    </span>
                </div>

                <div className="shrink-0 flex items-center gap-2 rounded-full bg-card px-4 py-2 border border-border/40" style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                    <div className="h-7 w-7 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <Shield className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    <span className="text-[11px] font-medium text-foreground whitespace-nowrap">
                        {prideStats.satisfactionStreak} {t.dayStreak}
                    </span>
                </div>

                <div className="shrink-0 flex items-center gap-2 rounded-full bg-card px-4 py-2 border border-border/40" style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                    <div className="h-7 w-7 rounded-full bg-amber-500/10 flex items-center justify-center">
                        <Zap className="h-3.5 w-3.5 text-amber-600 fill-amber-600/30" />
                    </div>
                    <span className="text-[11px] font-medium text-foreground whitespace-nowrap">
                        {currentLanguage === 'ar' ? prideStats.responseSpeedAr : prideStats.responseSpeed}
                    </span>
                </div>
            </div>

            {/* Reputation Growth */}
            <div className="rounded-3xl bg-card p-5 border border-border/40" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Award className="h-4 w-4 text-primary" />
                        </div>
                        <span className={cn(
                            "text-sm font-bold text-foreground",
                            currentLanguage === 'ar' ? 'font-ar-display' : 'font-display'
                        )}>
                            {t.reputationGrowth}
                        </span>
                    </div>
                    {levelProgress.next ? (
                        <Badge className="text-[10px] h-5 px-2.5 bg-primary/10 text-primary border border-primary/20 font-semibold rounded-full">
                            {t.next} {currentLanguage === 'ar' ? levelProgress.next.labelAr : levelProgress.next.label} {levelProgress.next.badge}
                        </Badge>
                    ) : (
                        <Badge className="text-[10px] h-5 px-2.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 font-semibold rounded-full">
                            {levelProgress.current.badge} {currentLanguage === 'ar' ? levelProgress.current.labelAr : levelProgress.current.label}
                        </Badge>
                    )}
                </div>

                <div className="h-2.5 w-full rounded-full bg-secondary overflow-hidden mb-2">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-700"
                        style={{ width: `${Math.min(levelProgress.percentage, 100)}%` }}
                    />
                </div>

                {levelProgress.next ? (
                    <p className={cn(
                        "text-xs text-muted-foreground",
                        currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                    )}>
                        <span className="font-bold text-foreground">{levelProgress.remaining}</span> {t.jobsAway}
                    </p>
                ) : (
                    <p className={cn(
                        "text-xs text-muted-foreground",
                        currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                    )}>
                        {currentLanguage === 'ar' ? 'وصلت لأعلى مستوى! 🎉' : 'You reached the top level! 🎉'}
                    </p>
                )}
            </div>
        </div>
    );
}
