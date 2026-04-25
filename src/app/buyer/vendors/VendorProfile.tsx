import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  ChevronRight,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Star,
  UserRound,
  Wrench,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SoftCard } from '@/components/mobile/SoftCard';
import { cn } from '@/lib/utils';
import { getCategoryByKey, getCategoryLabel } from '@/lib/serviceCategories';

interface VendorProfileProps {
  currentLanguage: 'en' | 'ar';
}

interface VendorProfileRow {
  id: string;
  full_name: string | null;
  company_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
  company_description: string | null;
  service_categories: string[] | null;
  years_of_experience: number | null;
  service_radius_km: number | null;
}

interface AssignedRequestRow {
  id: string;
  category: string | null;
  description: string | null;
  status: string | null;
  location: string | null;
  scheduled_for: string | null;
  preferred_start_date: string | null;
}

interface ReviewRow {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
}

const formatDate = (value: string | null | undefined, language: 'en' | 'ar') => {
  if (!value) return language === 'ar' ? 'غير محدد' : 'Not set';
  return new Date(value).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
    day: 'numeric',
    month: 'short',
  });
};

export const VendorProfile = ({ currentLanguage }: VendorProfileProps) => {
  const { id: vendorId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isArabic = currentLanguage === 'ar';

  const t = {
    en: {
      title: 'Provider Profile',
      unavailable: 'Provider profile unavailable',
      unavailableBody: 'You can only view providers assigned to your requests.',
      backActivity: 'Back to activity',
      verified: 'Verified provider',
      provider: 'Service Provider',
      currentRequest: 'Assigned request',
      about: 'About',
      services: 'Services',
      reviews: 'Recent reviews',
      noBio: 'This provider has not added a detailed bio yet.',
      noReviews: 'No reviews yet.',
      years: 'Years',
      radius: 'Service radius',
      jobs: 'Request',
      call: 'Call',
      message: 'Message',
      viewRequest: 'View request',
      rating: 'Rating',
    },
    ar: {
      title: 'ملف مقدم الخدمة',
      unavailable: 'لا يمكن عرض الملف',
      unavailableBody: 'يمكنك عرض مقدم الخدمة المعين على طلباتك فقط.',
      backActivity: 'العودة للنشاط',
      verified: 'مقدم خدمة موثق',
      provider: 'مقدم خدمة',
      currentRequest: 'الطلب المعين',
      about: 'نبذة',
      services: 'الخدمات',
      reviews: 'آخر التقييمات',
      noBio: 'لم يضف مقدم الخدمة نبذة تفصيلية بعد.',
      noReviews: 'لا توجد تقييمات بعد.',
      years: 'سنوات',
      radius: 'نطاق الخدمة',
      jobs: 'الطلب',
      call: 'اتصال',
      message: 'رسالة',
      viewRequest: 'عرض الطلب',
      rating: 'التقييم',
    },
  }[currentLanguage];

  const { data, isLoading } = useQuery({
    queryKey: ['buyer-assigned-vendor-profile', user?.id, vendorId],
    enabled: Boolean(user?.id && vendorId),
    queryFn: async () => {
      if (!user?.id || !vendorId) return null;

      const { data: assignedRequest, error: assignmentError } = await (supabase as any)
        .from('maintenance_requests')
        .select('id, category, description, status, location, scheduled_for, preferred_start_date')
        .eq('buyer_id', user.id)
        .eq('assigned_seller_id', vendorId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (assignmentError) throw assignmentError;
      if (!assignedRequest) {
        return { hasAccess: false as const };
      }

      const { data: profile, error: profileError } = await (supabase as any)
        .from('profiles')
        .select('id, full_name, company_name, avatar_url, phone, bio, company_description, service_categories, years_of_experience, service_radius_km')
        .eq('id', vendorId)
        .maybeSingle();

      if (profileError) throw profileError;

      const { data: reviews } = await (supabase as any)
        .from('seller_reviews')
        .select('id, rating, review_text, created_at')
        .eq('seller_id', vendorId)
        .order('created_at', { ascending: false })
        .limit(5);

      return {
        hasAccess: true as const,
        assignedRequest: assignedRequest as AssignedRequestRow,
        profile: profile as VendorProfileRow | null,
        reviews: (reviews ?? []) as ReviewRow[],
      };
    },
    staleTime: 30_000,
  });

  const profile = data?.hasAccess ? data.profile : null;
  const assignedRequest = data?.hasAccess ? data.assignedRequest : null;
  const reviews = data?.hasAccess ? data.reviews : [];
  const displayName = profile?.company_name || profile?.full_name || t.provider;
  const avatarUrl = profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(vendorId || displayName)}`;
  const averageRating = useMemo(() => {
    if (!reviews.length) return 0;
    return reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  }, [reviews]);

  if (isLoading) {
    return (
      <div className="min-h-app bg-background px-4 pb-24 pt-safe" dir={isArabic ? 'rtl' : 'ltr'}>
        <div className="mb-5 flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-8 w-44 rounded-xl" />
        </div>
        <Skeleton className="mb-4 h-56 rounded-3xl" />
        <Skeleton className="h-36 rounded-3xl" />
      </div>
    );
  }

  if (!data?.hasAccess || !profile) {
    return (
      <div className="flex min-h-app flex-col bg-background px-5 pb-24 pt-safe" dir={isArabic ? 'rtl' : 'ltr'}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-8 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background"
        >
          <ArrowLeft className={cn('h-5 w-5', isArabic && 'rotate-180')} />
        </button>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <UserRound className="h-9 w-9 text-muted-foreground" />
          </div>
          <h1 className={cn('text-2xl font-bold text-foreground', isArabic ? 'font-ar-heading' : 'font-heading')}>
            {t.unavailable}
          </h1>
          <p className={cn('mt-3 max-w-[280px] text-sm leading-6 text-muted-foreground', isArabic ? 'font-ar-body' : '')}>
            {t.unavailableBody}
          </p>
          <Button className="mt-6 rounded-2xl" onClick={() => navigate('/app/buyer/activity')}>
            {t.backActivity}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-app bg-background pb-28 pt-safe" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="px-4">
        <div className="mb-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background text-foreground active:scale-95"
          >
            <ArrowLeft className={cn('h-5 w-5', isArabic && 'rotate-180')} />
          </button>
          <h1 className={cn('text-2xl font-black text-foreground', isArabic ? 'font-ar-heading' : 'font-heading')}>
            {t.title}
          </h1>
        </div>

        <SoftCard className="overflow-hidden p-0">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-5 pb-5 pt-6 text-center">
            <div className="mx-auto mb-4 h-24 w-24 overflow-hidden rounded-[30px] border-4 border-background bg-muted shadow-xl">
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-full w-full object-cover"
                onError={(event) => {
                  const target = event.currentTarget;
                  target.onerror = null;
                  target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(vendorId || displayName)}`;
                }}
              />
            </div>
            <div className="flex items-center justify-center gap-2">
              <h2 className={cn('max-w-[240px] truncate text-2xl font-black text-foreground', isArabic ? 'font-ar-heading' : 'font-heading')}>
                {displayName}
              </h2>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
            </span>
            </div>
            {profile.company_name && profile.full_name ? (
              <p className={cn('mt-1 text-sm text-muted-foreground', isArabic ? 'font-ar-body' : '')}>
                {profile.full_name}
              </p>
            ) : null}
            <p className={cn('mt-2 text-xs font-semibold text-emerald-700', isArabic ? 'font-ar-body' : '')}>
              {t.verified}
            </p>
          </div>

          <div className="grid grid-cols-3 divide-x divide-border/40 border-t border-border/40 text-center">
            <div className="px-2 py-4">
              <Star className="mx-auto mb-1 h-4 w-4 fill-amber-400 text-amber-400" />
              <p className="text-sm font-bold">{averageRating ? averageRating.toFixed(1) : '-'}</p>
              <p className="text-[11px] text-muted-foreground">{t.rating}</p>
            </div>
            <div className="px-2 py-4">
              <Briefcase className="mx-auto mb-1 h-4 w-4 text-primary" />
              <p className="text-sm font-bold">{profile.years_of_experience ?? '-'}</p>
              <p className="text-[11px] text-muted-foreground">{t.years}</p>
            </div>
            <div className="px-2 py-4">
              <MapPin className="mx-auto mb-1 h-4 w-4 text-primary" />
              <p className="text-sm font-bold">{profile.service_radius_km ? `${profile.service_radius_km}km` : '-'}</p>
              <p className="text-[11px] text-muted-foreground">{t.radius}</p>
            </div>
          </div>
        </SoftCard>

        {assignedRequest ? (
          <SoftCard className="mt-4 p-4">
            <p className={cn('mb-3 text-sm font-bold text-foreground', isArabic ? 'font-ar-heading' : 'font-heading')}>
              {t.currentRequest}
            </p>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Wrench className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">
                  {getCategoryLabel(assignedRequest.category || 'maintenance', currentLanguage)}
                </p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {assignedRequest.description || assignedRequest.location || ''}
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>{formatDate(assignedRequest.scheduled_for || assignedRequest.preferred_start_date, currentLanguage)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/app/buyer/request/${assignedRequest.id}`)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground"
                aria-label={t.viewRequest}
              >
                <ChevronRight className={cn('h-4 w-4', isArabic && 'rotate-180')} />
              </button>
            </div>
          </SoftCard>
        ) : null}

        <SoftCard className="mt-4 p-4">
          <p className={cn('mb-2 text-sm font-bold text-foreground', isArabic ? 'font-ar-heading' : 'font-heading')}>
            {t.about}
          </p>
          <p className={cn('text-sm leading-7 text-muted-foreground', isArabic ? 'font-ar-body' : '')}>
            {profile.company_description || profile.bio || t.noBio}
          </p>
        </SoftCard>

        {profile.service_categories?.length ? (
          <SoftCard className="mt-4 p-4">
            <p className={cn('mb-3 text-sm font-bold text-foreground', isArabic ? 'font-ar-heading' : 'font-heading')}>
              {t.services}
            </p>
            <div className="flex flex-wrap gap-2">
              {profile.service_categories.map((category) => {
                const service = getCategoryByKey(category);
                return (
                  <span
                    key={category}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/8 px-3 py-1.5 text-xs font-semibold text-primary"
                  >
                    <span>{service?.icon || ''}</span>
                    {getCategoryLabel(category, currentLanguage)}
                  </span>
                );
              })}
            </div>
          </SoftCard>
        ) : null}

        <SoftCard className="mt-4 p-4">
          <p className={cn('mb-3 text-sm font-bold text-foreground', isArabic ? 'font-ar-heading' : 'font-heading')}>
            {t.reviews}
          </p>
          {reviews.length ? (
            <div className="space-y-3">
              {reviews.slice(0, 3).map((review) => (
                <div key={review.id} className="rounded-2xl border border-border/50 bg-muted/25 p-3">
                  <div className="mb-1 flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={cn('h-3.5 w-3.5', star <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/25')}
                      />
                    ))}
                  </div>
                  {review.review_text ? (
                    <p className="line-clamp-2 text-sm leading-6 text-foreground/75">{review.review_text}</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t.noReviews}</p>
          )}
        </SoftCard>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/50 bg-background/95 px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-3 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-2 gap-3">
          {profile.phone ? (
            <a
              href={`tel:${profile.phone}`}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-background text-sm font-bold text-foreground"
            >
              <Phone className="h-4 w-4 text-primary" />
              {t.call}
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => assignedRequest && navigate(`/app/messages/thread?request=${assignedRequest.id}`)}
            disabled={!assignedRequest}
            className={cn(
              'flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-bold text-primary-foreground',
              !profile.phone && 'col-span-2',
            )}
          >
            <MessageCircle className="h-4 w-4" />
            {t.message}
          </button>
        </div>
      </div>
    </div>
  );
};
