import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { VendorCard } from "@/components/mobile/VendorCard";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Heading3, Body, BodySmall } from '@/components/mobile/Typography';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useState } from 'react';

interface SavedVendorsProps {
  currentLanguage: 'en' | 'ar';
}

export const SavedVendors = ({ currentLanguage }: SavedVendorsProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedVendor, setSelectedVendor] = useState<any>(null);

  const { data: savedVendors, isLoading } = useQuery({
    queryKey: ['saved-vendors', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // 1. Get saved vendor IDs
      const { data: savedData, error: savedError } = await supabase
        .from('saved_vendors')
        .select('seller_id')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (savedError) throw savedError;
      if (!savedData || savedData.length === 0) return [];

      const sellerIds = savedData.map(d => d.seller_id);

      // 2. Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', sellerIds);

      if (profilesError) throw profilesError;

      // 3. Fetch reviews in batch (optimized N+1)
      // Matches BuyerExplore fields to be safe
      const { data: reviews, error: reviewsError } = await supabase
        .from('seller_reviews')
        .select('rating, review_text, created_at, seller_id')
        .in('seller_id', sellerIds)
        .order('created_at', { ascending: false });

      if (reviewsError) {
        console.error("Error fetching reviews", reviewsError);
        // Continue without reviews if error
      }

      // 4. Merge reviews into profiles
      const reviewsBySeller = (reviews || []).reduce((acc: any, r: any) => {
        if (!acc[r.seller_id]) acc[r.seller_id] = [];
        acc[r.seller_id].push(r);
        return acc;
      }, {});

      return (profiles || []).map((p: any) => {
        const sellerReviews = reviewsBySeller[p.id] || [];
        // Limit to top 3
        const limitedReviews = sellerReviews.slice(0, 3);

        return {
          ...p,
          reviews: limitedReviews
        };
      });
    },
    enabled: !!user
  });

  const unsaveMutation = useMutation({
    mutationFn: async (vendorId: string) => {
      const { error } = await supabase
        .from('saved_vendors')
        .delete()
        .eq('buyer_id', user?.id)
        .eq('seller_id', vendorId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-vendors'] });
      toast.success(currentLanguage === 'ar' ? 'تم إزالة البائع' : 'Vendor removed');
    }
  });

  const content = {
    en: {
      title: 'Saved Vendors',
      subtitle: 'Your favorite service providers',
      noVendors: 'No saved vendors yet',
      description: 'Save your favorite vendors from the Explore page for quick access',
      remove: 'Remove',
      projects: 'projects',
      viewProfile: 'View Profile',
      experience: 'years experience',
      responseTime: 'response time',
      hours: 'hours',
      serviceRadius: 'serves within',
      km: 'km',
      bookNow: 'Book Now'
    },
    ar: {
      title: 'البائعون المحفوظون',
      subtitle: 'مقدمو الخدمة المفضلون لديك',
      noVendors: 'لا يوجد بائعون محفوظون بعد',
      description: 'احفظ البائعين المفضلين لديك من صفحة الاستكشاف للوصول السريع',
      remove: 'إزالة',
      projects: 'مشروع',
      viewProfile: 'عرض الملف',
      experience: 'سنوات خبرة',
      responseTime: 'وقت الرد',
      hours: 'ساعة',
      serviceRadius: 'يخدم ضمن',
      km: 'كم',
      bookNow: 'احجز الآن'
    }
  };

  const t = content[currentLanguage];

  if (isLoading) {
    return (
      <div className="pb-28 min-h-screen bg-background" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
        <GradientHeader
          title={t.title}
          subtitle={t.subtitle}
          showBack
          onBack={() => navigate('/app/buyer/profile')}
        />
        <div className="px-6 py-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-28 min-h-screen bg-background" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <GradientHeader
        title={t.title}
        subtitle={t.subtitle}
        showBack
        onBack={() => navigate('/app/buyer/profile')}
      />

      <div className="px-6 py-6">
        {!savedVendors || savedVendors.length === 0 ? (
          <SoftCard className="text-center py-16">
            <div className="space-y-3">
              <div className="text-6xl opacity-20">⭐</div>
              <Heading3 lang={currentLanguage}>{t.noVendors}</Heading3>
              <Body lang={currentLanguage} className="text-muted-foreground max-w-xs mx-auto">
                {t.description}
              </Body>
            </div>
          </SoftCard>
        ) : (
          <div className="space-y-3">
            {savedVendors.map((vendor: any, index: number) => (
              <motion.div
                key={vendor.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <VendorCard
                  vendor={vendor}
                  currentLanguage={currentLanguage}
                  isSaved={true}
                  onToggleSave={(id) => unsaveMutation.mutate(id)}
                  onRequestBooking={(v) => navigate(`/app/buyer/book/${v.id}`)}
                  onNavigate={navigate}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
