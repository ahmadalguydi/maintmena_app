import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SoftCard } from '@/components/mobile/SoftCard';
import { MenuGroup, MenuItem } from '@/components/mobile/MenuGroup';
import { StatsCard } from '@/components/mobile/StatsCard';
import { ProfileCompletionCard } from '@/components/mobile/ProfileCompletionCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import { Star, Briefcase, Settings, HelpCircle, LogOut, Camera, User, Wrench, MapPin, Image, Award, CreditCard, StarIcon, FileText, Code } from 'lucide-react';
import { Heading2, Body, Caption } from '@/components/mobile/Typography';
import { cn } from '@/lib/utils';
import { AvatarSelector } from '@/components/mobile/AvatarSelector';
import { EmailVerificationBanner } from '@/components/mobile/EmailVerificationBanner';
import { DevSettings } from '@/components/seller/DevSettings';
import { useState } from 'react';
import { executeSupabaseQuery } from '@/lib/supabaseQuery';

/** Returns the seller level label and icon based on completed job count. */
function getSellerLevel(completedJobs: number): { label: string; labelAr: string; badge: string } {
  if (completedJobs >= 30) return { label: 'Master', labelAr: 'خبير متميز', badge: '👑' };
  if (completedJobs >= 15) return { label: 'Expert', labelAr: 'خبير', badge: '⭐⭐⭐' };
  if (completedJobs >= 5)  return { label: 'Pro',    labelAr: 'محترف',   badge: '⭐⭐' };
  return                         { label: 'Starter', labelAr: 'مبتدئ',   badge: '⭐' };
}

interface SellerProfileProps {
  currentLanguage: 'en' | 'ar';
}

export const SellerProfile = ({ currentLanguage }: SellerProfileProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [avatarSelectorOpen, setAvatarSelectorOpen] = useState(false);
  const [devSettingsOpen, setDevSettingsOpen] = useState(false);

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

  // Fetch review count separately so we always show an accurate number
  const { data: reviewCount = 0 } = useQuery({
    queryKey: ['seller-review-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const reviews = await executeSupabaseQuery<any[]>(
        () => (supabase as any)
          .from('seller_reviews')
          .select('id')
          .eq('seller_id', user.id),
        {
          context: 'seller-profile-review-count',
          fallbackData: [],
          relationName: 'seller_reviews',
          retries: 0,
        },
      );
      return reviews.length;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  // Check if email is verified
  const isEmailVerified = user?.email_confirmed_at != null;

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
      subscription: 'Subscription',
      settings: 'Settings',
      help: 'Help & Support',
      signOut: 'Sign Out'
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
      subscription: 'الاشتراك',
      settings: 'الإعدادات',
      help: 'المساعدة والدعم',
      signOut: 'تسجيل الخروج'
    }
  };

  const t = content[currentLanguage];

  // Calculate profile completion
  const calculateCompletion = () => {
    if (!profile) return { percentage: 0, missing: [] };

    const fields = [
      { key: 'bio', label: currentLanguage === 'ar' ? 'السيرة الذاتية' : 'Bio' },
      { key: 'company_description', label: currentLanguage === 'ar' ? 'وصف الشركة' : 'Company Description' },
      { key: 'service_categories', label: currentLanguage === 'ar' ? 'فئات الخدمة' : 'Service Categories', check: (val: any) => val?.length > 0 },
      { key: 'portfolio_items', label: currentLanguage === 'ar' ? 'معرض الأعمال' : 'Portfolio', check: (val: any) => val?.length > 0 },
      { key: 'certifications', label: currentLanguage === 'ar' ? 'الشهادات' : 'Certifications', check: (val: any) => val?.length > 0 },
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

  const completion = calculateCompletion();
  const completedJobs = profile?.completed_projects ?? 0;
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
      icon: <FileText size={20} className="text-primary" />,
      label: currentLanguage === 'ar' ? 'السجل' : 'History',
      onClick: () => navigate('/app/seller/history')
    },
    {
      icon: <CreditCard size={20} className="text-primary" />,
      label: t.subscription,
      onClick: () => navigate('/app/subscription')
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
    },
    {
      icon: <Code size={20} className="text-amber-500" />,
      label: currentLanguage === 'ar' ? 'إعدادات المطور' : 'Dev Settings',
      onClick: () => {
        if (import.meta.env.DEV) {
          setDevSettingsOpen(true);
        }
      }
    }
  ];

  return (
    <div className="pb-28 p-4 space-y-6" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      {/* Profile Card */}
      <SoftCard className="text-center">
        <div className="flex flex-col items-center">
          <div className="relative">
            <Avatar className="w-24 h-24 border-4 border-border/50">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.avatar_seed || user?.id}`} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                {(profile?.full_name || user?.email?.charAt(0) || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => setAvatarSelectorOpen(true)}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center border-2 border-background shadow-lg hover:bg-primary/90 transition-colors active:scale-95"
            >
              <Camera size={16} className="text-primary-foreground" />
            </button>
          </div>
          <Heading2 lang={currentLanguage} className="text-xl mt-4">
            {profile?.full_name || user?.email}
          </Heading2>
          <Body lang={currentLanguage} className="text-sm text-muted-foreground">
            {profile?.company_name}
          </Body>
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
          label={`${t.rating}${reviewCount > 0 ? ` (${reviewCount})` : ''}`}
          value={(profile?.seller_rating || 0).toFixed(1)}
          gradient="from-yellow-500/10 to-yellow-600/10"
        />
        <StatsCard
          icon={Briefcase}
          label={t.jobs}
          value={completedJobs}
          gradient="from-blue-500/10 to-blue-600/10"
        />
      </div>

      {/* Reputation / Level Badge */}
      <SoftCard className="flex items-center gap-4">
        <div className="text-3xl leading-none select-none" aria-hidden="true">
          {sellerLevel.badge}
        </div>
        <div className="flex-1">
          <p className={cn('text-base font-bold', currentLanguage === 'ar' ? 'font-ar-heading' : 'font-heading')}>
            {currentLanguage === 'ar' ? sellerLevel.labelAr : sellerLevel.label}
          </p>
          <p className={cn('text-xs text-muted-foreground mt-0.5', currentLanguage === 'ar' ? 'font-ar-body' : '')}>
            {currentLanguage === 'ar'
              ? `${completedJobs} مهمة مكتملة`
              : `${completedJobs} completed job${completedJobs !== 1 ? 's' : ''}`}
          </p>
        </div>
        {/* Next level progress hint */}
        {completedJobs < 30 && (() => {
          const nextThreshold = completedJobs < 5 ? 5 : completedJobs < 15 ? 15 : 30;
          const prevThreshold = completedJobs < 5 ? 0 : completedJobs < 15 ? 5 : 15;
          const pct = Math.round(((completedJobs - prevThreshold) / (nextThreshold - prevThreshold)) * 100);
          return (
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">
                {currentLanguage === 'ar' ? `${nextThreshold - completedJobs} للمستوى التالي` : `${nextThreshold - completedJobs} to next`}
              </p>
              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })()}
      </SoftCard>

      {/* Business Section */}
      <div className="space-y-3">
        <Caption lang={currentLanguage} className="font-semibold text-muted-foreground px-2">
          {t.business}
        </Caption>
        <MenuGroup items={businessMenuItems} currentLanguage={currentLanguage} />
      </div>

      {/* Account Section */}
      <div className="space-y-3">
        <Caption lang={currentLanguage} className="font-semibold text-muted-foreground px-2">
          {t.account}
        </Caption>
        <MenuGroup items={import.meta.env.DEV ? accountMenuItems : accountMenuItems.slice(0, -1)} currentLanguage={currentLanguage} />
      </div>

      {/* Sign Out */}
      <SoftCard
        onClick={() => signOut(currentLanguage)}
        className="cursor-pointer bg-destructive/5 border-destructive/20 hover:bg-destructive/10"
      >
        <div className={cn(
          'flex items-center justify-center gap-3 text-destructive py-2',
          currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
        )}>
          <LogOut size={20} />
          <span className="font-semibold">{t.signOut}</span>
        </div>
      </SoftCard>

      <AvatarSelector
        open={avatarSelectorOpen}
        onOpenChange={setAvatarSelectorOpen}
        currentLanguage={currentLanguage}
        currentSeed={profile?.avatar_seed}
        onSelect={() => refetch()}
      />

      <DevSettings
        isOpen={devSettingsOpen}
        onClose={() => setDevSettingsOpen(false)}
        currentLanguage={currentLanguage}
      />
    </div>
  );
};
