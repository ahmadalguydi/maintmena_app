import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Heading2, Heading3, Body, BodySmall, Caption } from '@/components/mobile/Typography';
import {
  MapPin, Star, Briefcase, Clock, Shield, Globe, Linkedin,
  Heart, MessageCircle, CheckCircle, Award, TrendingUp
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useState } from 'react';
import { getAllCategories } from '@/lib/serviceCategories';
import { useCurrency } from '@/hooks/useCurrency';
import { AuthTriggerModal } from '@/components/mobile/AuthTriggerModal';
import { SAUDI_CITIES_BILINGUAL } from '@/lib/saudiCities';

interface VendorProfileProps {
  currentLanguage: 'en' | 'ar';
}

export const VendorProfile = ({ currentLanguage }: VendorProfileProps) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { formatAmount } = useCurrency();
  const allCategories = getAllCategories();
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Check if user is in guest mode
  const isGuestMode = !user;

  const { data: vendor, isLoading, error: vendorError } = useQuery({
    queryKey: ['vendor-profile', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          seller_reviews!seller_reviews_seller_id_fkey (
            id, rating, review_text, created_at
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching vendor profile:', error);
        throw error;
      }

      return data;
    }
  });

  const { data: isSaved } = useQuery({
    queryKey: ['is-vendor-saved', id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from('saved_vendors')
        .select('id')
        .eq('buyer_id', user.id)
        .eq('seller_id', id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      if (isSaved) {
        await supabase
          .from('saved_vendors')
          .delete()
          .eq('buyer_id', user.id)
          .eq('seller_id', id);
      } else {
        await supabase
          .from('saved_vendors')
          .insert({ buyer_id: user.id, seller_id: id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['is-vendor-saved', id] });
      queryClient.invalidateQueries({ queryKey: ['saved-vendors'] });
      toast.success(isSaved
        ? (currentLanguage === 'ar' ? 'تم الإزالة من المحفوظات' : 'Removed from saved')
        : (currentLanguage === 'ar' ? 'تم الحفظ' : 'Saved successfully')
      );
    }
  });

  // Handle save with auth check
  const handleSaveVendor = () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    saveMutation.mutate();
  };

  // Handle booking - navigate to booking screen or show auth for guests
  const handleBookNow = () => {
    navigate(`/app/buyer/book/${id}`);
  };

  const content = {
    ar: {
      verified: 'موثق',
      rating: 'التقييم',
      projects: 'مشاريع مكتملة',
      experience: 'سنوات الخبرة',
      responseTime: 'وقت الاستجابة',
      hours: 'ساعة',
      about: 'عن الشركة',
      services: 'الخدمات',
      serviceAreas: 'مناطق الخدمة',
      portfolio: 'معرض الأعمال',
      certifications: 'الشهادات',
      reviews: 'التقييمات',
      noReviews: 'لا توجد تقييمات بعد',
      requestBooking: 'طلب حجز',
      saveVendor: 'حفظ البائع',
      unsaveVendor: 'إلغاء الحفظ',
      contact: 'تواصل',
      viewAll: 'عرض الكل',
      noPortfolio: 'لا توجد أعمال',
      noCertifications: 'لا توجد شهادات',
      serviceRadius: 'نطاق الخدمة',
      km: 'كم',
      available: 'متاح',
      busy: 'مشغول',
      unavailable: 'غير متاح'
    },
    en: {
      verified: 'Verified',
      rating: 'Rating',
      projects: 'Projects Completed',
      experience: 'Years Experience',
      responseTime: 'Response Time',
      hours: 'hours',
      about: 'About',
      services: 'Services',
      serviceAreas: 'Service Areas',
      portfolio: 'Portfolio',
      certifications: 'Certifications',
      reviews: 'Reviews',
      noReviews: 'No reviews yet',
      requestBooking: 'Request Booking',
      saveVendor: 'Save Vendor',
      unsaveVendor: 'Unsave',
      contact: 'Contact',
      viewAll: 'View All',
      noPortfolio: 'No work showcased',
      noCertifications: 'No certifications',
      serviceRadius: 'Service Radius',
      km: 'km',
      available: 'Available',
      busy: 'Busy',
      unavailable: 'Unavailable'
    }
  };

  const t = content[currentLanguage];

  const getAvailabilityStatus = (status?: string) => {
    const statusMap = {
      available: { label: t.available, color: 'bg-green-500' },
      busy: { label: t.busy, color: 'bg-yellow-500' },
      unavailable: { label: t.unavailable, color: 'bg-red-500' }
    };
    return statusMap[status as keyof typeof statusMap] || statusMap.available;
  };

  const portfolioImages = vendor?.portfolio_items as any[] || [];
  const avgRating = vendor?.seller_rating || 0;
  const reviewCount = vendor?.seller_reviews?.length || 0;

  if (isLoading) {
    return (
      <div className="pb-28 min-h-screen bg-background" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
        <GradientHeader title="" showBack onBack={() => navigate(-1)} />
        <div className="px-4 py-6 space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-muted/50 rounded-3xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="pb-28 min-h-screen bg-background flex flex-col items-center justify-center p-6 space-y-4">
        <Body lang={currentLanguage} className="text-center">
          {currentLanguage === 'ar' ? 'لم يتم العثور على البائع' : 'Vendor not found'}
        </Body>
        {vendorError && (
          <Caption lang={currentLanguage} className="text-destructive text-center">
            {currentLanguage === 'ar' ? 'خطأ: ' : 'Error: '}{vendorError.message}
          </Caption>
        )}
        <Button onClick={() => navigate('/app/buyer/explore')}>
          {currentLanguage === 'ar' ? 'العودة للاستكشاف' : 'Back to Explore'}
        </Button>
      </div>
    );
  }

  const availabilityStatus = getAvailabilityStatus(vendor.availability_status);

  // Set selectedVendor to current vendor for booking
  if (!selectedVendor) {
    setSelectedVendor(vendor);
  }

  return (
    <div className="pb-32 min-h-screen bg-background" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <GradientHeader
        title={vendor.company_name || vendor.full_name}
        showBack
        onBack={() => navigate(-1)}
      />

      <div className="px-4 py-6 space-y-6">
        {/* Header Card */}
        <SoftCard>
          <div className="flex items-start gap-4">
            <Avatar className="w-20 h-20 border-4 border-border/50">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${vendor.id}`} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                {(vendor.full_name || 'V').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Heading2 lang={currentLanguage} className="text-xl">
                  {vendor.company_name || vendor.full_name}
                </Heading2>
                {vendor.verified_seller && (
                  <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                    <Shield size={12} className="mr-1" />
                    {t.verified}
                  </Badge>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSaveVendor();
                  }}
                  className="p-1.5 rounded-full hover:bg-muted/50 transition-colors flex-shrink-0"
                >
                  <Heart
                    size={18}
                    className={isSaved ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}
                  />
                </button>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <div className={cn('w-2 h-2 rounded-full', availabilityStatus.color)} />
                <Caption lang={currentLanguage} className="text-muted-foreground">
                  {availabilityStatus.label}
                </Caption>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Star size={16} className="fill-yellow-500 text-yellow-500" />
                  <BodySmall lang={currentLanguage} className="font-semibold">
                    {avgRating.toFixed(1)}
                  </BodySmall>
                  <Caption lang={currentLanguage} className="text-muted-foreground">
                    ({reviewCount})
                  </Caption>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border/50">
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
            <div className="text-center">
              <Heading3 lang={currentLanguage} className="text-lg">
                {vendor.response_time_hours || 24}
              </Heading3>
              <Caption lang={currentLanguage} className="text-muted-foreground">
                {t.hours}
              </Caption>
            </div>
          </div>
        </SoftCard>

        {/* Portfolio Carousel */}
        {portfolioImages.length > 0 && (
          <SoftCard className="p-0 overflow-hidden">
            <div className="relative aspect-video">
              <img
                src={portfolioImages[selectedImage]?.imageUrl || ''}
                alt="Portfolio"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                {portfolioImages.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={cn(
                      'w-2 h-2 rounded-full transition-all',
                      selectedImage === idx ? 'bg-white w-6' : 'bg-white/50'
                    )}
                  />
                ))}
              </div>
            </div>
          </SoftCard>
        )}

        {/* About Section */}
        {(vendor.bio || vendor.company_description) && (
          <SoftCard>
            <Heading3 lang={currentLanguage} className="mb-3">
              {t.about}
            </Heading3>
            <Body lang={currentLanguage} className="text-muted-foreground">
              {currentLanguage === 'ar'
                ? (vendor.bio_ar || vendor.company_description_ar || vendor.bio || vendor.company_description)
                : (vendor.bio || vendor.company_description)}
            </Body>
          </SoftCard>
        )}

        {/* Services - Display from services_pricing JSONB */}
        {vendor.services_pricing && Array.isArray(vendor.services_pricing) && vendor.services_pricing.length > 0 && (
          <SoftCard>
            <Heading3 lang={currentLanguage} className="mb-3">
              {t.services}
            </Heading3>
            <div className="space-y-3">
              {vendor.services_pricing.map((service: any, idx: number) => {
                const categoryObj = allCategories.find(c => c.key === service.category);
                return (
                  <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{categoryObj?.icon || '🔧'}</span>
                      <div>
                        <BodySmall lang={currentLanguage} className="font-semibold">
                          {currentLanguage === 'ar' ? categoryObj?.ar : categoryObj?.en}
                        </BodySmall>
                        <Caption lang={currentLanguage} className="text-muted-foreground">
                          {service.duration}
                        </Caption>
                      </div>
                    </div>
                    <BodySmall lang={currentLanguage} className="font-bold text-primary">
                      {formatAmount(service.price)} {currentLanguage === 'ar' ? '/ساعة' : '/hr'}
                    </BodySmall>
                  </div>
                );
              })}
            </div>
          </SoftCard>
        )}

        {/* Service Areas - Display from service_cities */}
        {vendor.service_cities && vendor.service_cities.length > 0 && (
          <SoftCard>
            <Heading3 lang={currentLanguage} className="mb-3">
              {t.serviceAreas}
            </Heading3>
            <div className="flex flex-wrap gap-2">
              {vendor.service_cities.map((city: string, idx: number) => {
                // Try to find bilingual city name
                const bilingualCity = SAUDI_CITIES_BILINGUAL?.find(
                  (c: any) => c.value === city || c.en === city || c.ar === city
                );
                const displayCity = currentLanguage === "ar"
                  ? (bilingualCity?.ar || city)
                  : (bilingualCity?.en || city);

                return (
                  <Badge key={idx} variant="outline" className="rounded-full">
                    <MapPin size={12} className="mr-1" />
                    {displayCity}
                  </Badge>
                );
              })}
            </div>
            {vendor.service_radius_km && (
              <div className="mt-3 pt-3 border-t border-border/30">
                <BodySmall lang={currentLanguage} className="text-muted-foreground">
                  {t.serviceRadius}: {vendor.service_radius_km} {t.km}
                </BodySmall>
              </div>
            )}
          </SoftCard>
        )}

        {/* Portfolio Gallery - Display from portfolio_items */}
        {vendor.portfolio_items && Array.isArray(vendor.portfolio_items) && vendor.portfolio_items.length > 0 && (
          <SoftCard className="p-0 overflow-hidden">
            <div className="relative aspect-video">
              <img
                src={(vendor.portfolio_items[selectedImage] as any)?.imageUrl || ''}
                alt="Portfolio"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                {vendor.portfolio_items.map((_: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={cn(
                      'w-2 h-2 rounded-full transition-all',
                      selectedImage === idx ? 'bg-white w-6' : 'bg-white/50'
                    )}
                  />
                ))}
              </div>
            </div>
          </SoftCard>
        )}

        {/* Certifications */}
        {vendor.certifications && vendor.certifications.length > 0 && (
          <SoftCard>
            <Heading3 lang={currentLanguage} className="mb-3">
              {t.certifications}
            </Heading3>
            <div className="space-y-2">
              {vendor.certifications.map((cert: string, idx: number) => (
                <div key={idx} className="flex items-center gap-2">
                  <Award size={16} className="text-primary" />
                  <BodySmall lang={currentLanguage}>{cert}</BodySmall>
                </div>
              ))}
            </div>
          </SoftCard>
        )}

        {/* Reviews */}
        <SoftCard>
          <Heading3 lang={currentLanguage} className="mb-4">
            {t.reviews}
          </Heading3>

          {vendor.seller_reviews && vendor.seller_reviews.length > 0 ? (
            <div className="space-y-4">
              {vendor.seller_reviews.slice(0, 3).map((review: any) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="pb-4 border-b border-border/50 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary/10 text-xs">
                        C
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <BodySmall lang={currentLanguage} className="font-semibold">
                        {currentLanguage === 'ar' ? 'عميل' : 'Customer'}
                      </BodySmall>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={12}
                            className={cn(
                              i < review.rating
                                ? 'fill-yellow-500 text-yellow-500'
                                : 'text-muted-foreground/30'
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  {review.review_text && (
                    <Body lang={currentLanguage} className="text-sm text-muted-foreground">
                      {review.review_text}
                    </Body>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <Body lang={currentLanguage} className="text-center text-muted-foreground py-8">
              {t.noReviews}
            </Body>
          )}
        </SoftCard>

        {/* Contact Info */}
        {(vendor.website_url || vendor.linkedin_url) && (
          <SoftCard>
            <div className="space-y-3">
              {vendor.website_url && (
                <a
                  href={vendor.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-primary hover:underline"
                >
                  <Globe size={20} />
                  <BodySmall lang={currentLanguage}>Website</BodySmall>
                </a>
              )}
              {vendor.linkedin_url && (
                <a
                  href={vendor.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-primary hover:underline"
                >
                  <Linkedin size={20} />
                  <BodySmall lang={currentLanguage}>LinkedIn</BodySmall>
                </a>
              )}
            </div>
          </SoftCard>
        )}

      </div>

      {/* Sticky Book Now Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 pb-safe z-40">
        <Button
          variant="default"
          size="lg"
          className="w-full h-12 rounded-full"
          onClick={handleBookNow}
        >
          {currentLanguage === 'ar' ? 'احجز الآن' : 'Book Now'}
        </Button>
      </div>

      {/* Booking Modal */}
      <AuthTriggerModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        currentLanguage={currentLanguage}
        pendingAction={{
          type: 'booking',
          data: { vendorId: id },
          returnPath: `/app/buyer/vendor/${id}`
        }}
      />
    </div>
  );
};