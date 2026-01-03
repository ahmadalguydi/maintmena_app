import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SoftCard } from '@/components/mobile/SoftCard';
import { MenuGroup, MenuItem } from '@/components/mobile/MenuGroup';
import { StatsCard } from '@/components/mobile/StatsCard';
import { ProfileCompletionCard } from '@/components/mobile/ProfileCompletionCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import { Star, Briefcase, Settings, HelpCircle, LogOut, Camera, User, Wrench, MapPin, Image, Award, CreditCard, StarIcon, FileText } from 'lucide-react';
import { Heading2, Body, Caption } from '@/components/mobile/Typography';
import { cn } from '@/lib/utils';
import { AvatarSelector } from '@/components/mobile/AvatarSelector';
import { EmailVerificationBanner } from '@/components/mobile/EmailVerificationBanner';
import { useState } from 'react';

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
      label: currentLanguage === 'ar' ? 'عقودي' : 'My Contracts',
      onClick: () => navigate('/app/seller/profile/contracts')
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
          label={t.rating}
          value={(profile?.seller_rating || 0).toFixed(1)}
          gradient="from-yellow-500/10 to-yellow-600/10"
        />
        <StatsCard
          icon={Briefcase}
          label={t.jobs}
          value={profile?.completed_projects || 0}
          gradient="from-blue-500/10 to-blue-600/10"
        />
      </div>

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
        <MenuGroup items={accountMenuItems} currentLanguage={currentLanguage} />
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
    </div>
  );
};