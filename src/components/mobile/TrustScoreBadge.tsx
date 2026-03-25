import React, { useState } from 'react';
import { Info, Shield, TrendingUp, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

interface TrustScoreBadgeProps {
    score: number;
    currentLanguage: 'en' | 'ar';
    size?: 'sm' | 'md' | 'lg';
}

// Score level thresholds and styles
const getScoreLevel = (score: number) => {
    if (score >= 85) return { level: 'excellent', color: 'text-green-600', bg: 'bg-green-500/10', icon: '⭐' };
    if (score >= 70) return { level: 'good', color: 'text-primary', bg: 'bg-primary/10', icon: '✅' };
    if (score >= 50) return { level: 'at_risk', color: 'text-orange-500', bg: 'bg-orange-500/10', icon: '⚠️' };
    return { level: 'low', color: 'text-red-500', bg: 'bg-red-500/10', icon: '🔻' };
};

export function TrustScoreBadge({ score, currentLanguage, size = 'md' }: TrustScoreBadgeProps) {
    const [showInfo, setShowInfo] = useState(false);
    const { level, color, bg } = getScoreLevel(score);

    const sizeClasses = {
        sm: 'text-sm',
        md: 'text-lg',
        lg: 'text-2xl',
    };

    const content = {
        ar: {
            trustScore: 'نقاط الثقة',
            whatIsThis: 'ماذا تعني؟',
            description: 'نقاط الثقة تعكس موثوقية مقدم الخدمة بناءً على أدائه الفعلي.',
            factors: 'العوامل المؤثرة:',
            incidentRate: 'معدل المشاكل',
            incidentDesc: 'عدد الشكاوى مقارنة بعدد المشاريع',
            responseRate: 'سرعة الرد',
            responseDesc: 'الاستجابة لطلبات المساعدة',
            onTimeRate: 'الالتزام بالمواعيد',
            onTimeDesc: 'الوصول في الوقت المحدد',
            completionRate: 'معدل الإنجاز',
            completionDesc: 'إكمال المشاريع بنجاح',
            levels: {
                excellent: 'ممتاز',
                good: 'جيد',
                at_risk: 'يحتاج تحسين',
                low: 'منخفض'
            }
        },
        en: {
            trustScore: 'Trust Score',
            whatIsThis: 'What does this mean?',
            description: 'Trust Score reflects how reliable this service provider is based on their actual performance.',
            factors: 'Factors that affect the score:',
            incidentRate: 'Incident Rate',
            incidentDesc: 'Complaints relative to total jobs',
            responseRate: 'Response Rate',
            responseDesc: 'Responding to assistance requests',
            onTimeRate: 'Punctuality',
            onTimeDesc: 'Arriving on scheduled time',
            completionRate: 'Completion Rate',
            completionDesc: 'Successfully finishing projects',
            levels: {
                excellent: 'Excellent',
                good: 'Good',
                at_risk: 'Needs Improvement',
                low: 'Low'
            }
        }
    };

    const t = content[currentLanguage];
    const levelLabel = t.levels[level as keyof typeof t.levels];

    return (
        <Dialog open={showInfo} onOpenChange={setShowInfo}>
            <DialogTrigger asChild>
                <button className="text-center group cursor-pointer">
                    <div className={cn(
                        "font-bold flex items-center justify-center gap-1",
                        sizeClasses[size],
                        color
                    )}>
                        <span>{score}</span>
                        <Info
                            className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity"
                        />
                    </div>
                    <span className={cn(
                        "text-xs text-muted-foreground",
                        currentLanguage === 'ar' && 'font-ar-body'
                    )}>
                        {t.trustScore}
                    </span>
                </button>
            </DialogTrigger>

            <DialogContent className="max-w-sm rounded-3xl" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
                <DialogHeader>
                    <DialogTitle className={cn(
                        "flex items-center gap-2",
                        currentLanguage === 'ar' && 'font-ar-display'
                    )}>
                        <Shield className="w-5 h-5 text-primary" />
                        {t.trustScore}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Score Display */}
                    <div className={cn(
                        "flex items-center justify-center gap-4 p-4 rounded-2xl",
                        bg
                    )}>
                        <div className="text-4xl font-bold">{score}</div>
                        <div className={cn("text-sm font-medium", color)}>
                            {levelLabel}
                        </div>
                    </div>

                    {/* Description */}
                    <p className={cn(
                        "text-sm text-muted-foreground",
                        currentLanguage === 'ar' && 'font-ar-body'
                    )}>
                        {t.description}
                    </p>

                    {/* Factors */}
                    <div>
                        <p className={cn(
                            "text-sm font-semibold mb-3",
                            currentLanguage === 'ar' && 'font-ar-body'
                        )}>
                            {t.factors}
                        </p>

                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="p-1.5 rounded-lg bg-red-500/10">
                                    <AlertTriangle className="w-4 h-4 text-red-500" />
                                </div>
                                <div>
                                    <p className={cn("text-sm font-medium", currentLanguage === 'ar' && 'font-ar-body')}>
                                        {t.incidentRate} (50%)
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {t.incidentDesc}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="p-1.5 rounded-lg bg-blue-500/10">
                                    <TrendingUp className="w-4 h-4 text-blue-500" />
                                </div>
                                <div>
                                    <p className={cn("text-sm font-medium", currentLanguage === 'ar' && 'font-ar-body')}>
                                        {t.responseRate} (20%)
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {t.responseDesc}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="p-1.5 rounded-lg bg-orange-500/10">
                                    <Clock className="w-4 h-4 text-orange-500" />
                                </div>
                                <div>
                                    <p className={cn("text-sm font-medium", currentLanguage === 'ar' && 'font-ar-body')}>
                                        {t.onTimeRate} (15%)
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {t.onTimeDesc}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="p-1.5 rounded-lg bg-green-500/10">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                </div>
                                <div>
                                    <p className={cn("text-sm font-medium", currentLanguage === 'ar' && 'font-ar-body')}>
                                        {t.completionRate} (15%)
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {t.completionDesc}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
