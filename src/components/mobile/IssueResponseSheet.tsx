import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { JobIssue, OUTCOME_LABELS } from '@/hooks/useJobIssues';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { MessageCircle, Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IssueResponseSheetProps {
    isOpen?: boolean;
    open?: boolean;
    onClose?: () => void;
    onOpenChange?: (open: boolean) => void;
    issue: JobIssue;
    currentLanguage?: 'en' | 'ar';
    onSuccess?: () => void;
}

export const IssueResponseSheet = ({
    isOpen,
    open,
    onClose,
    onOpenChange,
    issue,
    currentLanguage = 'en',
    onSuccess,
}: IssueResponseSheetProps) => {
    // Support both prop naming conventions
    const sheetOpen = isOpen ?? open ?? false;
    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            onClose?.();
        }
        onOpenChange?.(newOpen);
    };

    const isArabic = currentLanguage === 'ar';
    const queryClient = useQueryClient();
    const [responseNote, setResponseNote] = useState('');

    const content = {
        en: {
            title: 'Respond to Issue',
            issueRaised: 'Issue Raised',
            theirNote: 'Their Note',
            yourResponse: 'Your Response',
            placeholder: 'Write your response here...',
            send: 'Send Response',
            sending: 'Sending...',
        },
        ar: {
            title: 'الرد على المشكلة',
            issueRaised: 'المشكلة المرفوعة',
            theirNote: 'ملاحظتهم',
            yourResponse: 'ردك',
            placeholder: 'اكتب ردك هنا...',
            send: 'إرسال الرد',
            sending: 'جاري الإرسال...',
        },
    };

    const t = content[currentLanguage];

    const respondMutation = useMutation({
        mutationFn: async () => {
            const { error } = await (supabase as any)
                .from('job_issues')
                .update({
                    response_note: responseNote,
                    status: 'responded',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', issue.id);

            if (error) throw error;
        },
        onSuccess: () => {
            toast.success(isArabic ? 'تم إرسال الرد' : 'Response sent');
            queryClient.invalidateQueries({ queryKey: ['active-job-issue'] });
            queryClient.invalidateQueries({ queryKey: ['job-issues'] });
            setResponseNote('');
            handleOpenChange(false);
            onSuccess?.();
        },
        onError: () => {
            toast.error(isArabic ? 'حدث خطأ' : 'Error sending response');
        },
    });

    const handleSubmit = () => {
        if (!responseNote.trim()) {
            toast.error(isArabic ? 'يرجى كتابة رد' : 'Please write a response');
            return;
        }
        respondMutation.mutate();
    };

    const outcomeLabel = OUTCOME_LABELS[issue.outcome_selected];

    return (
        <Sheet open={sheetOpen} onOpenChange={handleOpenChange}>
            <SheetContent side="bottom" className="rounded-t-3xl" dir={isArabic ? 'rtl' : 'ltr'}>
                <SheetHeader>
                    <SheetTitle className={cn(isArabic && 'font-ar-heading text-right')}>
                        {t.title}
                    </SheetTitle>
                </SheetHeader>

                <div className="mt-6 space-y-4">
                    {/* Issue Summary */}
                    <div className="bg-orange-50 dark:bg-orange-950/20 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <MessageCircle className="w-4 h-4 text-orange-600" />
                            <span className={cn(
                                'text-sm font-medium text-orange-800 dark:text-orange-200',
                                isArabic && 'font-ar-body'
                            )}>
                                {t.issueRaised}
                            </span>
                        </div>
                        <p className={cn(
                            'font-semibold text-orange-900 dark:text-orange-100',
                            isArabic ? 'font-ar-body' : ''
                        )}>
                            {isArabic ? outcomeLabel?.ar : outcomeLabel?.en}
                        </p>
                    </div>

                    {/* Their Note */}
                    {issue.raised_note && (
                        <div>
                            <label className={cn(
                                'text-sm text-muted-foreground block mb-1',
                                isArabic && 'font-ar-body'
                            )}>
                                {t.theirNote}
                            </label>
                            <div className="bg-muted rounded-xl p-3">
                                <p className={cn(
                                    'text-sm',
                                    isArabic && 'font-ar-body'
                                )}>
                                    {issue.raised_note}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Response Input */}
                    <div>
                        <label className={cn(
                            'text-sm font-medium block mb-2',
                            isArabic && 'font-ar-body'
                        )}>
                            {t.yourResponse}
                        </label>
                        <Textarea
                            value={responseNote}
                            onChange={(e) => setResponseNote(e.target.value)}
                            placeholder={t.placeholder}
                            className={cn(
                                'min-h-[100px] rounded-xl resize-none',
                                isArabic && 'font-ar-body text-right'
                            )}
                        />
                    </div>

                    {/* Submit Button */}
                    <Button
                        onClick={handleSubmit}
                        disabled={respondMutation.isPending || !responseNote.trim()}
                        className="w-full gap-2 rounded-xl h-12"
                    >
                        <Send size={16} />
                        {respondMutation.isPending ? t.sending : t.send}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
};
