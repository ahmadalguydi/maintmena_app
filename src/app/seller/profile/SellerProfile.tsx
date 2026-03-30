import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SoftCard } from '@/components/mobile/SoftCard';
import { MenuGroup, MenuItem } from '@/components/mobile/MenuGroup';
import { StatsCard } from '@/components/mobile/StatsCard';
import { ProfileCompletionCard } from '@/components/mobile/ProfileCompletionCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import { Star, Briefcase, Settings, HelpCircle, LogOut, Camera, User, Wrench, MapPin, Image, Award, StarIcon, CheckCircle2, CalendarDays, Globe } from 'lucide-react';
import { Heading2, Body, Caption } from '@/components/mobile/Typography';
import { cn } from '@/lib/utils';
import { AvatarSelector } from '@/components/mobile/AvatarSelector';
import { EmailVerificationBanner } from '@/components/mobile/EmailVerificationBanner';
import { useState } from 'react';
import { executeSupabaseQuery } from '@/lib/supabaseQuery';
import { setLanguage } from '@/lib/preferences';
import { toast } from 'sonner';

/** Returns the seller level label and icon based on completed job count. */
function getSellerLevel(completedJobs: number): { label: string; labelAr: string; badge: string; ring: string; color: string } {
  if (completedJobs >= 30) return { label: 'Master', labelAr: 'خبير متميز', badge: '👑', ring: 'ring-amber-400', color: 'text-amber-600' };
  if (completedJobs >= 15) return { label: 'Expert', labelAr: 'خبير',       badge: '⭐',  ring: 'ring-purple-400', color: 'text-purple-600' };
  if (completedJobs >= 5)  return { label: 'Pro',    labelAr: 'محترف',      badge: '⭐',  ring: 'ring-blue-400',   color: 'text-blue-600' };
  return                         { label: 'Starter', labelAr: 'مبتدئ',      badge: '⭐',  ring: 'ring-slate-300',  color: 'text-slate-500' };
}

interface SellerProfileProps {
  currentLanguage: 'en' | 'ar';
}

export const SellerProfile = ({ currentLanguage }: SellerProfileProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [avatarSelectorOpen, setAvatarSelectorOpen] = useState(false);

  const { data: profile, refetch } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      return data;
    },
    enabled: !!user,
    staleTime: 0, // Always refetch to ensure fresh avatar
    refetchOnMount: 'always' // Refetch when component mounts
  });

  // Fetch review count and average rating
  const { data: sellerStats = { reviewCount: 0, avgRating: 0, completedJobs: 0 } } = useQuery({
    queryKey: ['seller-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return { reviewCount: 0, avgRating: 0, completedJobs: 0 };
      
      const { data: reviews } = await supabase
        .from('seller_reviews')
        .select('rating')
        .eq('seller_id', user.id);
        
      const { count: completedCount } = await supabase
        .from('maintenance_requests')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_seller_id', user.id)
        .in('status', ['completed', 'closed']);

      const reviewCount = reviews?.length || 0;
      const sum = reviews?.reduce((acc, r) => acc + r.rating, 0) || 0;
      const avgRating = reviewCount > 0 ? sum / reviewCount : 0;
      
      return { reviewCount, avgRating, completedJobs: completedCount || 0 };
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  // Check if email is verified
  const isEmailVerified = user?.email_confirmed_at != null;

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(currentLanguage === 'ar' ? 'ar-SA' : 'en-US', { month: 'long', year: 'numeric' })
    : null;

  const content = {
    en: {
      profile: 'Profile',
      jobs: 'Jobs Completed',
      rating: 'Rating',
      business: 'Business',
      editBusiness: 'Edit Business Info',
      manageServices: 'Manage Services',
      serviceAreas: 'Service Areas',
      portfolio: 'Portfolio',
      certifications: 'Certifications',
      account: 'Account',
      myReviews: 'My Reviews',
      history: 'Earnings & History',
      settings: 'Settings',
      help: 'Help & Support',
      signOut: 'Sign Out',
      language: 'Language',
    },
    ar: {
      profile: 'الملف الشخصي',
      jobs: 'المهام المكتملة',
      rating: 'التقييم',
      business: 'العمل',
      editBusiness: 'تعديل معلومات العمل',
      manageServices: 'إدارة الخدمات',
      serviceAreas: 'مناطق الخدمة',
      portfolio: 'معرض الأعمال',
      certifications: 'الشهادات',
      account: 'الحساب',
      myReviews: 'تقييماتي',
      history: 'الأرباح والسجل',
      settings: 'الإعدادات',
      help: 'المساعدة والدعم',
      signOut: 'تسجيل الخروج',
      language: 'اللغة',
    }
  };

  const t = content[currentLanguage];

  // Calculate profile completion
  const calculateCompletion = () => {
    if (!profile) return { percentage: 0, missing: [] };

    const fields = [
      { key: 'bio', label: currentLanguage === 'ar' ? 'السيرة الذاتية' : 'Bio' },
      { key: 'company_description', label: currentLanguage === 'ar' ? 'وصف الشركة' : 'Company Description' },
      { key: 'service_categories', label: currentLanguage === 'ar' ? 'فئات الخدمة' : 'Service Categories', check: (val: unknown) => Array.isArray(val) && val.length > 0 },
      { key: 'service_radius_km', label: currentLanguage === 'ar' ? 'نطاق الخدمة' : 'Service Areas' },
      { key: 'years_of_experience', label: currentLanguage === 'ar' ? 'سنوات الخبرة' : 'Experience' },
      { key: 'website_url', label: currentLanguage === 'ar' ? 'الموقع الإلكتروني' : 'Website' }
    ];

    const completed = fields.filter(field => {
      const value = profile[field.key];
      return field.check ? field.check(value) : !!value;
    });

    const missing = fields
      .filter(field => {
        const value = profile[field.key];
        return !(field.check ? field.check(value) : !!value);
      })
      .map(f => f.label);

    return {
      percentage: Math.round((completed.length / fields.length) * 100),
      missing
    };
  };

  const handleLanguageSwitch = (lang: 'en' | 'ar') => {
    if (lang === currentLanguage) return;
    setLanguage(lang);
    window.dispatchEvent(new CustomEvent('mm:language-change', { detail: { lang } }));
    toast.success(lang === 'ar' ? 'تم تغيير اللغة' : 'Language changed');
  };

  const completion = calculateCompletion();
  const completedJobs = sellerStats.completedJobs;
  const sellerLevel = getSellerLevel(completedJobs);

  const businessMenuItems: MenuItem[] = [
    {
      icon: <User size={20} className="text-primary" />,
      label: t.editBusiness,
      onClick: () => navigate('/app/seller/profile/edit')
    },
    {
      icon: <Wrench size={20} className="text-primary" />,
      label: t.manageServices,
      onClick: () => navigate('/app/seller/profile/manage-services')
    },
    {
      icon: <MapPin size={20} className="text-primary" />,
      label: t.serviceAreas,
      onClick: () => navigate('/app/seller/profile/service-areas')
    },
    {
      icon: <Image size={20} className="text-primary" />,
      label: t.portfolio,
      onClick: () => navigate('/app/seller/profile/portfolio')
    },
    {
      icon: <Award size={20} className="text-primary" />,
      label: t.certifications,
      onClick: () => navigate('/app/seller/profile/certifications')
    }
  ];

  const accountMenuItems: MenuItem[] = [
    {
      icon: <StarIcon size={20} className="text-primary" />,
      label: t.myReviews,
      onClick: () => navigate('/app/seller/reviews')
    },
    {
      icon: <Briefcase size={20} className="text-primary" />,
      label: t.history,
      onClick: () => navigate('/app/seller/earnings'),
    },
    {
      icon: <Settings size={20} className="text-primary" />,
      label: t.settings,
      onClick: () => navigate('/app/settings')
    },
    {
      icon: <HelpCircle size={20} className="text-primary" />,
      label: t.help,
      onClick: () => navigate('/app/help')
    }
  ];

  return (
    <div className="pb-28 p-4 space-y-6" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      {/* ── Hero Card ── */}
      <SoftCard className="overflow-hidden p-0">
        {/* Gradient background strip */}
        <div className="bg-gradient-to-br from-primary/8 via-primary/4 to-accent/8 px-5 pt-6 pb-5">
          <div className="flex flex-col items-center">
            {/* Avatar with level-colored ring */}
            <div className="relative mb-3">
              <div className={cn('p-1 rounded-full ring-2', sellerLevel.ring)}>
                <Avatar className="w-24 h-24 border-2 border-background">
                  <AvatarImage src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`} />
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                    {(profile?.full_name || user?.email?.charAt(0) || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <button
                onClick={() => setAvatarSelectorOpen(true)}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center border-2 border-background shadow-lg hover:bg-primary/90 transition-colors active:scale-95"
              >
                <Camera size={16} className="text-primary-foreground" />
              </button>
            </div>

            {/* Name + Verified */}
            <div className="flex items-center gap-2">
              <Heading2 lang={currentLanguage} className="text-xl">
                {profile?.full_name || user?.email}
              </Heading2>
              {isEmailVerified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-200 text-[11px] font-semibold shrink-0">
                  <CheckCircle2 size={11} />
                  {currentLanguage === 'ar' ? 'موثق' : 'Verified'}
                </span>
              )}
            </div>

            {/* Company name */}
            {profile?.company_name && (
              <Body lang={currentLanguage} className="text-sm text-muted-foreground mt-0.5">
                {profile.company_name}
              </Body>
            )}

            {/* Level badge + member since */}
            <div className="flex items-center gap-3 mt-2 flex-wrap justify-center">
              <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-background/70 border border-border/50', sellerLevel.color)}>
                <span>{sellerLevel.badge}</span>
                {currentLanguage === 'ar' ? sellerLevel.labelAr : sellerLevel.label}
              </span>
              {memberSince && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarDays size={11} />
                  <span>{currentLanguage === 'ar' ? 'منذ' : 'Since'} {memberSince}</span>
                </div>
              )}
            </div>

            {/* Level progress bar */}
            {completedJobs < 30 && (() => {
              const nextThreshold = completedJobs < 5 ? 5 : completedJobs < 15 ? 15 : 30;
              const prevThreshold = completedJobs < 5 ? 0 : completedJobs < 15 ? 5 : 15;
              const pct = Math.round(((completedJobs - prevThreshold) / (nextThreshold - prevThreshold)) * 100);
              return (
                <div className="w-full mt-3 space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{completedJobs} {currentLanguage === 'ar' ? 'مهمة' : 'jobs'}</span>
                    <span>{nextThreshold - completedJobs} {currentLanguage === 'ar' ? 'للمستوى التالي' : 'to next level'}</span>
                  </div>
                  <div className="h-1.5 bg-background/50 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Language toggle inside card footer */}
        <div className="px-5 py-3 border-t border-border/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe size={14} className="text-muted-foreground" />
            <Caption lang={currentLanguage} className="text-xs text-muted-foreground">
              {currentLanguage === 'ar' ? 'اللغة' : 'Language'}
            </Caption>
          </div>
          <div className="flex gap-1 p-0.5 bg-muted rounded-full">
            {(['en', 'ar'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => handleLanguageSwitch(lang)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-semibold transition-all',
                  currentLanguage === lang
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {lang === 'en' ? '🇺🇸 EN' : '🇸🇦 AR'}
              </button>
            ))}
          </div>
        </div>
      </SoftCard>

      {/* Email Verification Banner */}
      {!isEmailVerified && user?.email && (
        <EmailVerificationBanner
          email={user.email}
          currentLanguage={currentLanguage}
        />
      )}


      {/* Profile Completion Tip */}
      {completion.percentage < 100 && (
        <ProfileCompletionCard
          currentLanguage={currentLanguage}
          completionPercentage={completion.percentage}
          missingFields={completion.missing}
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatsCard
          icon={Star}
          label={`${t.rating}${sellerStats.reviewCount > 0 ? ` (${sellerStats.reviewCount})` : ''}`}
          value={sellerStats.avgRating.toFixed(1)}
          gradient="from-yellow-500/10 to-yellow-600/10"
        />
        <StatsCard
          icon={Briefcase}
          label={t.jobs}
          value={completedJobs}
          gradient="from-blue-500/10 to-blue-600/10"
        />
      </div>


      {/* Business Section */}
      <div className="space-y-3">
        <Caption lang={currentLanguage} className="font-semibold text-muted-foreground px-2 uppercase tracking-wider text-[10px]">
          {t.business}
        </Caption>
        <MenuGroup items={businessMenuItems} currentLanguage={currentLanguage} />
      </div>

      {/* Account Section */}
      <div className="space-y-3">
        <Caption lang={currentLanguage} className="font-semibold text-muted-foreground px-2 uppercase tracking-wider text-[10px]">
          {t.account}
        </Caption>
        <MenuGroup items={accountMenuItems} currentLanguage={currentLanguage} />
      </div>

      {/* Sign Out */}
      <button
        type="button"
        onClick={() => signOut(currentLanguage)}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-muted-foreground hover:text-rose-500 transition-colors',
          currentLanguage === 'ar' ? 'font-ar-body' : 'font-body',
        )}
      >
        <LogOut size={16} />
        <span className="text-sm font-medium">{t.signOut}</span>
      </button>

      <AvatarSelector
        open={avatarSelectorOpen}
        onOpenChange={setAvatarSelectorOpen}
        currentLanguage={currentLanguage}
        currentSeed={user?.id}
        onSelect={() => refetch()}
      />
    </div>
  );
};
