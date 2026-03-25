import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { IssueType, OutcomeType, OUTCOME_LABELS } from '@/hooks/useJobIssues';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    AlertTriangle,
    Phone,
    XCircle,
    Wrench,
    DollarSign,
    LogOut,
    Send,
    ChevronRight,
    ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface IssueRaiserSheetProps {
    isOpen?: boolean;
    open?: boolean;
    onClose?: () => void;
    onOpenChange?: (open: boolean) => void;
    jobId: string;
    jobType: 'request' | 'booking';
    currentLanguage?: 'en' | 'ar';
    originalQuoteAmount?: number;
    onSuccess?: () => void;
}

type IssueCategory = {
    type: IssueType;
    icon: React.ElementType;
    label: { en: string; ar: string };
    outcomes: OutcomeType[];
};

const ISSUE_CATEGORIES: IssueCategory[] = [
    {
        type: 'no_response',
        icon: Phone,
        label: { en: 'No Response', ar: 'لا يرد' },
        outcomes: ['no_response_warning', 'no_response_cancel'],
    },
    {
        type: 'no_show',
        icon: XCircle,
        label: { en: 'Did Not Show Up', ar: 'لم يحضر' },
        outcomes: ['no_show_warning', 'no_show_cancel'],
    },
    {
        type: 'quality',
        icon: Wrench,
        label: { en: 'Quality Issue', ar: 'مشكلة جودة' },
        outcomes: ['quality_redo', 'quality_refund'],
    },
    {
        type: 'price_change',
        icon: DollarSign,
        label: { en: 'Price Changed', ar: 'تغير السعر' },
        outcomes: ['price_change_accept', 'price_change_reject'],
    },
    {
        type: 'exit',
        icon: LogOut,
        label: { en: 'Want to Cancel', ar: 'أريد الإلغاء' },
        outcomes: ['exit_buyer'],
    },
];

export const IssueRaiserSheet = ({
    isOpen,
    open,
    onClose,
    onOpenChange,
    jobId,
    jobType,
    currentLanguage = 'en',
    originalQuoteAmount,
    onSuccess,
}: IssueRaiserSheetProps) => {
    // Support both prop naming conventions
    const sheetOpen = isOpen ?? open ?? false;
    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            onClose?.();
        }
        onOpenChange?.(newOpen);
    };

    const isArabic = currentLanguage === 'ar';
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [step, setStep] = useState<'category' | 'outcome' | 'note'>(
        'category'
    );
    const [selectedCategory, setSelectedCategory] = useState<IssueCategory | null>(null);
    const [selectedOutcome, setSelectedOutcome] = useState<OutcomeType | null>(null);
    const [note, setNote] = useState('');

    const content = {
        en: {
            title: 'Report an Issue',
            selectIssue: 'What happened?',
            selectOutcome: 'What would you like?',
            addNote: 'Add details (optional)',
            notePlaceholder: 'Describe what happened...',
            submit: 'Submit',
            submitting: 'Submitting...',
            back: 'Back',
            next: 'Next',
        },
        ar: {
            title: 'الإبلاغ عن مشكلة',
            selectIssue: 'ما الذي حدث؟',
            selectOutcome: 'ماذا تريد؟',
            addNote: 'أضف تفاصيل (اختياري)',
            notePlaceholder: 'صف ما حدث...',
            submit: 'إرسال',
            submitting: 'جاري الإرسال...',
            back: 'رجوع',
            next: 'التالي',
        },
    };

    const t = content[currentLanguage];

    const resetState = () => {
        setStep('category');
        setSelectedCategory(null);
        setSelectedOutcome(null);
        setNote('');
    };

    const handleClose = () => {
        handleOpenChange(false);
        setTimeout(resetState, 300);
    };

    const raiseIssueMutation = useMutation({
        mutationFn: async () => {
            if (!user?.id || !selectedCategory || !selectedOutcome) {
                throw new Error('Missing required data');
            }

            const { error } = await (supabase as any)
                .from('job_issues')
                .insert({
                    job_type: jobType,
                    job_id: jobId,
                    issue_type: selectedCategory.type,
                    outcome_selected: selectedOutcome,
                    raised_by: user.id,
                    raised_note: note || null,
                    status: 'pending',
                });

            if (error) throw error;
        },
        onSuccess: () => {
            toast.success(isArabic ? 'تم إرسال الشكوى' : 'Issue reported');
            queryClient.invalidateQueries({ queryKey: ['active-job-issue'] });
            queryClient.invalidateQueries({ queryKey: ['job-issues'] });
            handleClose();
            onSuccess?.();
        },
        onError: () => {
            toast.error(isArabic ? 'حدث خطأ' : 'Error reporting issue');
        },
    });

    const handleSubmit = () => {
        raiseIssueMutation.mutate();
    };

    const handleCategorySelect = (category: IssueCategory) => {
        setSelectedCategory(category);
        if (category.outcomes.length === 1) {
            setSelectedOutcome(category.outcomes[0]);
            setStep('note');
        } else {
            setStep('outcome');
        }
    };

    const handleOutcomeSelect = (outcome: OutcomeType) => {
        setSelectedOutcome(outcome);
        setStep('note');
    };

    return (
        <Sheet open={sheetOpen} onOpenChange={handleOpenChange}>
            <SheetContent
                side="bottom"
                className="rounded-t-3xl max-h-[85vh] overflow-y-auto"
                dir={isArabic ? 'rtl' : 'ltr'}
            >
                <SheetHeader>
                    <SheetTitle className={cn(isArabic && 'font-ar-heading text-right')}>
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-orange-500" />
                            {t.title}
                        </div>
                    </SheetTitle>
                </SheetHeader>

                <div className="mt-6 space-y-4">
                    {/* Step 1: Select Category */}
                    {step === 'category' && (
                        <>
                            <p className={cn(
                                'text-sm text-muted-foreground',
                                isArabic && 'font-ar-body text-right'
                            )}>
                                {t.selectIssue}
                            </p>
                            <div className="space-y-2">
                                {ISSUE_CATEGORIES.map((category) => {
                                    const Icon = category.icon;
                                    return (
                                        <button
                                            key={category.type}
                                            onClick={() => handleCategorySelect(category)}
                                            className={cn(
                                                'w-full p-4 rounded-xl border border-border bg-card flex items-center gap-3 hover:bg-muted transition-colors',
                                                isArabic && 'flex-row-reverse'
                                            )}
                                        >
                                            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                                                <Icon className="w-5 h-5 text-orange-600" />
                                            </div>
                                            <span className={cn(
                                                'flex-1 font-medium',
                                                isArabic ? 'font-ar-body text-right' : 'text-left'
                                            )}>
                                                {isArabic ? category.label.ar : category.label.en}
                                            </span>
                                            {isArabic ? (
                                                <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                                            ) : (
                                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {/* Step 2: Select Outcome */}
                    {step === 'outcome' && selectedCategory && (
                        <>
                            <p className={cn(
                                'text-sm text-muted-foreground',
                                isArabic && 'font-ar-body text-right'
                            )}>
                                {t.selectOutcome}
                            </p>
                            <RadioGroup
                                value={selectedOutcome || ''}
                                onValueChange={(value) => handleOutcomeSelect(value as OutcomeType)}
                                className="space-y-2"
                            >
                                {selectedCategory.outcomes.map((outcome) => {
                                    const label = OUTCOME_LABELS[outcome];
                                    return (
                                        <div
                                            key={outcome}
                                            className={cn(
                                                'flex items-center space-x-3 p-4 rounded-xl border border-border bg-card',
                                                isArabic && 'flex-row-reverse space-x-reverse'
                                            )}
                                        >
                                            <RadioGroupItem value={outcome} id={outcome} />
                                            <Label
                                                htmlFor={outcome}
                                                className={cn(
                                                    'flex-1 cursor-pointer',
                                                    isArabic && 'font-ar-body text-right'
                                                )}
                                            >
                                                {isArabic ? label?.ar : label?.en}
                                            </Label>
                                        </div>
                                    );
                                })}
                            </RadioGroup>
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setSelectedCategory(null);
                                    setStep('category');
                                }}
                                className="w-full"
                            >
                                {t.back}
                            </Button>
                        </>
                    )}

                    {/* Step 3: Add Note */}
                    {step === 'note' && (
                        <>
                            <p className={cn(
                                'text-sm text-muted-foreground',
                                isArabic && 'font-ar-body text-right'
                            )}>
                                {t.addNote}
                            </p>
                            <Textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder={t.notePlaceholder}
                                className={cn(
                                    'min-h-[100px] rounded-xl resize-none',
                                    isArabic && 'font-ar-body text-right'
                                )}
                            />
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        if (selectedCategory && selectedCategory.outcomes.length > 1) {
                                            setStep('outcome');
                                        } else {
                                            setSelectedCategory(null);
                                            setStep('category');
                                        }
                                    }}
                                    className="flex-1"
                                >
                                    {t.back}
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={raiseIssueMutation.isPending}
                                    className="flex-1 gap-2"
                                >
                                    <Send size={16} />
                                    {raiseIssueMutation.isPending ? t.submitting : t.submit}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
};
