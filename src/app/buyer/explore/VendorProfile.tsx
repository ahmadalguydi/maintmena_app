import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Globe,
  Linkedin,
  MapPin,
  MessageCircle,
  Star,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { TrustScoreBadge } from '@/components/mobile/TrustScoreBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heading2, Heading3, Body, BodySmall, Caption } from '@/components/mobile/Typography';
import { getAllCategories } from '@/lib/serviceCategories';
import { attachReviewBuyerProfiles, getRelativeReviewDate } from '@/lib/reviewFlow';
import { getSellerLevel } from '@/lib/sellerLevel';
import { SAUDI_CITIES_BILINGUAL } from '@/lib/saudiCities';
import { cn } from '@/lib/utils';

interface VendorProfileProps {
  currentLanguage: 'en' | 'ar';
}

const copy = {
  en: {
    about: 'About',
    services: 'Services',
    serviceAreas: 'Service Areas',
    reviews: 'Customer Reviews',
    serviceRadius: 'Service Radius',
    km: 'km',
    online: 'Online',
    offline: 'Offline',
    jobsDone: 'Jobs Done',
    experience: 'Years Exp.',
    noReviews: 'No reviews yet',
    sendMessage: 'Send Message',
    notFound: 'Vendor not found',
    recentSignal: (count: number) =>
      `Based on ${count} review${count === 1 ? '' : 's'}`,
    waitingSignal: 'Customer reviews will appear here once jobs are completed.',
    providerFallback: 'Service Provider',
    customerFallback: 'Customer',
    website: 'Website',
    linkedin: 'LinkedIn',
    startingFrom: 'Starting from',
  },
  ar: {
    about: 'نبذة',
    services: 'الخدمات',
    serviceAreas: 'نطاق الخدمة',
    reviews: 'آراء العملاء',
    serviceRadius: 'نطاق الخدمة',
    km: 'كم',
    online: 'متصل',
    offline: 'غير متصل',
    jobsDone: 'مهام مكتملة',
    experience: 'سنوات خبرة',
    noReviews: 'لا توجد تقييمات بعد',
    sendMessage: 'أرسل رسالة',
    notFound: 'لم يتم العثور على مقدم الخدمة',
    recentSignal: (count: number) => `بناءً على ${count} تقييم`,
    waitingSignal: 'ستظهر تقييمات العملاء هنا بعد اكتمال أولى المهام.',
    providerFallback: 'مقدم الخدمة',
    customerFallback: 'عميل',
    website: 'الموقع الإلكتروني',
    linkedin: 'لينكدإن',
    startingFrom: 'يبدأ من',
  },
} satisfies Record<string, unknown>;

export const VendorProfile = ({ currentLanguage }: VendorProfileProps) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();
  const categories = getAllCategories();
  const t = copy[currentLanguage];
  const isArabic = currentLanguage === 'ar';

  const { data: vendor, isLoading, error: vendorError } = useQuery({
    queryKey: ['vendor-profile', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Fetch reviews
      const { data: reviews } = await (supabase as any)
        .from('seller_reviews')
        .select('id, buyer_id, rating, review_text, created_at')
        .eq('seller_id', id)
        .order('created_at', { ascending: false })
        .limit(12);

      const enrichedReviews = await attachReviewBuyerProfiles(supabase as any, reviews ?? []);

      // Count completed jobs for seller level
      const { count: completedCount } = await supabase
        .from('maintenance_requests')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_seller_id', id!)
        .eq('status', 'completed');

      // Compute average rating from reviews
      const reviewArr = enrichedReviews ?? [];
      const avgRating = reviewArr.length > 0
        ? reviewArr.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviewArr.length
        : 0;

      return {
        ...data,
        seller_reviews: enrichedReviews,
        _completedJobs: completedCount ?? 0,
        _avgRating: avgRating,
      };
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-28" dir={isArabic ? 'rtl' : 'ltr'}>
        <GradientHeader title="" showBack onBack={() => navigate(-1)} />
        <div className="space-y-4 px-4 py-6">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-32 animate-pulse rounded-3xl bg-muted/50" />
          ))}
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-background pb-28" dir={isArabic ? 'rtl' : 'ltr'}>
        <GradientHeader title="" showBack onBack={() => navigate(-1)} />
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
          <Heading3 lang={currentLanguage}>{t.notFound}</Heading3>
          {vendorError ? (
            <Caption lang={currentLanguage} className="mt-2 text-destructive">
              {vendorError.message}
            </Caption>
          ) : null}
          <Button className="mt-5 rounded-full" onClick={() => navigate(-1)}>
            {isArabic ? 'رجوع' : 'Go Back'}
          </Button>
        </div>
      </div>
    );
  }

  const isOnline = vendor.is_online ?? false;
  const reviewList = Array.isArray(vendor.seller_reviews) ? vendor.seller_reviews : [];
  const reviewCount = reviewList.length;
  const ratingValue = Number(vendor._avgRating || 0);
  const completedJobs = vendor._completedJobs ?? 0;
  const sellerLevel = getSellerLevel(completedJobs);

  const handleMessage = () => {
    // Navigate to buyer messages hub — messaging is request-based,
    // so from a profile view we send the buyer to their messages list.
    navigate('/app/buyer/messages');
  };

  return (
    <div className="min-h-screen bg-background pb-32" dir={isArabic ? 'rtl' : 'ltr'}>
      <GradientHeader
        title={vendor.company_name || vendor.full_name || t.providerFallback}
        showBack
        onBack={() => navigate(-1)}
      />

      <div className="space-y-6 px-4 py-6">
        {/* --- Header Card --- */}
        <SoftCard>
          <div className="flex items-start gap-4">
            <div className="relative">
              <Avatar className={cn('h-20 w-20 border-4', sellerLevel.ring)}>
                <AvatarImage src={vendor.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${vendor.id}`} />
                <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
                  {(vendor.company_name || vendor.full_name || 'V').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {/* Online indicator dot */}
              <div
                className={cn(
                  'absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-background',
                  isOnline ? 'bg-green-500' : 'bg-gray-400',
                )}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <Heading2 lang={currentLanguage} className="truncate text-xl">
                  {vendor.company_name || vendor.full_name || t.providerFallback}
                </Heading2>
              </div>

              {vendor.company_name && vendor.full_name ? (
                <BodySmall lang={currentLanguage} className="mb-1 text-muted-foreground">
                  {vendor.full_name}
                </BodySmall>
              ) : null}

              {/* Seller level badge */}
              <div className="mb-2 flex items-center gap-2">
                <Badge className={cn('border-transparent text-xs', sellerLevel.color, 'bg-muted/60')}>
                  <span className={cn('mr-1', isArabic && 'ml-1 mr-0')}>{sellerLevel.badge}</span>
                  {isArabic ? sellerLevel.labelAr : sellerLevel.label}
                </Badge>
                <Caption lang={currentLanguage} className="text-muted-foreground">
                  {isOnline ? t.online : t.offline}
                </Caption>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-1">
                <Star size={16} className="fill-yellow-500 text-yellow-500" />
                <BodySmall lang={currentLanguage} className="font-semibold">
                  {ratingValue > 0 ? ratingValue.toFixed(1) : '--'}
                </BodySmall>
                <Caption lang={currentLanguage} className="text-muted-foreground">
                  ({reviewCount})
                </Caption>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border/50 pt-4">
            <div className="text-center">
              <Heading3 lang={currentLanguage} className="text-lg">
                {completedJobs}
              </Heading3>
              <Caption lang={currentLanguage} className="text-muted-foreground">
                {t.jobsDone}
              </Caption>
            </div>
            <div className="text-center">
              <Heading3 lang={currentLanguage} className="text-lg">
                {vendor.years_of_experience || 0}
              </Heading3>
              <Caption lang={currentLanguage} className="text-muted-foreground">
                {t.experience}
              </Caption>
            </div>
            <div className="flex items-center justify-center">
              <TrustScoreBadge
                score={vendor.trust_score ?? 100}
                currentLanguage={currentLanguage}
                size="md"
              />
            </div>
          </div>
        </SoftCard>

        {/* --- About --- */}
        {(vendor.bio || vendor.company_description) ? (
          <SoftCard>
            <Heading3 lang={currentLanguage} className="mb-3">
              {t.about}
            </Heading3>
            <Body lang={currentLanguage} className="text-muted-foreground">
              {vendor.bio || vendor.company_description}
            </Body>
          </SoftCard>
        ) : null}

        {/* --- Services --- */}
        {Array.isArray(vendor.services_pricing) && vendor.services_pricing.length > 0 ? (
          <SoftCard>
            <Heading3 lang={currentLanguage} className="mb-3">
              {t.services}
            </Heading3>
            <div className="space-y-3">
              {(vendor.services_pricing as { category: string; price?: number | null; duration?: string | null }[]).map((service, index) => {
                const category = categories.find((item) => item.key === service.category);
                return (
                  <div key={`${service.category}-${index}`} className="flex items-center justify-between rounded-xl bg-muted/30 p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{category?.icon || 'W'}</span>
                      <div>
                        <BodySmall lang={currentLanguage} className="font-semibold">
                          {isArabic ? category?.ar || service.category : category?.en || service.category}
                        </BodySmall>
                        {service.duration ? (
                          <Caption lang={currentLanguage} className="text-muted-foreground">
                            {service.duration}
                          </Caption>
                        ) : null}
                      </div>
                    </div>
                    <BodySmall lang={currentLanguage} className="font-bold text-primary">
                      {service.price
                        ? `${t.startingFrom} ${formatAmount(service.price)}`
                        : '--'}
                    </BodySmall>
                  </div>
                );
              })}
            </div>
          </SoftCard>
        ) : null}

        {/* --- Service Areas --- */}
        {Array.isArray(vendor.service_cities) && vendor.service_cities.length > 0 ? (
          <SoftCard>
            <Heading3 lang={currentLanguage} className="mb-3">
              {t.serviceAreas}
            </Heading3>
            <div className="flex flex-wrap gap-2">
              {vendor.service_cities.map((city: string, index: number) => {
                const bilingualCity = SAUDI_CITIES_BILINGUAL?.find(
                  (item) => item.value === city || item.en === city || item.ar === city,
                );
                const displayCity = isArabic ? bilingualCity?.ar || city : bilingualCity?.en || city;

                return (
                  <Badge key={`${city}-${index}`} variant="outline" className="rounded-full">
                    <MapPin size={12} className={cn('mr-1', isArabic && 'ml-1 mr-0')} />
                    {displayCity}
                  </Badge>
                );
              })}
            </div>
            {vendor.service_radius_km ? (
              <div className="mt-3 border-t border-border/30 pt-3">
                <BodySmall lang={currentLanguage} className="text-muted-foreground">
                  {t.serviceRadius}: {vendor.service_radius_km} {t.km}
                </BodySmall>
              </div>
            ) : null}
          </SoftCard>
        ) : null}

        {/* --- Reviews --- */}
        <SoftCard>
          <div className="mb-4 flex items-center justify-between">
            <Heading3 lang={currentLanguage}>
              {t.reviews}
            </Heading3>
            {reviewCount > 0 ? (
              <Caption lang={currentLanguage} className="text-muted-foreground">
                {t.recentSignal(reviewCount)}
              </Caption>
            ) : null}
          </div>

          {reviewList.length > 0 ? (
            <div className="space-y-4">
              {(reviewList as { id: string; buyer_id: string; rating: number; review_text: string | null; created_at: string; buyer: { full_name?: string | null; company_name?: string | null } | null }[]).slice(0, 5).map((review) => {
                const buyerName =
                  review.buyer?.company_name ||
                  review.buyer?.full_name ||
                  t.customerFallback;

                return (
                  <motion.div
                    key={review.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border-b border-border/50 pb-4 last:border-0 last:pb-0"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-xs">
                          {buyerName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <BodySmall lang={currentLanguage} className="truncate font-semibold">
                          {buyerName}
                        </BodySmall>
                        <div className="flex items-center gap-1.5">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <Star
                              key={index}
                              size={12}
                              className={
                                index < review.rating
                                  ? 'fill-yellow-500 text-yellow-500'
                                  : 'text-muted-foreground/30'
                              }
                            />
                          ))}
                          <Caption lang={currentLanguage} className="text-muted-foreground">
                            {getRelativeReviewDate(review.created_at, currentLanguage)}
                          </Caption>
                        </div>
                      </div>
                    </div>
                    {review.review_text ? (
                      <Body lang={currentLanguage} className="text-sm text-muted-foreground">
                        {review.review_text}
                      </Body>
                    ) : (
                      <Caption lang={currentLanguage} className="text-muted-foreground">
                        {isArabic
                          ? 'تم إرسال تقييم نجوم بدون تعليق مكتوب.'
                          : 'A star rating was submitted without a written comment.'}
                      </Caption>
                    )}
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <Body lang={currentLanguage} className="py-8 text-center text-muted-foreground">
              {reviewCount === 0 ? t.waitingSignal : t.noReviews}
            </Body>
          )}
        </SoftCard>

        {/* --- Links --- */}
        {(vendor.website_url || vendor.linkedin_url) ? (
          <SoftCard>
            <div className="space-y-3">
              {vendor.website_url ? (
                <a
                  href={vendor.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-primary hover:underline"
                >
                  <Globe size={20} />
                  <BodySmall lang={currentLanguage}>{t.website}</BodySmall>
                </a>
              ) : null}
              {vendor.linkedin_url ? (
                <a
                  href={vendor.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-primary hover:underline"
                >
                  <Linkedin size={20} />
                  <BodySmall lang={currentLanguage}>{t.linkedin}</BodySmall>
                </a>
              ) : null}
            </div>
          </SoftCard>
        ) : null}
      </div>

      {/* --- Fixed bottom CTA --- */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 p-4 pb-safe backdrop-blur-sm">
        <Button
          variant="default"
          size="lg"
          className="h-12 w-full rounded-full"
          onClick={handleMessage}
        >
          <MessageCircle size={18} className={cn('mr-2', isArabic && 'ml-2 mr-0')} />
          {t.sendMessage}
        </Button>
      </div>
    </div>
  );
};
