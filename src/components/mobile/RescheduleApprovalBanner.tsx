import { useState } from 'react';
import { CalendarClock, Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface RescheduleApprovalBannerProps {
  currentLanguage: 'en' | 'ar';
  requestId: string;
  newDate: string;
  newTimeSlot?: string;
  requesterName?: string;
  /** 'buyer' or 'seller' — who is viewing this banner */
  viewerRole: 'buyer' | 'seller';
}

export function RescheduleApprovalBanner({
  currentLanguage,
  requestId,
  newDate,
  newTimeSlot,
  requesterName,
  viewerRole,
}: RescheduleApprovalBannerProps) {
  const queryClient = useQueryClient();
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const isRTL = currentLanguage === 'ar';

  const t = currentLanguage === 'ar'
    ? {
        title: 'طلب إعادة جدولة',
        from: viewerRole === 'buyer' ? 'الفني يطلب' : 'العميل يطلب',
        newTime: 'الموعد الجديد',
        approve: 'موافق',
        reject: 'رفض',
        approved: 'تمت الموافقة على إعادة الجدولة',
        rejected: 'تم رفض إعادة الجدولة',
        error: 'حدث خطأ',
      }
    : {
        title: 'Reschedule Request',
        from: viewerRole === 'buyer' ? 'The provider requests' : 'The customer requests',
        newTime: 'New time',
        approve: 'Approve',
        reject: 'Reject',
        approved: 'Reschedule approved',
        rejected: 'Reschedule rejected',
        error: 'Something went wrong',
      };

  const formattedDate = (() => {
    try {
      const d = new Date(newDate);
      if (isNaN(d.getTime())) return newDate;
      const dateStr = d.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      const timeStr = d.toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return `${dateStr}, ${timeStr}`;
    } catch {
      return newDate;
    }
  })();

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const { data, error } = await supabase.rpc('approve_reschedule', {
        p_request_id: requestId,
      });
      if (error) throw error;
      if (!data) {
        toast.error(t.error);
        return;
      }
      toast.success(t.approved);
      queryClient.invalidateQueries({ queryKey: ['seller-active-job'] });
      queryClient.invalidateQueries({ queryKey: ['seller-scheduled-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-dispatch-requests'] });
      queryClient.invalidateQueries({ queryKey: ['request-tracking'] });
    } catch {
      toast.error(t.error);
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      const { data, error } = await supabase.rpc('reject_reschedule', {
        p_request_id: requestId,
      });
      if (error) throw error;
      if (!data) {
        toast.error(t.error);
        return;
      }
      toast.success(t.rejected);
      queryClient.invalidateQueries({ queryKey: ['seller-active-job'] });
      queryClient.invalidateQueries({ queryKey: ['seller-scheduled-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-dispatch-requests'] });
      queryClient.invalidateQueries({ queryKey: ['request-tracking'] });
    } catch {
      toast.error(t.error);
    } finally {
      setIsRejecting(false);
    }
  };

  const isProcessing = isApproving || isRejecting;

  return (
    <div
      className="rounded-2xl border border-amber-300/60 dark:border-amber-600/40 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
          <CalendarClock className="h-4.5 w-4.5 text-amber-600 dark:text-amber-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm font-bold text-amber-800 dark:text-amber-200",
            isRTL ? 'font-ar-display' : 'font-display'
          )}>
            {t.title}
          </p>
          <p className={cn(
            "text-xs text-amber-700 dark:text-amber-300/80",
            isRTL ? 'font-ar-body' : ''
          )}>
            {t.from}{requesterName ? ` (${requesterName})` : ''}: {t.newTime} — {formattedDate}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleApprove}
          disabled={isProcessing}
          className={cn(
            "flex-1 h-10 rounded-xl flex items-center justify-center gap-1.5 text-sm font-bold transition-colors",
            "bg-green-600 text-white hover:bg-green-700 disabled:opacity-50",
            isRTL ? 'font-ar-heading' : ''
          )}
        >
          {isApproving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {t.approve}
        </button>
        <button
          onClick={handleReject}
          disabled={isProcessing}
          className={cn(
            "flex-1 h-10 rounded-xl flex items-center justify-center gap-1.5 text-sm font-bold transition-colors",
            "bg-card border border-border/60 text-foreground hover:bg-muted disabled:opacity-50",
            isRTL ? 'font-ar-heading' : ''
          )}
        >
          {isRejecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          {t.reject}
        </button>
      </div>
    </div>
  );
}
