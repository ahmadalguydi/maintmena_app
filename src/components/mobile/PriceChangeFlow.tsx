import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { JobIssue, OUTCOME_LABELS } from '@/hooks/useJobIssues';
import { Button } from '@/components/ui/button';
import { SoftCard } from '@/components/mobile/SoftCard';
import { BodySmall, Caption } from '@/components/mobile/Typography';
import { DollarSign, Check, X, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';

interface PriceChangeFlowProps {
    issue: JobIssue;
    onResolved?: () => void;
    currentLanguage?: 'en' | 'ar';
}

export const PriceChangeFlow = ({
    issue,
    onResolved,
    currentLanguage = 'en'
}: PriceChangeFlowProps) => {
    const isArabic = currentLanguage === 'ar';
    const queryClient = useQueryClient();
    const { formatAmount } = useCurrency();

    // Parse the proposed price from response_note if available
    const proposedPrice = issue.response_note ? parseFloat(issue.response_note) : null;

    const content = {
        en: {
            title: 'Price Change Request',
            currentPrice: 'Current Price',
            newPrice: 'Proposed Price',
            accept: 'Accept New Price',
            reject: 'Reject',
            processing: 'Processing...',
            sellerResponse: 'Seller Response',
        },
        ar: {
            title: 'طلب تغيير السعر',
            currentPrice: 'السعر الحالي',
            newPrice: 'السعر المقترح',
            accept: 'قبول السعر الجديد',
            reject: 'رفض',
            processing: 'جاري المعالجة...',
            sellerResponse: 'رد البائع',
        },
    };

    const t = content[currentLanguage];

    const resolveMutation = useMutation({
        mutationFn: async (accepted: boolean) => {
            const { error } = await (supabase as any)
                .from('job_issues')
                .update({
                    status: accepted ? 'resolved' : 'no_agreement',
                    resolution_type: accepted ? 'mutual' : undefined,
                    resolved_at: accepted ? new Date().toISOString() : null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', issue.id);

            if (error) throw error;
            return accepted;
        },
        onSuccess: (accepted) => {
            toast.success(
                accepted
                    ? (isArabic ? 'تم قبول السعر الجديد' : 'New price accepted')
                    : (isArabic ? 'تم رفض طلب تغيير السعر' : 'Price change rejected')
            );
            queryClient.invalidateQueries({ queryKey: ['active-job-issue'] });
            queryClient.invalidateQueries({ queryKey: ['job-issues'] });
            onResolved?.();
        },
        onError: () => {
            toast.error(isArabic ? 'حدث خطأ' : 'Error processing request');
        },
    });

    const outcomeLabel = OUTCOME_LABELS[issue.outcome_selected];

    return (
        <SoftCard className="p-4 border-2 border-orange-200 bg-orange-50/50 dark:bg-orange-950/10">
            <div className={cn("space-y-4", isArabic && "text-right")}>
                {/* Header */}
                <div className={cn("flex items-center gap-2", isArabic && "flex-row-reverse")}>
                    <div className="p-2 rounded-lg bg-orange-500/20">
                        <DollarSign className="w-5 h-5 text-orange-600" />
                    </div>
                    <BodySmall lang={currentLanguage} className="font-semibold text-orange-800 dark:text-orange-200">
                        {t.title}
                    </BodySmall>
                </div>

                {/* Price Comparison */}
                {proposedPrice && (
                    <div className={cn(
                        "flex items-center justify-center gap-4",
                        isArabic && "flex-row-reverse"
                    )}>
                        <div className="text-center">
                            <Caption className="text-muted-foreground">{t.currentPrice}</Caption>
                            <p className="font-semibold line-through text-muted-foreground">
                                {/* Original price would need to be passed in - using placeholder */}
                                -
                            </p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-muted-foreground" />
                        <div className="text-center">
                            <Caption className="text-muted-foreground">{t.newPrice}</Caption>
                            <p className="font-bold text-lg text-orange-600">
                                {formatAmount(proposedPrice)}
                            </p>
                        </div>
                    </div>
                )}

                {/* Seller's Note */}
                {issue.response_note && !proposedPrice && (
                    <div className="bg-white dark:bg-background rounded-xl p-3">
                        <Caption className="text-muted-foreground mb-1">{t.sellerResponse}</Caption>
                        <p className={cn("text-sm", isArabic && "font-ar-body")}>
                            {issue.response_note}
                        </p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className={cn("flex gap-2", isArabic && "flex-row-reverse")}>
                    <Button
                        variant="outline"
                        onClick={() => resolveMutation.mutate(false)}
                        disabled={resolveMutation.isPending}
                        className="flex-1 gap-2"
                    >
                        <X size={16} />
                        {t.reject}
                    </Button>
                    <Button
                        onClick={() => resolveMutation.mutate(true)}
                        disabled={resolveMutation.isPending}
                        className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                    >
                        <Check size={16} />
                        {resolveMutation.isPending ? t.processing : t.accept}
                    </Button>
                </div>
            </div>
        </SoftCard>
    );
};
