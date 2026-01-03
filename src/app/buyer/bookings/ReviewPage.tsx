import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { LeaveReviewModal } from '@/components/LeaveReviewModal';

interface ReviewPageProps {
  currentLanguage: 'en' | 'ar';
}

export const ReviewPage = ({ currentLanguage }: ReviewPageProps) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(true);

  const { data: booking } = useQuery({
    queryKey: ['booking-for-review', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_requests')
        .select('*, profiles!booking_requests_seller_id_fkey(*)')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  const handleSuccess = () => {
    navigate(`/app/buyer/reviews/success`, { state: { from: 'booking' } });
  };

  const handleClose = () => {
    navigate('/app/buyer/bookings');
  };

  if (!booking) return null;

  const sellerName = (booking.profiles as any)?.company_name || (booking.profiles as any)?.full_name || 'Seller';

  return (
    <div className="min-h-screen bg-background" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <GradientHeader
        title={currentLanguage === 'ar' ? 'تقييم الخدمة' : 'Review Service'}
        onBack={handleClose}
      />
      
      <LeaveReviewModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) handleClose();
        }}
        sellerId={booking.seller_id}
        sellerName={sellerName}
        bookingId={booking.id}
        onSuccess={handleSuccess}
        currentLanguage={currentLanguage}
      />
    </div>
  );
};