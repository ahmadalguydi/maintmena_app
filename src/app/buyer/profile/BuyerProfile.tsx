import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SoftCard } from '@/components/mobile/SoftCard';
import { MenuGroup, MenuItem } from '@/components/mobile/MenuGroup';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import { Settings, HelpCircle, LogOut, Camera, Edit, CheckCircle2, CalendarDays, ClipboardList, Globe, ClipboardCheck, Building2, User } from 'lucide-react';
import { Heading2, Body, Caption } from '@/components/mobile/Typography';
import { cn } from '@/lib/utils';
import { AvatarSelector } from '@/components/mobile/AvatarSelector';
import { EmailVerificationBanner } from '@/components/mobile/EmailVerificationBanner';
import { setLanguage } from '@/lib/preferences';
import { useState } from 'react';
import { toast } from 'sonner';

interface BuyerProfileProps {
  currentLanguage: 'en' | 'ar';
}

export const BuyerProfile = ({ currentLanguage }: BuyerProfileProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [avatarSelectorOpen, setAvatarSelectorOpen] = useState(false);

  const { data: profile, refetch } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, phone, company_name, buyer_type')
        .eq('id', user?.id ?? '')
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: requestCount = 0 } = useQuery({
    queryKey: ['buyer-request-count', user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('maintenance_requests')
        .select('id', { count: 'exact', head: true })
        .eq('buyer_id', user!.id);
      return count ?? 0;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const isEmailVerified = user?.email_confirmed_at != null;
  const isArabic = currentLanguage === 'ar';

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', { month: 'long', year: 'numeric' })
    : null;

  const t = {
    en: {
      title: 'Profile',
      account: 'Account',
      editProfile: 'Edit Profile',
      settings: 'Settings',
      help: 'Help & Support',
      myActivity: 'My Activity',
      signOut: 'Sign Out',
      memberSince: 'Member since',
      verified: 'Verified',
      language: 'Language',
      langEN: 'English',
      langAR: 'العربية',
      phone: 'Phone',
      notSet: 'Not set',
    },
    ar: {
      title: 'الملف الشخصي',
      account: 'الحساب',
      editProfile: 'تعديل الملف',
      settings: 'الإعدادات',
      help: 'المساعدة والدعم',
      myActivity: 'نشاطي',
      signOut: 'تسجيل الخروج',
      memberSince: 'عضو منذ',
      verified: 'موثق',
      language: 'اللغة',
      langEN: 'English',
      langAR: 'العربية',
      phone: 'الهاتف',
      notSet: 'غير محدد',
    },
  }[currentLanguage];

  const handleLanguageSwitch = (lang: 'en' | 'ar') => {
    if (lang === currentLanguage) return;
    setLanguage(lang);
    window.dispatchEvent(new CustomEvent('mm:language-change', { detail: { lang } }));
    toast.success(lang === 'ar' ? 'تم تغيير اللغة' : 'Language changed');
  };

  const accountItems: MenuItem[] = [
    {
      icon: <Edit size={20} className="text-primary" />,
      label: t.editProfile,
      onClick: () => navigate('/app/buyer/profile/edit'),
    },
    {
      icon: <ClipboardList size={20} className="text-primary" />,
      label: t.myActivity,
      onClick: () => navigate('/app/buyer/activity'),
    },
    {
      icon: <Settings size={20} className="text-primary" />,
      label: t.settings,
      onClick: () => navigate('/app/settings'),
    },
    {
      icon: <HelpCircle size={20} className="text-primary" />,
      label: t.help,
      onClick: () => navigate('/app/help'),
    },
  ];

  return (
    <div className="pb-28 p-4 space-y-5" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* ── Hero Card ── */}
      <SoftCard className="overflow-hidden p-0">
        <div className="bg-gradient-to-br from-blue-500/8 via-primary/4 to-primary/8 px-5 pt-6 pb-5">
          <div className="flex flex-col items-center">
            {/* Avatar */}
            <div className="relative mb-3">
              <Avatar className="w-24 h-24 ring-2 ring-primary/30 border-2 border-background shadow-md">
                <AvatarImage src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`} />
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

            {/* Name + Verified */}
            <div className="flex items-center gap-2">
              <Heading2 lang={currentLanguage} className="text-xl">
                {profile?.full_name || user?.email}
              </Heading2>
              {isEmailVerified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-200 text-[11px] font-semibold shrink-0">
                  <CheckCircle2 size={11} />
                  {t.verified}
                </span>
              )}
            </div>

            {/* Email */}
            <Body lang={currentLanguage} className="text-sm text-muted-foreground mt-0.5">
              {user?.email}
            </Body>

            {/* Account type badge + phone + member since */}
            <div className="flex items-center gap-2.5 mt-2 flex-wrap justify-center">
              {profile?.buyer_type && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-background/70 border border-border/50 text-xs font-semibold text-muted-foreground">
                  {profile.buyer_type === 'company'
                    ? <><Building2 size={10} /> {isArabic ? 'شركة' : 'Company'}</>
                    : <><User size={10} /> {isArabic ? 'فرد' : 'Individual'}</>
                  }
                </span>
              )}
              {profile?.phone && (
                <span className="text-xs text-muted-foreground">{profile.phone}</span>
              )}
              {memberSince && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarDays size={11} />
                  <span>{t.memberSince} {memberSince}</span>
                </div>
              )}
            </div>

            {/* Request count stat */}
            {requestCount > 0 && (
              <div className="mt-3 flex items-center gap-1.5 bg-background/60 border border-border/40 rounded-full px-3 py-1.5">
                <ClipboardCheck size={13} className="text-primary" />
                <span className="text-xs font-semibold text-foreground">
                  {requestCount} {isArabic ? (requestCount === 1 ? 'طلب' : 'طلب') : (requestCount === 1 ? 'request' : 'requests')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Language toggle footer */}
        <div className="px-5 py-3 border-t border-border/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe size={14} className="text-muted-foreground" />
            <Caption lang={currentLanguage} className="text-xs text-muted-foreground">
              {t.language}
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

      {/* ── Email Verification Banner ── */}
      {!isEmailVerified && user?.email && (
        <EmailVerificationBanner email={user.email} currentLanguage={currentLanguage} />
      )}


      {/* ── Account Section ── */}
      <div className="space-y-2">
        <Caption lang={currentLanguage} className="font-semibold text-muted-foreground px-2 uppercase tracking-wider text-[10px]">
          {t.account}
        </Caption>
        <MenuGroup items={accountItems} currentLanguage={currentLanguage} />
      </div>

      {/* ── Sign Out ── */}
      <button
        type="button"
        onClick={() => signOut(currentLanguage)}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-muted-foreground hover:text-rose-500 transition-colors',
          isArabic ? 'font-ar-body' : 'font-body',
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
