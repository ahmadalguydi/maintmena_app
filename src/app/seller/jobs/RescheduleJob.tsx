import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CalendarClock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const TIME_SLOTS = [
  { key: '09:00', en: '9:00 AM', ar: '٩:٠٠ ص' },
  { key: '10:00', en: '10:00 AM', ar: '١٠:٠٠ ص' },
  { key: '11:00', en: '11:00 AM', ar: '١١:٠٠ ص' },
  { key: '13:00', en: '1:00 PM', ar: '١:٠٠ م' },
  { key: '15:00', en: '3:00 PM', ar: '٣:٠٠ م' },
  { key: '17:00', en: '5:00 PM', ar: '٥:٠٠ م' },
  { key: '19:00', en: '7:00 PM', ar: '٧:٠٠ م' },
] as const;

export const RescheduleJob = ({ currentLanguage }: { currentLanguage: 'en' | 'ar' }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isRTL = currentLanguage === 'ar';

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Fetch current job's scheduled time for pre-fill and display
  const { data: currentJob } = useQuery({
    queryKey: ['job-reschedule-prefill', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase
        .from('maintenance_requests')
        .select('scheduled_for, preferred_start_date, preferred_time_slot')
        .eq('id', id)
        .maybeSingle();
      return data;
    },
    enabled: !!id,
    staleTime: 30_000,
  });

  // Pre-fill form with current scheduled date when data arrives
  useEffect(() => {
    if (!currentJob) return;
    const currentDateStr = currentJob.scheduled_for || currentJob.preferred_start_date;
    if (currentDateStr && !selectedDate) {
      const d = new Date(currentDateStr);
      if (!isNaN(d.getTime())) {
        setSelectedDate(d.toISOString().split('T')[0]);
      }
    }
    if (currentJob.preferred_time_slot && !selectedSlot) {
      setSelectedSlot(currentJob.preferred_time_slot);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentJob]);

  const content = {
    en: {
      title: 'Request Reschedule',
      subtitle: 'Choose a new date and time. The other party will need to approve.',
      currentSchedule: 'Current schedule',
      dateLabel: 'New date',
      slotLabel: 'Preferred time slot',
      submitButton: 'Send Reschedule Request',
      cancelButton: 'Keep Current Schedule',
      successMsg: 'Reschedule request sent. Waiting for approval.',
      errorMsg: 'Failed to send reschedule request. Please try again.',
    },
    ar: {
      title: 'طلب إعادة جدولة',
      subtitle: 'اختر تاريخاً ووقتاً جديدين. سيحتاج الطرف الآخر للموافقة.',
      currentSchedule: 'الموعد الحالي',
      dateLabel: 'التاريخ الجديد',
      slotLabel: 'الوقت المناسب',
      submitButton: 'إرسال طلب إعادة الجدولة',
      cancelButton: 'الإبقاء على الموعد الحالي',
      successMsg: 'تم إرسال طلب إعادة الجدولة. بانتظار الموافقة.',
      errorMsg: 'فشل إرسال طلب إعادة الجدولة. يرجى المحاولة مرة أخرى.',
    },
  };

  const t = content[currentLanguage];

  // Get today's date as min for date picker
  const today = new Date().toISOString().split('T')[0];

  const rescheduleMutation = useMutation({
    mutationFn: async () => {
      if (!id || !selectedDate || !selectedSlot || !user?.id) throw new Error('Missing fields');
      // Build a proper datetime from the date + slot start time (key is already HH:MM)
      const timeStr = selectedSlot ?? '09:00';
      const newDateTimeISO = new Date(`${selectedDate}T${timeStr}:00`).toISOString();
      const { error } = await (supabase as any)
        .from('maintenance_requests')
        .update({
          reschedule_requested_by: user.id,
          reschedule_requested_at: new Date().toISOString(),
          reschedule_new_date: newDateTimeISO,
          reschedule_new_time_slot: selectedSlot,
          reschedule_status: 'pending',
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t.successMsg);
      queryClient.invalidateQueries({ queryKey: ['seller-active-job'] });
      queryClient.invalidateQueries({ queryKey: ['seller-scheduled-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-dispatch-requests'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-activity'] });
      navigate(-1);
    },
    onError: () => {
      toast.error(t.errorMsg);
    },
  });

  const canSubmit = selectedDate && selectedSlot && !rescheduleMutation.isPending;

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
          <ArrowLeft className={cn('h-5 w-5 text-foreground', isRTL && 'rotate-180')} />
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
          {/* Icon + subtitle */}
          <div className="flex items-start gap-3 rounded-2xl border border-border/50 bg-card px-4 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <CalendarClock className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0 mt-0.5">
              <p className={cn('text-sm text-muted-foreground leading-relaxed', isRTL ? 'font-ar-body' : 'font-body')}>
                {t.subtitle}
              </p>
              {(() => {
                const raw = currentJob?.scheduled_for || currentJob?.preferred_start_date;
                if (!raw) return null;
                const d = new Date(raw);
                if (isNaN(d.getTime())) return null;
                return (
                  <p className={cn('mt-1.5 text-xs font-semibold text-primary', isRTL ? 'font-ar-body' : 'font-body')}>
                    {t.currentSchedule}: {d.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })}{' '}
                    {d.toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                );
              })()}
            </div>
          </div>

          {/* Date picker */}
          <div className="space-y-2">
            <p
              className={cn(
                'text-sm font-semibold text-foreground',
                isRTL ? 'font-ar-body' : 'font-body',
              )}
            >
              {t.dateLabel}
            </p>
            <input
              type="date"
              min={today}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={cn(
                'w-full rounded-2xl border border-border/60 bg-card px-4 py-3 text-sm text-foreground',
                'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40',
                isRTL ? 'text-right' : '',
              )}
            />
          </div>

          {/* Time slot selection */}
          <div className="space-y-2">
            <p
              className={cn(
                'text-sm font-semibold text-foreground',
                isRTL ? 'font-ar-body' : 'font-body',
              )}
            >
              {t.slotLabel}
            </p>
            <div className="space-y-2">
              {TIME_SLOTS.map((slot) => {
                const isSelected = selectedSlot === slot.key;
                return (
                  <button
                    key={slot.key}
                    onClick={() => setSelectedSlot(slot.key)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-start transition-colors',
                      isSelected
                        ? 'border-primary/40 bg-primary/5 text-primary'
                        : 'border-border/60 bg-card text-foreground hover:bg-muted/40',
                    )}
                  >
                    <div
                      className={cn(
                        'h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors',
                        isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/40',
                      )}
                    >
                      {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                    </div>
                    <span className={cn('text-sm font-medium', isRTL ? 'font-ar-body' : 'font-body')}>
                      {currentLanguage === 'ar' ? slot.ar : slot.en}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Actions */}
      <div className="px-5 pb-safe-or-6 pt-4 space-y-3 border-t border-border/30 bg-background">
        <Button
          size="lg"
          className="w-full h-12 rounded-2xl font-bold"
          disabled={!canSubmit}
          onClick={() => rescheduleMutation.mutate()}
        >
          {rescheduleMutation.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            t.submitButton
          )}
        </Button>
        <Button
          variant="ghost"
          size="lg"
          className="w-full h-12 rounded-2xl font-semibold text-muted-foreground"
          disabled={rescheduleMutation.isPending}
          onClick={() => navigate(-1)}
        >
          {t.cancelButton}
        </Button>
      </div>
    </div>
  );
};
