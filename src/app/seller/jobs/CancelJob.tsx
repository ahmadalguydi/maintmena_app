import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

const CANCEL_REASONS = [
  {
    key: 'unable_to_attend',
    en: 'I am unable to attend',
    ar: 'لا أستطيع الحضور',
  },
  {
    key: 'customer_request',
    en: 'Customer requested cancellation',
    ar: 'طلب العميل الإلغاء',
  },
  {
    key: 'wrong_details',
    en: 'Wrong job details',
    ar: 'تفاصيل الطلب غير صحيحة',
  },
  {
    key: 'running_too_late',
    en: 'Running too late / unable to make it on time',
    ar: 'تأخرت كثيراً ولا أستطيع الوصول في الوقت',
  },
  {
    key: 'other',
    en: 'Other reason',
    ar: 'سبب آخر',
  },
] as const;

export const CancelJob = ({ currentLanguage }: { currentLanguage: 'en' | 'ar' }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const isRTL = currentLanguage === 'ar';

  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const content = {
    en: {
      title: 'Cancel Job',
      subtitle: 'Please tell us why you are cancelling this job.',
      reasonLabel: 'Reason for cancellation',
      noteLabel: 'Additional note (optional)',
      notePlaceholder: 'Add details here...',
      confirmButton: 'Confirm Cancellation',
      cancelButton: 'Keep Job',
      successMsg: 'Job cancelled successfully.',
      errorMsg: 'Failed to cancel the job. Please try again.',
      warning: 'This action cannot be undone. The request will be returned to the dispatch queue for reassignment.',
    },
    ar: {
      title: 'إلغاء المهمة',
      subtitle: 'يرجى إخبارنا بسبب إلغاء هذه المهمة.',
      reasonLabel: 'سبب الإلغاء',
      noteLabel: 'ملاحظة إضافية (اختياري)',
      notePlaceholder: 'أضف تفاصيل هنا...',
      confirmButton: 'تأكيد الإلغاء',
      cancelButton: 'الرجوع للمهمة',
      successMsg: 'تم إلغاء المهمة بنجاح.',
      errorMsg: 'فشل إلغاء المهمة. يرجى المحاولة مرة أخرى.',
      warning: 'لا يمكن التراجع عن هذا الإجراء. سيُعاد الطلب إلى قائمة التوزيع لإعادة التعيين.',
    },
  };

  const t = content[currentLanguage];

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Missing job ID');
      if (!selectedReason) throw new Error('Missing cancellation reason');

      // Check current status - only allow cancellation before work starts
      const { data: current } = await (supabase as any)
        .from('maintenance_requests')
        .select('status')
        .eq('id', id)
        .maybeSingle();

      const cancellableStatuses = ['accepted', 'en_route', 'arrived'];
      if (!current || !cancellableStatuses.includes(current.status)) {
        throw new Error(currentLanguage === 'ar'
          ? 'لا يمكن إلغاء هذا الطلب في حالته الحالية'
          : 'Cannot cancel this job in its current state');
      }

      const updateData: Record<string, unknown> = {
        status: 'cancelled',
        assigned_seller_id: null,
        cancellation_reason: selectedReason,
      };
      if (note.trim()) {
        updateData.cancellation_note = note.trim();
      }
      const { error } = await (supabase as unknown as { from: (table: string) => { update: (data: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<{ error: unknown }> } } })
        .from('maintenance_requests')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t.successMsg);
      queryClient.invalidateQueries({ queryKey: ['seller-active-job'] });
      queryClient.invalidateQueries({ queryKey: ['seller-active-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['seller-scheduled-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['seller-home'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-dispatch-requests'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-activity'] });
      navigate('/app/seller/home', { replace: true });
    },
    onError: () => {
      toast.error(t.errorMsg);
    },
  });

  return (
    <div
      className="min-h-app bg-background flex flex-col pt-safe"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <header className="px-5 py-4 flex items-center gap-3 border-b border-border/40 bg-card">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -mx-2 rounded-full hover:bg-muted transition-colors"
          aria-label={isRTL ? 'رجوع' : 'Go back'}
        >
          {isRTL ? (
            <ArrowLeft className="h-5 w-5 text-foreground rotate-180" />
          ) : (
            <ArrowLeft className="h-5 w-5 text-foreground" />
          )}
        </button>
        <h1
          className={cn(
            'text-lg font-bold text-foreground',
            isRTL ? 'font-ar-heading' : 'font-heading',
          )}
        >
          {t.title}
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="p-5 space-y-6">
          {/* Warning banner */}
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20 px-4 py-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
            <p
              className={cn(
                'text-sm font-medium text-amber-800 leading-snug',
                isRTL ? 'font-ar-body' : 'font-body',
              )}
            >
              {t.warning}
            </p>
          </div>

          {/* Subtitle */}
          <p
            className={cn(
              'text-sm text-muted-foreground',
              isRTL ? 'font-ar-body' : 'font-body',
            )}
          >
            {t.subtitle}
          </p>

          {/* Reason selection */}
          <div className="space-y-2">
            <p
              className={cn(
                'text-sm font-semibold text-foreground',
                isRTL ? 'font-ar-body' : 'font-body',
              )}
            >
              {t.reasonLabel}
            </p>
            <div className="space-y-2">
              {CANCEL_REASONS.map((reason) => {
                const isSelected = selectedReason === reason.key;
                return (
                  <button
                    key={reason.key}
                    onClick={() => setSelectedReason(reason.key)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-start transition-colors',
                      isSelected
                        ? 'border-destructive/40 bg-destructive/5 text-destructive'
                        : 'border-border/60 bg-card text-foreground hover:bg-muted/40',
                    )}
                  >
                    <div
                      className={cn(
                        'h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors',
                        isSelected
                          ? 'border-destructive bg-destructive'
                          : 'border-muted-foreground/40',
                      )}
                    >
                      {isSelected && (
                        <div className="h-2 w-2 rounded-full bg-white" />
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-sm font-medium',
                        isRTL ? 'font-ar-body' : 'font-body',
                      )}
                    >
                      {currentLanguage === 'ar' ? reason.ar : reason.en}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional note */}
          <div className="space-y-2">
            <p
              className={cn(
                'text-sm font-semibold text-foreground',
                isRTL ? 'font-ar-body' : 'font-body',
              )}
            >
              {t.noteLabel}
            </p>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.notePlaceholder}
              rows={3}
              className={cn(
                'resize-none rounded-2xl text-sm',
                isRTL ? 'font-ar-body text-right' : 'font-body',
              )}
              maxLength={500}
            />
          </div>
        </div>
      </main>

      {/* Actions */}
      <div className="px-5 pb-safe-or-6 pt-4 space-y-3 border-t border-border/30 bg-background">
        <Button
          variant="destructive"
          size="lg"
          className="w-full h-12 rounded-2xl font-bold"
          disabled={!selectedReason || cancelMutation.isPending}
          onClick={() => cancelMutation.mutate()}
        >
          {cancelMutation.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            t.confirmButton
          )}
        </Button>
        <Button
          variant="ghost"
          size="lg"
          className="w-full h-12 rounded-2xl font-semibold text-muted-foreground"
          disabled={cancelMutation.isPending}
          onClick={() => navigate(-1)}
        >
          {t.cancelButton}
        </Button>
      </div>
    </div>
  );
};
