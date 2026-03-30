import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Award,
  Globe,
  Heart,
  Linkedin,
  MapPin,
  Shield,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { AuthTriggerModal } from '@/components/mobile/AuthTriggerModal';
import { ReportButton } from '@/components/mobile/ReportButton';
import { TrustScoreBadge } from '@/components/mobile/TrustScoreBadge';
import BookingRequestModal from '@/components/BookingRequestModal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heading2, Heading3, Body, BodySmall, Caption } from '@/components/mobile/Typography';
import { getAllCategories } from '@/lib/serviceCategories';
import { attachReviewBuyerProfiles, getRelativeReviewDate } from '@/lib/reviewFlow';
import { SAUDI_CITIES_BILINGUAL } from '@/lib/saudiCities';
import { cn } from '@/lib/utils';

interface VendorProfileProps {
  currentLanguage: 'en' | 'ar';
}

const copy = {
  en: {
    verified: 'Verified',
    about: 'About',
    services: 'Services',
    serviceAreas: 'Service Areas',
    certifications: 'Certifications',
    reviews: 'Customer Reviews',
    serviceRadius: 'Service Radius',
    km: 'km',
    available: 'Available',
    busy: 'Busy',
    unavailable: 'Unavailable',
    projects: 'Projects Completed',
    experience: 'Years Experience',
    noReviews: 'No reviews yet',
    noPortfolio: 'No work showcased yet',
    booking: 'Book Now',
    backToExplore: 'Back to Explore',
    notFound: 'Vendor not found',
    recentSignal: (count: number) =>
      `Recent in-app feedback from ${count} customer${count === 1 ? '' : 's'}`,
    waitingSignal: 'Customer feedback will appear here once completed jobs are reviewed.',
    providerFallback: 'Service Provider',
    customerFallback: 'Customer',
  },
  ar: {
    verified: 'موثق',
    about: 'نبذة',
    services: 'الخدمات',
    serviceAreas: 'نطاق الخدمة',
    certifications: 'الشهادات',
    reviews: 'آراء العملاء',
    serviceRadius: 'نطاق الخدمة',
    km: 'كم',
    available: 'متاح',
    busy: 'مشغول',
    unavailable: 'غير متاح',
    projects: 'المشاريع المكتملة',
    experience: 'سنوات الخبرة',
    noReviews: 'لا توجد تقييمات بعد',
    noPortfolio: 'لا توجد أعمال معروضة بعد',
    booking: 'احجز الآن',
    backToExplore: 'العودة للاستكشاف',
    notFound: 'لم يتم العثور على مقدم الخدمة',
    recentSignal: (count: number) => `تقييمات حديثة من ${count} عميل داخل المنصة`,
    waitingSignal: 'ستظهر تقييمات العملاء هنا بعد اكتمال أولى المهام.',
    providerFallback: 'مقدم الخدمة',
    customerFallback: 'عميل',
  },
} satisfies Record<string, unknown>;

export const VendorProfile = ({ currentLanguage }: VendorProfileProps) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { formatAmount } = useCurrency();
  const categories = getAllCategories();
  const t = copy[currentLanguage];
  const isArabic = currentLanguage === 'ar';

  const [selectedImage, setSelectedImage] = useState(0);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  const { data: vendor, isLoading, error: vendorError } = useQuery({
    queryKey: ['vendor-profile', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        return null;
      }

      const { data: reviews, error: reviewsError } = await (supabase as any)
        .from('seller_reviews')
        .select('id, buyer_id, rating, review_text, created_at')
        .eq('seller_id', id)
        .order('created_at', { ascending: false })
        .limit(12);

      if (reviewsError) {
        throw reviewsError;
      }

      const enrichedReviews = await attachReviewBuyerProfiles(supabase as any, reviews ?? []);

      return {
        ...data,
        seller_reviews: enrichedReviews,
      };
    },
    enabled: !!id,
  });

  const { data: isSaved } = useQuery({
    queryKey: ['is-vendor-saved', id, user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return false;
      }

      const { data } = await supabase
        .from('saved_vendors')
        .select('id')
        .eq('buyer_id', user.id)
        .eq('seller_id', id)
        .maybeSingle();

      return Boolean(data);
    },
    enabled: !!user?.id && !!id,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error('Unauthenticated');
      }

      if (isSaved) {
        const { error } = await supabase
          .from('saved_vendors')
          .delete()
          .eq('buyer_id', user.id)
          .eq('seller_id', id);

        if (error) {
          throw error;
        }

        return 'removed';
      }

      const { error } = await supabase
        .from('saved_vendors')
        .insert({ buyer_id: user.id, seller_id: id });

      if (error) {
        throw error;
      }

      return 'saved';
    },
    onSuccess: (mode) => {
      queryClient.invalidateQueries({ queryKey: ['is-vendor-saved', id, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['saved-vendors'] });
      toast.success(
        isArabic
          ? mode === 'saved'
            ? 'تم حفظ مقدم الخدمة'
            : 'تمت إزالة مقدم الخدمة من المحفوظات'
          : mode === 'saved'
            ? 'Vendor saved'
            : 'Vendor removed from saved',
      );
    },
    onError: () => {
      toast.error(isArabic ? 'تعذر تحديث المحفوظات' : 'Failed to update saved vendors');
    },
  });

  const handleSave = () => {
    if (!user?.id) {
      setAuthModalOpen(true);
      return;
    }

    saveMutation.mutate();
  };

  const buildAvailabilityStatus = (status?: string | null) => {
    const normalized = status ?? 'available';
    if (normalized === 'busy') {
      return { label: t.busy, dot: 'bg-amber-500' };
    }
    if (normalized === 'unavailable' || normalized === 'offline') {
      return { label: t.unavailable, dot: 'bg-red-500' };
    }
    return { label: t.available, dot: 'bg-green-500' };
  };

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
          <Button className="mt-5 rounded-full" onClick={() => navigate('/app/buyer/explore')}>
            {t.backToExplore}
          </Button>
        </div>
      </div>
    );
  }

  const availability = buildAvailabilityStatus(vendor.availability_status);
  const portfolioItems = Array.isArray(vendor.portfolio_items) ? vendor.portfolio_items : [];
  const certifications = Array.isArray(vendor.certifications) ? vendor.certifications : [];
  const reviewList = Array.isArray(vendor.seller_reviews) ? vendor.seller_reviews : [];
  const reviewCount = reviewList.length;
  const ratingValue = Number(vendor.seller_rating || 0);
  const reviewSignal = reviewCount > 0 ? t.recentSignal(reviewCount) : t.waitingSignal;

  return (
    <div className="min-h-screen bg-background pb-32" dir={isArabic ? 'rtl' : 'ltr'}>
      <GradientHeader
        title={vendor.company_name || vendor.full_name || t.providerFallback}
        showBack
        onBack={() => navigate(-1)}
      />

      <div className="space-y-6 px-4 py-6">
        <SoftCard>
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20 border-4 border-border/50">
              <AvatarImage src={vendor.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${vendor.id}`} />
              <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
                {(vendor.company_name || vendor.full_name || 'V').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <Heading2 lang={currentLanguage} className="truncate text-xl">
                  {vendor.company_name || vendor.full_name || t.providerFallback}
                </Heading2>
                {vendor.verified_seller ? (
                  <Badge className="border-blue-500/20 bg-blue-500/10 text-blue-600">
                    <Shield size={12} className="mr-1" />
                    {t.verified}
                  </Badge>
                ) : null}
              </div>

              {vendor.company_name && vendor.full_name ? (
                <BodySmall lang={currentLanguage} className="mb-2 text-muted-foreground">
                  {vendor.full_name}
                </BodySmall>
              ) : null}

              <div className="mb-2 flex items-center gap-2">
                <div className={cn('h-2 w-2 rounded-full', availability.dot)} />
                <Caption lang={currentLanguage} className="text-muted-foreground">
                  {availability.label}
                </Caption>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Star size={16} className="fill-yellow-500 text-yellow-500" />
                  <BodySmall lang={currentLanguage} className="font-semibold">
                    {ratingValue.toFixed(1)}
                  </BodySmall>
                  <Caption lang={currentLanguage} className="text-muted-foreground">
                    ({reviewCount})
                  </Caption>
                </div>
              </div>

              <Caption lang={currentLanguage} className="mt-2 block text-muted-foreground">
                {reviewSignal}
              </Caption>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  handleSave();
                }}
                className="rounded-full p-2 transition-colors hover:bg-muted/60"
                type="button"
              >
                <Heart
                  size={18}
                  className={isSaved ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}
                />
              </button>
              <ReportButton
                contentType="profile"
                contentId={vendor.id}
                reportedUserId={vendor.id}
                currentLanguage={currentLanguage}
                variant="icon"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border/50 pt-4">
            <div className="text-center">
              <Heading3 lang={currentLanguage} className="text-lg">
                {vendor.completed_projects || 0}
              </Heading3>
              <Caption lang={currentLanguage} className="text-muted-foreground">
                {t.projects}
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

        {portfolioItems.length > 0 ? (
          <SoftCard className="overflow-hidden p-0">
            <div className="relative aspect-video">
              <img
                src={portfolioItems[selectedImage]?.image_url || portfolioItems[selectedImage]?.imageUrl || ''}
                alt="Portfolio"
                className="h-full w-full object-cover"
              />
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
                {portfolioItems.map((_: unknown, index: number) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedImage(index)}
                    className={cn(
                      'h-2 w-2 rounded-full transition-all',
                      selectedImage === index ? 'w-6 bg-white' : 'bg-white/50',
                    )}
                  />
                ))}
              </div>
            </div>
          </SoftCard>
        ) : null}

        {(vendor.bio || vendor.bio_ar || vendor.company_description || vendor.company_description_ar) ? (
          <SoftCard>
            <Heading3 lang={currentLanguage} className="mb-3">
              {t.about}
            </Heading3>
            <Body lang={currentLanguage} className="text-muted-foreground">
              {isArabic
                ? vendor.bio_ar || vendor.company_description_ar || vendor.bio || vendor.company_description
                : vendor.bio || vendor.company_description || vendor.bio_ar || vendor.company_description_ar}
            </Body>
          </SoftCard>
        ) : null}

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
                      {service.price ? `${formatAmount(service.price)} ${isArabic ? '/ساعة' : '/hr'}` : '--'}
                    </BodySmall>
                  </div>
                );
              })}
            </div>
          </SoftCard>
        ) : null}

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
                    <MapPin size={12} className="mr-1" />
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

        {certifications.length > 0 ? (
          <SoftCard>
            <Heading3 lang={currentLanguage} className="mb-3">
              {t.certifications}
            </Heading3>
            <div className="space-y-2">
              {certifications.map((certification: string, index: number) => (
                <div key={`${certification}-${index}`} className="flex items-center gap-2">
                  <Award size={16} className="text-primary" />
                  <BodySmall lang={currentLanguage}>{certification}</BodySmall>
                </div>
              ))}
            </div>
          </SoftCard>
        ) : null}

        <SoftCard>
          <Heading3 lang={currentLanguage} className="mb-4">
            {t.reviews}
          </Heading3>

          {reviewList.length > 0 ? (
            <div className="space-y-4">
              {(reviewList as { id: string; buyer_id: string; rating: number; review_text: string | null; created_at: string; buyer: { full_name?: string | null; company_name?: string | null } | null }[]).slice(0, 3).map((review) => {
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
              {t.noReviews}
            </Body>
          )}
        </SoftCard>

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
                  <BodySmall lang={currentLanguage}>Website</BodySmall>
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
                  <BodySmall lang={currentLanguage}>LinkedIn</BodySmall>
                </a>
              ) : null}
            </div>
          </SoftCard>
        ) : null}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 p-4 pb-safe backdrop-blur-sm">
        <Button
          variant="default"
          size="lg"
          className="h-12 w-full rounded-full"
          onClick={() => setBookingModalOpen(true)}
        >
          {t.booking}
        </Button>
      </div>

      <BookingRequestModal
        open={bookingModalOpen}
        onOpenChange={setBookingModalOpen}
        vendor={vendor}
        currentLanguage={currentLanguage}
      />

      <AuthTriggerModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        currentLanguage={currentLanguage}
        pendingAction={{
          type: 'booking',
          data: { vendorId: id },
          returnPath: `/app/buyer/vendor/${id}`,
        }}
      />
    </div>
  );
};
