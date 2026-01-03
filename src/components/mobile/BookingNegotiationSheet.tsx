import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BottomSheet } from './BottomSheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Clock, Sun, Sunset, Moon, AlertCircle, ChevronDown, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Heading3, BodySmall } from './Typography';
import { useCelebration } from '@/contexts/CelebrationContext';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

interface BookingNegotiationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: any;
  currentLanguage: 'en' | 'ar';
  onSuccess?: () => void;
  isEditMode?: boolean;
  existingResponse?: {
    scheduled_date?: string;
    time_preference?: string;
    price?: number;
    notes?: string;
  };
}

export const BookingNegotiationSheet = ({
  open,
  onOpenChange,
  booking,
  currentLanguage,
  onSuccess,
  isEditMode = false,
  existingResponse
}: BookingNegotiationSheetProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { celebrate } = useCelebration();
  const [submitting, setSubmitting] = useState(false);

  // Edit state for inline editing - only one can be open at a time
  const [activePicker, setActivePicker] = useState<'date' | 'time' | null>(null);

  // Form state
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(() => {
    const dateStr = existingResponse?.scheduled_date || booking?.proposed_start_date;
    return dateStr ? new Date(dateStr) : new Date();
  });
  const [timePreference, setTimePreference] = useState<'morning' | 'afternoon' | 'night'>(
    (existingResponse?.time_preference as any) || booking?.preferred_time_slot || 'morning'
  );
  const [price, setPrice] = useState<string>(existingResponse?.price?.toString() || '');
  const [notes, setNotes] = useState<string>(existingResponse?.notes || '');

  // Update form when existingResponse changes
  useEffect(() => {
    if (existingResponse) {
      if (existingResponse.scheduled_date) {
        setScheduledDate(new Date(existingResponse.scheduled_date));
      }
      setTimePreference((existingResponse.time_preference as any) || 'morning');
      setPrice(existingResponse.price?.toString() || '');
      setNotes(existingResponse.notes || '');
    }
  }, [existingResponse]);

  // Reset edit states when sheet closes
  useEffect(() => {
    if (!open) {
      setActivePicker(null);
    }
  }, [open]);

  const t = {
    title: isEditMode
      ? (currentLanguage === 'ar' ? 'تعديل الرد' : 'Edit Response')
      : (currentLanguage === 'ar' ? 'إرسال عرض' : 'Send Offer'),
    editDisclaimer: currentLanguage === 'ar'
      ? 'سيتم إخطار المشتري بأي تعديلات تقوم بها'
      : 'The buyer will be notified of any changes you make',
    bookingSchedule: currentLanguage === 'ar' ? 'موعد الخدمة' : 'Booking Schedule',
    date: currentLanguage === 'ar' ? 'التاريخ' : 'DATE',
    time: currentLanguage === 'ar' ? 'الوقت' : 'TIME',
    morning: currentLanguage === 'ar' ? 'صباحاً' : 'Morning',
    afternoon: currentLanguage === 'ar' ? 'ظهراً' : 'Afternoon',
    night: currentLanguage === 'ar' ? 'مساءً' : 'Night',
    price: currentLanguage === 'ar' ? 'السعر (ريال) *' : 'Price (SAR) *',
    pricePlaceholder: currentLanguage === 'ar' ? 'أدخل السعر' : 'Enter price',
    notes: currentLanguage === 'ar' ? 'ملاحظات (اختياري)' : 'Notes (Optional)',
    notesPlaceholder: currentLanguage === 'ar' ? 'أضف أي ملاحظات للمشتري...' : 'Add any notes for the buyer...',
    submit: isEditMode
      ? (currentLanguage === 'ar' ? 'حفظ التعديلات' : 'Save Changes')
      : (currentLanguage === 'ar' ? 'إرسال العرض' : 'Send Offer'),
    submitting: currentLanguage === 'ar' ? 'جاري الإرسال...' : 'Submitting...',
    cancel: currentLanguage === 'ar' ? 'إلغاء' : 'Cancel',
    flexible: currentLanguage === 'ar' ? 'مرن' : 'Flexible',
    done: currentLanguage === 'ar' ? 'تم' : 'Done',
  };

  const timeSlots = [
    { value: 'morning' as const, label: t.morning, icon: Sun, color: 'text-amber-500', bg: 'bg-amber-50' },
    { value: 'afternoon' as const, label: t.afternoon, icon: Sunset, color: 'text-orange-500', bg: 'bg-orange-50' },
    { value: 'night' as const, label: t.night, icon: Moon, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  ];

  const getTimeSlot = (value: string) => timeSlots.find(s => s.value === value) || timeSlots[0];
  const currentTimeSlot = getTimeSlot(timePreference);
  const TimeIcon = currentTimeSlot.icon;

  const formatDateDisplay = (date: Date | undefined) => {
    if (!date) return t.flexible;
    try {
      return format(date, 'EEE, MMM d', { locale: currentLanguage === 'ar' ? ar : enUS });
    } catch {
      return t.flexible;
    }
  };

  const handleSubmit = async () => {
    if (!user || !booking) {
      toast.error(currentLanguage === 'ar' ? 'خطأ: بيانات غير صالحة' : 'Error: Invalid data');
      return;
    }

    if (!price || parseFloat(price) <= 0) {
      toast.error(currentLanguage === 'ar' ? 'يرجى إدخال السعر' : 'Please enter a price');
      return;
    }

    setSubmitting(true);
    try {
      const finalPrice = parseFloat(price);
      const dateStr = scheduledDate ? scheduledDate.toISOString().split('T')[0] : null;

      const sellerResponse = {
        scheduled_date: dateStr,
        time_preference: timePreference,
        price: finalPrice,
        notes: notes,
        responded_at: new Date().toISOString(),
        // Save previous values for diff view if in edit mode
        previous_price: isEditMode && existingResponse ? existingResponse.price : undefined,
        previous_scheduled_date: isEditMode && existingResponse ? existingResponse.scheduled_date : undefined,
        previous_time_preference: isEditMode && existingResponse ? existingResponse.time_preference : undefined,
      };

      console.log('Saving seller response:', sellerResponse);

      // Update booking with seller's response
      const { error } = await supabase
        .from('booking_requests')
        .update({
          status: 'seller_responded',
          seller_counter_proposal: sellerResponse,
          seller_response: notes || (currentLanguage === 'ar' ? 'تم قبول الطلب' : 'Request accepted'),
        })
        .eq('id', booking.id);

      if (error) throw error;

      // Send notification to buyer
      await supabase.from('notifications').insert({
        user_id: booking.buyer_id,
        title: currentLanguage === 'ar'
          ? (isEditMode ? 'تم تعديل رد مقدم الخدمة' : 'رد على طلبك')
          : (isEditMode ? 'Provider updated their response' : 'Response to your request'),
        message: currentLanguage === 'ar'
          ? (isEditMode ? 'قام مقدم الخدمة بتعديل العرض - يرجى المراجعة' : 'قام مقدم الخدمة بقبول طلبك - يرجى المراجعة')
          : (isEditMode ? 'The provider updated their offer - please review' : 'The provider accepted your request - please review'),
        notification_type: 'booking_response',
        content_id: booking.id,
      });

      toast.success(
        isEditMode
          ? (currentLanguage === 'ar' ? 'تم حفظ التعديلات!' : 'Changes saved!')
          : (currentLanguage === 'ar' ? 'تم قبول الطلب!' : 'Request accepted!')
      );

      if (!isEditMode) {
        celebrate({
          flowType: 'booking',
          role: 'seller',
          currentStageIndex: 1,
          flowTitle: booking.service_category?.replace(/_/g, ' ') || (currentLanguage === 'ar' ? 'تم قبول الحجز' : 'Booking Accepted'),
          navigationUrl: `/app/seller/booking/${booking.id}`,
        });
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <div className="px-5 py-3 space-y-4" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
        <Heading3 lang={currentLanguage} className={cn(currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']")}>
          {t.title}
        </Heading3>

        {/* Edit Mode Disclaimer */}
        {isEditMode && (
          <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <BodySmall lang={currentLanguage} className={cn(
              "text-blue-700",
              currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
            )}>
              {t.editDisclaimer}
            </BodySmall>
          </div>
        )}

        {/* Booking Schedule Section */}
        <div className="space-y-3">
          <span className={cn(
            "text-sm font-medium text-foreground",
            currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
          )}>
            {t.bookingSchedule}
          </span>

          {/* Date & Time Pills */}
          <div className="grid grid-cols-2 gap-3">
            {/* Date Pill */}
            <div className="bg-gray-50 rounded-2xl overflow-hidden">
              <button
                onClick={() => setActivePicker(activePicker === 'date' ? null : 'date')}
                className={cn(
                  "w-full p-4 text-left transition-all",
                  activePicker === 'date' && "bg-primary/5"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className={cn("w-4 h-4", activePicker === 'date' ? "text-primary" : "text-muted-foreground")} />
                    <span className={cn(
                      "text-xs uppercase",
                      activePicker === 'date' ? "text-primary font-semibold" : "text-muted-foreground",
                      currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
                    )}>{t.date}</span>
                  </div>
                  <motion.div
                    animate={{ rotate: activePicker === 'date' ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className={cn("w-4 h-4", activePicker === 'date' ? "text-primary" : "text-muted-foreground")} />
                  </motion.div>
                </div>
                <p className={cn(
                  "font-semibold text-foreground mt-1",
                  currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
                )}>
                  {formatDateDisplay(scheduledDate)}
                </p>
              </button>
            </div>

            {/* Time Pill */}
            <div className="bg-gray-50 rounded-2xl overflow-hidden">
              <button
                onClick={() => setActivePicker(activePicker === 'time' ? null : 'time')}
                className={cn(
                  "w-full p-4 text-left transition-all",
                  activePicker === 'time' && "bg-primary/5"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TimeIcon className={cn("w-4 h-4", activePicker === 'time' ? "text-primary" : currentTimeSlot.color)} />
                    <span className={cn(
                      "text-xs uppercase",
                      activePicker === 'time' ? "text-primary font-semibold" : "text-muted-foreground",
                      currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
                    )}>{t.time}</span>
                  </div>
                  <motion.div
                    animate={{ rotate: activePicker === 'time' ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className={cn("w-4 h-4", activePicker === 'time' ? "text-primary" : "text-muted-foreground")} />
                  </motion.div>
                </div>
                <p className={cn(
                  "font-semibold text-foreground mt-1",
                  currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
                )}>
                  {currentTimeSlot.label}
                </p>
              </button>
            </div>
          </div>

          {/* Expanded Date Calendar */}
          <AnimatePresence mode="wait">
            {activePicker === 'date' && (
              <motion.div
                key="date-picker"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="bg-white rounded-2xl border border-gray-200 p-3">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={(date) => {
                      setScheduledDate(date);
                      // Don't auto-close so user can see selection
                    }}
                    locale={currentLanguage === 'ar' ? ar : enUS}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return date < today;
                    }}
                    className="mx-auto"
                  />
                  <Button
                    size="sm"
                    onClick={() => setActivePicker(null)}
                    className="w-full rounded-xl h-9 mt-3"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    {t.done}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Expanded Time Selector */}
            {activePicker === 'time' && (
              <motion.div
                key="time-picker"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="bg-white rounded-2xl border border-gray-200 p-3 space-y-2">
                  {timeSlots.map((slot) => {
                    const SlotIcon = slot.icon;
                    const isSelected = timePreference === slot.value;
                    return (
                      <motion.button
                        key={slot.value}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setTimePreference(slot.value);
                          setTimeout(() => setActivePicker(null), 150);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-xl transition-all",
                          isSelected
                            ? "bg-primary text-white shadow-lg shadow-primary/25"
                            : `${slot.bg} hover:shadow-md`
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          isSelected ? "bg-white/20" : "bg-white"
                        )}>
                          <SlotIcon className={cn(
                            "w-4 h-4",
                            isSelected ? "text-white" : slot.color
                          )} />
                        </div>
                        <span className={cn(
                          "font-medium flex-1 text-left",
                          !isSelected && "text-gray-700",
                          currentLanguage === 'ar' && "font-['Noto_Sans_Arabic'] text-right"
                        )}>
                          {slot.label}
                        </span>
                        {isSelected && (
                          <Check className="w-5 h-5" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Price Input */}
        <div className="space-y-2">
          <Label className={cn(currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']")}>
            {t.price}
          </Label>
          <Input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
            placeholder={t.pricePlaceholder}
            className="text-lg h-12"
            required
          />
        </div>

        {/* Notes (Optional) */}
        <div className="space-y-2">
          <Label className={cn(currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']")}>
            {t.notes}
          </Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t.notesPlaceholder}
            rows={3}
            className={cn(currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']")}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className={cn(
              "flex-1 h-12 rounded-full",
              currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
            )}
            disabled={submitting}
          >
            {t.cancel}
          </Button>
          <Button
            onClick={handleSubmit}
            className={cn(
              "flex-1 h-12 rounded-full gap-2",
              currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
            )}
            disabled={submitting}
          >
            {!submitting && <Check className="w-5 h-5" />}
            {submitting ? t.submitting : t.submit}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
};
