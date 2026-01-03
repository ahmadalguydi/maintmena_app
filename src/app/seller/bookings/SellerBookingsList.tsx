import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { SoftCard } from '@/components/mobile/SoftCard';
import { StatusPill } from '@/components/mobile/StatusPill';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/mobile/EmptyState';
import { Calendar, MapPin, Phone, MessageSquare, Inbox } from 'lucide-react';
import { motion } from 'framer-motion';

interface SellerBookingsListProps {
  currentLanguage: 'en' | 'ar';
}

export const SellerBookingsList = ({ currentLanguage }: SellerBookingsListProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['seller-bookings', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return [];
      }
      
      // Step 1: Fetch bookings without profile join
      const { data: bookings, error } = await supabase
        .from('booking_requests')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[SellerBookingsList] Error fetching bookings:', error);
        throw error;
      }
      
      // Step 2: Fetch buyer profiles separately
      if (bookings && bookings.length > 0) {
        const buyerIds = [...new Set(bookings.map(b => b.buyer_id).filter(Boolean))];
        
        if (buyerIds.length > 0) {
          const { data: buyerProfiles } = await supabase
            .from('profiles')
            .select('id, full_name, phone')
            .in('id', buyerIds);
          
          // Step 3: Merge profiles into bookings
          const profileMap = new Map(buyerProfiles?.map(p => [p.id, p]));
          return bookings.map(b => ({
            ...b,
            profiles: profileMap.get(b.buyer_id)
          }));
        }
      }
      
      return bookings || [];
    },
    enabled: !!user?.id
  });

  const content = {
    en: { 
      title: 'Bookings', 
      upcoming: 'Active Jobs', 
      history: 'History',
      scheduled: 'Scheduled',
      onWay: 'On the way',
      working: 'Working',
      done: 'Done',
      call: 'Call',
      chat: 'Chat',
      viewDetails: 'View Details'
    },
    ar: { 
      title: 'الحجوزات', 
      upcoming: 'الوظائف النشطة', 
      history: 'السجل',
      scheduled: 'مجدول',
      onWay: 'في الطريق',
      working: 'جاري العمل',
      done: 'مكتمل',
      call: 'اتصال',
      chat: 'رسالة',
      viewDetails: 'عرض التفاصيل'
    }
  };

  const t = content[currentLanguage];

  const getStatusType = (status: string): 'success' | 'warning' | 'error' | 'info' | 'pending' => {
    if (status === 'completed') return 'success';
    if (status === 'in_progress') return 'info';
    if (status === 'accepted') return 'warning';
    return 'pending';
  };

  const getStatusText = (status: string) => {
    if (status === 'pending') return t.scheduled;
    if (status === 'accepted') return t.onWay;
    if (status === 'in_progress') return t.working;
    return t.done;
  };

  const activeBookings = bookings?.filter(b => b.status !== 'completed') || [];
  const completedBookings = bookings?.filter(b => b.status === 'completed') || [];

  if (isLoading) {
    return (
      <div className="pb-20 p-4 space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-6 w-32 rounded-full" />
          <div className="overflow-x-auto -mx-4 px-4">
            <div className="flex gap-4">
              {[1, 2].map((i) => (
                <SoftCard key={i} animate={false} className="min-w-[280px]">
                  <div className="space-y-4">
                    <Skeleton className="h-5 w-3/4 rounded-full" />
                    <Skeleton className="h-4 w-1/2 rounded-full" />
                    <Skeleton className="h-1 w-full rounded-full" />
                    <Skeleton className="h-10 w-full rounded-full" />
                  </div>
                </SoftCard>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!bookings || bookings.length === 0) {
    return (
      <div className="pb-20 p-4 min-h-screen flex items-center justify-center" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
        <EmptyState
          icon={Inbox}
          title={currentLanguage === 'ar' ? 'لا توجد حجوزات' : 'No Bookings'}
          description={currentLanguage === 'ar' ? 'ليس لديك أي حجوزات حتى الآن. قم بإرسال عروض أسعار لبدء الحصول على الوظائف!' : "You don't have any bookings yet. Send quotes to start getting jobs!"}
          actionLabel={currentLanguage === 'ar' ? 'تصفح الفرص' : 'Browse Jobs'}
          onAction={() => navigate('/app/seller/marketplace')}
        />
      </div>
    );
  }

  return (
    <div className="pb-20 p-4 space-y-6" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      {activeBookings.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold px-2">{t.upcoming}</h2>
          
          <div className="overflow-x-auto -mx-4 px-4">
            <div className="flex gap-4 pb-2">
              {activeBookings.map((booking, index) => (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="min-w-[280px]"
                >
                  <SoftCard onClick={() => navigate(`/app/seller/booking/${booking.id}`)} className="cursor-pointer">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold">{booking.job_description || (currentLanguage === 'ar' ? 'حجز' : 'Booking')}</h3>
                        <StatusPill
                          status={getStatusType(booking.status || 'pending')}
                          label={getStatusText(booking.status || 'pending')}
                        />
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar size={14} />
                          {booking.proposed_start_date && new Date(booking.proposed_start_date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin size={14} />
                          {booking.location_city}
                        </div>
                      </div>

                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ 
                            width: booking.status === 'completed' ? '100%' : 
                                   booking.status === 'in_progress' ? '66%' :
                                   booking.status === 'accepted' ? '33%' : '10%'
                          }}
                          className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
                          transition={{ duration: 0.6 }}
                        />
                      </div>

                      <Button 
                        variant="default" 
                        size="sm" 
                        className="w-full rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/app/seller/booking/${booking.id}`);
                        }}
                      >
                        {t.viewDetails}
                      </Button>
                    </div>
                  </SoftCard>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}

      {completedBookings.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold px-2">{t.history}</h2>
          
          {completedBookings.map((booking) => (
            <SoftCard key={booking.id} onClick={() => navigate(`/app/seller/booking/${booking.id}`)} className="cursor-pointer">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold">{booking.job_description}</h3>
                  <StatusPill status="success" label={t.done} />
                </div>
                <div className="text-sm text-muted-foreground">
                  {booking.location_city} • {booking.completed_at && new Date(booking.completed_at).toLocaleDateString()}
                </div>
              </div>
            </SoftCard>
          ))}
        </div>
      )}
    </div>
  );
};
