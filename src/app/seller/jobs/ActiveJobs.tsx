import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { JobTrackingCard } from '@/components/mobile/JobTrackingCard';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/mobile/EmptyState';
import { Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';

interface ActiveJobsProps {
  currentLanguage: 'en' | 'ar';
}

export const ActiveJobs = ({ currentLanguage }: ActiveJobsProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: activeJobs = [], isLoading } = useQuery({
    queryKey: ['seller-active-jobs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Step 1: Get all executed contracts for this seller
      const { data: contracts, error: contractsError } = await supabase
        .from('contracts')
        .select('request_id, booking_id')
        .eq('seller_id', user.id)
        .eq('status', 'executed');

      if (contractsError) {
        console.error('[ActiveJobs] Contracts fetch error:', contractsError);
        throw contractsError;
      }

      const requestIds = contracts?.filter(c => c.request_id).map(c => c.request_id!) || [];
      const bookingIds = contracts?.filter(c => c.booking_id).map(c => c.booking_id!) || [];

      const allJobs: any[] = [];

      // Step 2a: Fetch maintenance requests (if any)
      if (requestIds.length > 0) {
        const { data: requests, error: reqError } = await supabase
          .from('maintenance_requests')
          .select('*')
          .in('id', requestIds);

        if (reqError) {
          console.error('[ActiveJobs] Requests error:', reqError);
        } else if (requests) {
          // Step 2b: Fetch buyer profiles for requests
          const buyerIds = [...new Set(requests.map(r => r.buyer_id))];
          const { data: buyerProfiles } = await supabase
            .from('profiles')
            .select('id, full_name, company_name')
            .in('id', buyerIds);

          const profileMap = new Map(buyerProfiles?.map(p => [p.id, p]));

          const requestJobs = requests
            .filter(r => !r.buyer_marked_complete || !r.seller_marked_complete)
            .map(r => ({
              ...r,
              type: 'request',
              buyer_profile: profileMap.get(r.buyer_id)
            }));

          allJobs.push(...requestJobs);
        }
      }

      // Step 3a: Fetch booking requests (if any)
      if (bookingIds.length > 0) {
        const { data: bookings, error: bookError } = await supabase
          .from('booking_requests')
          .select('*')
          .in('id', bookingIds);

        if (bookError) {
          console.error('[ActiveJobs] Bookings error:', bookError);
        } else if (bookings) {
          // Step 3b: Fetch buyer profiles for bookings
          const buyerIds = [...new Set(bookings.map(b => b.buyer_id))];
          const { data: buyerProfiles } = await supabase
            .from('profiles')
            .select('id, full_name, company_name')
            .in('id', buyerIds);

          const profileMap = new Map(buyerProfiles?.map(p => [p.id, p]));

          const bookingJobs = bookings
            .filter(b => !b.buyer_marked_complete || !b.seller_marked_complete)
            .map(b => ({
              ...b,
              type: 'booking',
              buyer_profile: profileMap.get(b.buyer_id)
            }));

          allJobs.push(...bookingJobs);
        }
      }
      return allJobs;
    },
    enabled: !!user?.id
  });

  const content = {
    en: {
      title: 'Active Jobs',
      noJobs: 'No Active Jobs Yet',
      noJobsDesc: 'Browse the marketplace and send quotes to win your first job. We\'ll keep you updated!',
      viewMarketplace: 'Find Jobs'
    },
    ar: {
      title: 'الأعمال النشطة',
      noJobs: 'لا توجد أعمال نشطة بعد',
      noJobsDesc: 'تصفح السوق وأرسل عروضك للفوز بأول عمل. سنُبقيك على اطلاع!',
      viewMarketplace: 'ابحث عن أعمال'
    }
  };

  const t = content[currentLanguage];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-paper" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
        <GradientHeader
          title={t.title}
          subtitle=""
          showBack
          onBack={() => navigate(-1)}
        />
        <div className="p-4 space-y-4 pb-24">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-3xl p-4 space-y-3">
              <Skeleton className="h-6 w-3/4 rounded-full" />
              <Skeleton className="h-4 w-1/2 rounded-full" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!activeJobs || activeJobs.length === 0) {
    return (
      <div className="min-h-screen bg-paper" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
        <GradientHeader
          title={t.title}
          subtitle=""
          showBack
          onBack={() => navigate(-1)}
        />
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <EmptyState
            icon={Briefcase}
            title={t.noJobs}
            description={t.noJobsDesc}
            actionLabel={t.viewMarketplace}
            onAction={() => navigate('/app/seller/marketplace')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper pb-24" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <GradientHeader
        title={t.title}
        subtitle=""
        showBack
        onBack={() => navigate(-1)}
      />

      <div className="p-4 space-y-4">
        {activeJobs.map((job, index) => (
          <motion.div
            key={job.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <JobTrackingCard
              jobId={job.id}
              jobType={job.type as 'request' | 'booking'}
              title={((job as any).type === 'request') ? ((job as any).title || (job as any).service_category || 'Job') : (currentLanguage === 'ar' ? `حجز مع ${((job as any).buyer_profile?.full_name || (job as any).buyer_profile?.company_name || 'العميل')}` : `Booking with ${((job as any).buyer_profile?.full_name || (job as any).buyer_profile?.company_name || 'Buyer')}`)}
              description={(job as any).description || (job as any).job_description}
              currentLanguage={currentLanguage}
              userRole="seller"
              status={(job as any).status || 'pending'}
              sellerOnWayAt={(job as any).seller_on_way_at}
              workStartedAt={(job as any).work_started_at}
              sellerMarkedComplete={(job as any).seller_marked_complete || false}
              buyerMarkedComplete={(job as any).buyer_marked_complete || false}
              sellerId={(job as any).seller_id || user?.id || ''}
              sellerName={(job as any).buyer_profile?.full_name || (job as any).buyer_profile?.company_name || ''}
              location={(job as any).city || (job as any).location_city}
              onClick={() => navigate(`/app/seller/job/${job.id}?type=${job.type}`)}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
};
