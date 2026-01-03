import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Heading3, Body, Caption } from '@/components/mobile/Typography';
import { Calendar as CalendarIcon, Clock, MapPin, User, Wrench } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, addMonths } from 'date-fns';
import { ar } from 'date-fns/locale';
import { SAUDI_CITIES_BILINGUAL } from '@/lib/saudiCities';

interface SellerCalendarProps {
  currentLanguage: 'en' | 'ar';
}

// Status labels with localization
const STATUS_LABELS = {
  en: {
    pending: 'Pending',
    accepted: 'Confirmed',
    seller_responded: 'Awaiting Buyer',
    revision_requested: 'Needs Revision',
    declined: 'Declined',
    cancelled: 'Cancelled',
    completed: 'Completed',
    active: 'Active'
  },
  ar: {
    pending: 'قيد الانتظار',
    accepted: 'مؤكد',
    seller_responded: 'بانتظار المشتري',
    revision_requested: 'يحتاج تعديل',
    declined: 'مرفوض',
    cancelled: 'ملغي',
    completed: 'مكتمل',
    active: 'نشط'
  }
};

// Time slot labels
const TIME_SLOT_LABELS = {
  en: { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Evening', flexible: 'Flexible' },
  ar: { morning: 'صباحًا', afternoon: 'بعد الظهر', evening: 'مساءً', night: 'مساءً', flexible: 'مرن' }
};

// Service category labels
const SERVICE_LABELS = {
  en: {
    plumbing: 'Plumbing', electrical: 'Electrical', ac: 'AC & Cooling', cleaning: 'Cleaning',
    painting: 'Painting', carpentry: 'Carpentry', general: 'General Maintenance', other: 'Other'
  },
  ar: {
    plumbing: 'سباكة', electrical: 'كهرباء', ac: 'تكييف', cleaning: 'تنظيف',
    painting: 'دهان', carpentry: 'نجارة', general: 'صيانة عامة', other: 'أخرى'
  }
};

// Status colors
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
  accepted: 'bg-green-500/10 text-green-600 border border-green-500/20',
  seller_responded: 'bg-blue-500/10 text-blue-600 border border-blue-500/20',
  revision_requested: 'bg-orange-500/10 text-orange-600 border border-orange-500/20',
  declined: 'bg-red-500/10 text-red-600 border border-red-500/20',
  cancelled: 'bg-gray-500/10 text-gray-600 border border-gray-500/20',
  completed: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
  active: 'bg-primary/10 text-primary border border-primary/20'
};

export const SellerCalendar = ({ currentLanguage }: SellerCalendarProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Helper: Get localized city
  const getCityLabel = (city: string) => {
    if (!city) return '';
    const cityData = SAUDI_CITIES_BILINGUAL.find(c =>
      c.en.toLowerCase() === city.toLowerCase() || c.ar === city
    );
    return currentLanguage === 'ar' ? (cityData?.ar || city) : (cityData?.en || city);
  };

  // Helper: Get localized status
  const getStatusLabel = (status: string) => {
    return STATUS_LABELS[currentLanguage][status as keyof typeof STATUS_LABELS['en']] || status;
  };

  // Helper: Get localized time slot
  const getTimeSlotLabel = (slot: string) => {
    const normalized = slot?.toLowerCase();
    return TIME_SLOT_LABELS[currentLanguage][normalized as keyof typeof TIME_SLOT_LABELS['en']] || slot;
  };

  // Helper: Get localized service category
  const getServiceLabel = (category: string) => {
    const normalized = category?.toLowerCase();
    return SERVICE_LABELS[currentLanguage][normalized as keyof typeof SERVICE_LABELS['en']] || category;
  };

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['seller-calendar', user?.id, currentMonth],
    queryFn: async () => {
      if (!user) return [];

      const start = startOfMonth(currentMonth);
      const end = startOfMonth(addMonths(currentMonth, 1));

      const { data: bookingsData, error } = await supabase
        .from('booking_requests')
        .select('*')
        .eq('seller_id', user.id)
        .gte('proposed_start_date', start.toISOString())
        .lt('proposed_start_date', end.toISOString())
        .order('proposed_start_date', { ascending: true });

      if (error) throw error;
      if (!bookingsData || bookingsData.length === 0) return [];

      const buyerIds = [...new Set(bookingsData.map(b => b.buyer_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, company_name')
        .in('id', buyerIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]));

      return bookingsData.map(b => ({
        ...b,
        profiles: profileMap.get(b.buyer_id)
      }));
    },
    enabled: !!user
  });

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const getBookingsForDate = (date: Date) => {
    return bookings?.filter(booking =>
      booking.proposed_start_date && isSameDay(parseISO(booking.proposed_start_date), date)
    ) || [];
  };

  const selectedDateBookings = getBookingsForDate(selectedDate);

  // Day labels
  const dayLabels = currentLanguage === 'ar'
    ? ['أح', 'إث', 'ث', 'أر', 'خ', 'ج', 'س']
    : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const t = {
    title: currentLanguage === 'ar' ? 'التقويم' : 'Calendar',
    subtitle: currentLanguage === 'ar' ? 'حجوزاتك القادمة' : 'Your upcoming bookings',
    noBookings: currentLanguage === 'ar' ? 'لا توجد حجوزات' : 'No bookings',
    noBookingsDesc: currentLanguage === 'ar' ? 'لم يتم جدولة حجوزات لهذا اليوم' : 'No bookings scheduled for this day',
    bookingWith: currentLanguage === 'ar' ? 'حجز مع' : 'Booking with'
  };

  return (
    <div className="pb-28 min-h-screen bg-background" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <GradientHeader
        title={t.title}
        subtitle={t.subtitle}
        showBack
        onBack={() => navigate('/app/seller/home')}
      />

      <div className="px-6 py-6 space-y-6">
        {/* Calendar Grid */}
        <SoftCard>
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                {currentLanguage === 'ar' ? '→' : '←'}
              </button>
              <Heading3 lang={currentLanguage}>
                {format(currentMonth, 'MMMM yyyy', { locale: currentLanguage === 'ar' ? ar : undefined })}
              </Heading3>
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                {currentLanguage === 'ar' ? '←' : '→'}
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {dayLabels.map((day, i) => (
                <div key={i} className="text-center text-xs font-semibold text-muted-foreground py-2">
                  {day}
                </div>
              ))}

              {daysInMonth.map((day, i) => {
                const dayBookings = getBookingsForDate(day);
                const isSelected = isSameDay(day, selectedDate);
                const isToday = isSameDay(day, new Date());
                const hasBookings = dayBookings.length > 0;

                return (
                  <motion.button
                    key={i}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      'aspect-square rounded-xl flex flex-col items-center justify-center relative',
                      'transition-all hover:scale-105',
                      isSelected && 'bg-primary text-primary-foreground shadow-lg',
                      !isSelected && isToday && 'border-2 border-primary',
                      !isSelected && !isToday && 'hover:bg-muted'
                    )}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="text-sm font-medium">{format(day, 'd')}</span>
                    {hasBookings && (
                      <div className="absolute bottom-1 flex gap-0.5">
                        {dayBookings.slice(0, 3).map((_, idx) => (
                          <div key={idx} className={cn(
                            'w-1 h-1 rounded-full',
                            isSelected ? 'bg-primary-foreground' : 'bg-primary'
                          )} />
                        ))}
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </SoftCard>

        {/* Selected Date Bookings */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CalendarIcon size={20} className="text-primary" />
            <Heading3 lang={currentLanguage}>
              {format(selectedDate, 'EEEE, d MMMM', { locale: currentLanguage === 'ar' ? ar : undefined })}
            </Heading3>
          </div>

          {selectedDateBookings.length === 0 ? (
            <SoftCard className="text-center py-12">
              <div className="text-5xl opacity-20 mb-3">📅</div>
              <Body lang={currentLanguage} className="font-semibold mb-1">
                {t.noBookings}
              </Body>
              <Caption lang={currentLanguage} className="text-muted-foreground">
                {t.noBookingsDesc}
              </Caption>
            </SoftCard>
          ) : (
            <div className="space-y-3">
              {selectedDateBookings.map((booking: any, index: number) => {
                const buyerName = booking.profiles?.full_name || booking.profiles?.company_name ||
                  (currentLanguage === 'ar' ? 'عميل' : 'Customer');
                const serviceLabel = getServiceLabel(booking.service_category || '');
                const statusLabel = getStatusLabel(booking.status || 'pending');
                const timeLabel = getTimeSlotLabel(booking.preferred_time_slot || '');
                const cityLabel = getCityLabel(booking.location_city || '');

                return (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <SoftCard
                      onClick={() => {
                        // For confirmed/executed bookings, go to job details
                        const isConfirmed = ['accepted', 'active', 'completed'].includes(booking.status);
                        if (isConfirmed) {
                          navigate(`/app/seller/job/${booking.id}?type=booking`);
                        } else {
                          navigate(`/app/seller/booking/${booking.id}`);
                        }
                      }}
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                    >
                      <div className="space-y-3">
                        {/* Header: Title + Status */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <User size={16} className="text-primary flex-shrink-0" />
                              <Heading3 lang={currentLanguage} className="text-base truncate">
                                {buyerName}
                              </Heading3>
                            </div>
                            {serviceLabel && (
                              <div className="flex items-center gap-2">
                                <Wrench size={14} className="text-muted-foreground flex-shrink-0" />
                                <Caption className="text-muted-foreground truncate">
                                  {serviceLabel}
                                </Caption>
                              </div>
                            )}
                          </div>
                          <div className={cn(
                            'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap',
                            STATUS_COLORS[booking.status] || STATUS_COLORS.pending
                          )}>
                            {statusLabel}
                          </div>
                        </div>

                        {/* Details */}
                        <div className="flex flex-wrap gap-3 text-sm">
                          {timeLabel && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Clock size={14} />
                              <span>{timeLabel}</span>
                            </div>
                          )}
                          {cityLabel && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <MapPin size={14} />
                              <span>{cityLabel}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </SoftCard>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
