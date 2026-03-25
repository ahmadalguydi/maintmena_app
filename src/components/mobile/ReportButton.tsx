import { useState } from 'react';
import { Flag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ReportButtonProps {
    contentType: 'profile' | 'message' | 'quote' | 'request' | 'booking' | 'image';
    contentId: string;
    reportedUserId: string;
    currentLanguage: 'en' | 'ar';
    className?: string;
    variant?: 'icon' | 'menu'; // icon = small flag, menu = text button
}

const REPORT_REASONS = {
    inappropriate_image: {
        en: 'Inappropriate Image',
        ar: 'صورة غير لائقة',
    },
    harassment: {
        en: 'Harassment or Abuse',
        ar: 'مضايقة أو إساءة',
    },
    spam: {
        en: 'Spam or Fake',
        ar: 'رسائل مزعجة أو مزيفة',
    },
    scam: {
        en: 'Scam or Fraud',
        ar: 'احتيال أو نصب',
    },
    other: {
        en: 'Other',
        ar: 'أخرى',
    },
};

export const ReportButton = ({
    contentType,
    contentId,
    reportedUserId,
    currentLanguage,
    className,
    variant = 'icon',
}: ReportButtonProps) => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedReason, setSelectedReason] = useState<string>('');
    const [details, setDetails] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const content = {
        en: {
            title: 'Report Content',
            description: 'Help us keep Maintmena safe by reporting inappropriate content.',
            reasonLabel: 'Why are you reporting this?',
            detailsLabel: 'Additional details (optional)',
            detailsPlaceholder: 'Provide more context about the issue...',
            submit: 'Submit Report',
            cancel: 'Cancel',
            success: 'Report submitted. Thank you for helping keep our community safe.',
            error: 'Failed to submit report. Please try again.',
            reportBtn: 'Report',
        },
        ar: {
            title: 'الإبلاغ عن محتوى',
            description: 'ساعدنا في الحفاظ على سلامة ميانتمينا من خلال الإبلاغ عن المحتوى غير الملائم.',
            reasonLabel: 'لماذا تبلغ عن هذا؟',
            detailsLabel: 'تفاصيل إضافية (اختياري)',
            detailsPlaceholder: 'قدم المزيد من المعلومات حول المشكلة...',
            submit: 'إرسال البلاغ',
            cancel: 'إلغاء',
            success: 'تم إرسال البلاغ. شكرًا لمساعدتك في الحفاظ على أمان مجتمعنا.',
            error: 'فشل إرسال البلاغ. يرجى المحاولة مرة أخرى.',
            reportBtn: 'إبلاغ',
        },
    };

    const t = content[currentLanguage];

    const handleSubmit = async () => {
        if (!user || !selectedReason) return;

        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('user_reports').insert({
                reporter_id: user.id,
                content_type: contentType,
                content_id: contentId,
                reported_user_id: reportedUserId,
                reason: selectedReason,
                details: details.trim() || null,
            });

            if (error) throw error;

            toast.success(t.success);
            setIsOpen(false);
            setSelectedReason('');
            setDetails('');
        } catch (error) {
            console.error('Report submission error:', error);
            toast.error(t.error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Don't show report button if user is not logged in or is reporting themselves
    if (!user || user.id === reportedUserId) return null;

    return (
        <>
            {variant === 'icon' ? (
                <button
                    onClick={() => setIsOpen(true)}
                    className={cn(
                        'p-2 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors',
                        className
                    )}
                    aria-label={t.reportBtn}
                >
                    <Flag size={16} />
                </button>
            ) : (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(true)}
                    className={cn('text-muted-foreground hover:text-destructive', className)}
                >
                    <Flag size={14} className={currentLanguage === 'ar' ? 'ml-2' : 'mr-2'} />
                    {t.reportBtn}
                </Button>
            )}

            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
                    <SheetHeader className="text-left">
                        <SheetTitle className={currentLanguage === 'ar' ? 'font-ar-display text-right' : ''}>
                            {t.title}
                        </SheetTitle>
                        <SheetDescription className={currentLanguage === 'ar' ? 'font-ar-body text-right' : ''}>
                            {t.description}
                        </SheetDescription>
                    </SheetHeader>

                    <div className="mt-6 space-y-6" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
                        {/* Reason Selection */}
                        <div className="space-y-3">
                            <Label className={currentLanguage === 'ar' ? 'font-ar-body' : ''}>
                                {t.reasonLabel}
                            </Label>
                            <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
                                {Object.entries(REPORT_REASONS).map(([value, labels]) => (
                                    <div
                                        key={value}
                                        className={cn(
                                            'flex items-center space-x-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors cursor-pointer',
                                            selectedReason === value && 'border-primary bg-primary/5'
                                        )}
                                        onClick={() => setSelectedReason(value)}
                                    >
                                        <RadioGroupItem value={value} id={value} />
                                        <Label
                                            htmlFor={value}
                                            className={cn('flex-1 cursor-pointer', currentLanguage === 'ar' ? 'font-ar-body mr-3' : '')}
                                        >
                                            {labels[currentLanguage]}
                                        </Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>

                        {/* Details */}
                        <div className="space-y-2">
                            <Label className={currentLanguage === 'ar' ? 'font-ar-body' : ''}>
                                {t.detailsLabel}
                            </Label>
                            <Textarea
                                value={details}
                                onChange={(e) => setDetails(e.target.value)}
                                placeholder={t.detailsPlaceholder}
                                rows={3}
                                className={currentLanguage === 'ar' ? 'font-ar-body text-right' : ''}
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setIsOpen(false)}
                            >
                                {t.cancel}
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={handleSubmit}
                                disabled={!selectedReason || isSubmitting}
                            >
                                {isSubmitting ? '...' : t.submit}
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
};
