import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface RevisionRequestModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    quoteId: string | null;
    sellerId: string | null;
    currentLanguage: 'en' | 'ar';
    onSuccess?: () => void;
}

export default function RevisionRequestModal({
    open,
    onOpenChange,
    quoteId,
    sellerId,
    currentLanguage,
    onSuccess
}: RevisionRequestModalProps) {
    const { user } = useAuth();
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const content = {
        en: {
            title: 'Ask for Revision',
            desc: 'Tell the seller what you\'d like to change about their quote',
            placeholder: 'e.g., Can you lower the price? Or could we schedule it for Thursday instead?',
            cancel: 'Cancel',
            send: 'Send Request',
            sending: 'Sending...',
            success: 'Revision request sent!',
            error: 'Failed to send request'
        },
        ar: {
            title: 'طلب تعديل',
            desc: 'أخبر البائع بما تريد تغييره في عرضه',
            placeholder: 'مثال: هل يمكنك تخفيض السعر؟ أو هل يمكننا تحديد موعد يوم الخميس؟',
            cancel: 'إلغاء',
            send: 'إرسال الطلب',
            sending: 'جاري الإرسال...',
            success: 'تم إرسال طلب التعديل!',
            error: 'فشل إرسال الطلب'
        }
    };

    const t = content[currentLanguage];

    const handleSubmit = async () => {
        if (!message.trim() || !quoteId || !user) return;

        setSubmitting(true);
        try {
            // First, fetch the current quote to store previous values
            const { data: currentQuote, error: fetchError } = await supabase
                .from('quote_submissions')
                .select('price, estimated_duration, proposal')
                .eq('id', quoteId)
                .single();

            if (fetchError) throw fetchError;

            // Update quote status to revision_requested, store the message and previous values
            const { error: quoteError } = await supabase
                .from('quote_submissions')
                .update({
                    status: 'revision_requested',
                    revision_message: message.trim(),
                    revision_requested_at: new Date().toISOString(),
                    previous_price: currentQuote?.price,
                    previous_duration: currentQuote?.estimated_duration,
                    previous_proposal: currentQuote?.proposal
                })
                .eq('id', quoteId);

            if (quoteError) throw quoteError;

            // Send notification to seller
            if (sellerId) {
                await supabase.from('notifications').insert({
                    user_id: sellerId,
                    title: currentLanguage === 'ar' ? 'طلب تعديل على عرضك' : 'Revision Requested',
                    message: message.trim().substring(0, 200),
                    notification_type: 'quote_revision_requested',
                    content_id: quoteId,
                });
            }

            toast.success(t.success);
            setMessage('');
            onOpenChange(false);
            onSuccess?.();
        } catch (error: any) {
            console.error('Revision request error:', error);
            toast.error(t.error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-primary" />
                        {t.title}
                    </DialogTitle>
                    <DialogDescription>
                        {t.desc}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <Textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={t.placeholder}
                        rows={4}
                        className="resize-none rounded-2xl"
                    />
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={submitting}
                        className="rounded-full"
                    >
                        {t.cancel}
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={submitting || !message.trim()}
                        className="rounded-full gap-2"
                    >
                        <Send size={16} />
                        {submitting ? t.sending : t.send}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
