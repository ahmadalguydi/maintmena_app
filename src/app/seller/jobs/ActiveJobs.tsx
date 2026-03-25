import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Briefcase } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { JobTrackingCard } from '@/components/mobile/JobTrackingCard';
import { EmptyState } from '@/components/mobile/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { getRequestLocationLabel } from '@/lib/maintenanceRequest';
import * as jobService from '@/services/jobService';

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
      return jobService.fetchSellerAssignedActiveRequests(user.id);
    },
    enabled: !!user?.id,
    staleTime: 10_000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData ?? [],
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });

  const content = {
    en: {
      title: 'Active Jobs',
      noJobs: 'No Active Jobs Yet',
      noJobsDesc: 'Stay online to receive new service requests.',
      backHome: 'Back Home',
    },
    ar: {
      title: 'الأعمال النشطة',
      noJobs: 'لا توجد أعمال نشطة بعد',
      noJobsDesc: 'ابقَ متصلاً لاستقبال الطلبات الجديدة.',
      backHome: 'العودة للرئيسية',
    },
  };

  const t = content[currentLanguage];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-paper" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
        <GradientHeader title={t.title} subtitle="" showBack onBack={() => navigate(-1)} />
        <div className="p-4 space-y-4 pb-24">
          {[1, 2, 3].map((i) => (
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

  if (!activeJobs.length) {
    return (
      <div className="min-h-screen bg-paper" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
        <GradientHeader title={t.title} subtitle="" showBack onBack={() => navigate(-1)} />
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <EmptyState
            icon={Briefcase}
            title={t.noJobs}
            description={t.noJobsDesc}
            actionLabel={t.backHome}
            onAction={() => navigate('/app/seller/home')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper pb-24" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <GradientHeader title={t.title} subtitle="" showBack onBack={() => navigate(-1)} />
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
              jobType="request"
              title={job.title || job.category || (currentLanguage === 'ar' ? 'طلب خدمة' : 'Service Request')}
              description={job.description}
              currentLanguage={currentLanguage}
              userRole="seller"
              status={job.lifecycle}
              sellerOnWayAt={job.sellerOnWayAt}
              workStartedAt={job.workStartedAt}
              sellerMarkedComplete={
                job.completionState === 'seller_marked_complete' ||
                job.completionState === 'buyer_confirmed'
              }
              buyerMarkedComplete={job.completionState === 'buyer_confirmed'}
              sellerId={user?.id || ''}
              sellerName=""
              location={getRequestLocationLabel(job, currentLanguage === 'ar' ? 'الموقع قيد التحديث' : 'Location pending')}
              date={job.scheduledFor || job.created_at}
              onClick={() => navigate(`/app/seller/job/${job.id}?type=request`)}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
};
