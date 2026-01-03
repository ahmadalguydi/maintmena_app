import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SoftCard } from '@/components/mobile/SoftCard';
import { MenuGroup, MenuItem } from '@/components/mobile/MenuGroup';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import { Settings, HelpCircle, LogOut, CreditCard, Camera, Edit, Heart, FileText } from 'lucide-react';
import { Heading2, Body } from '@/components/mobile/Typography';
import { cn } from '@/lib/utils';
import { AvatarSelector } from '@/components/mobile/AvatarSelector';
import { EmailVerificationBanner } from '@/components/mobile/EmailVerificationBanner';
import { useState } from 'react';

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
        .select('*')
        .eq('id', user?.id)
        .single();
      return data;
    },
    enabled: !!user
  });

  // Check if email is verified
  const isEmailVerified = user?.email_confirmed_at != null;

  const content = {
    en: {
      title: 'Profile',
      account: 'Account',
      editProfile: 'Edit Profile',
      savedVendors: 'Saved Vendors',
      myContracts: 'My Contracts',
      settings: 'Settings',
      subscription: 'Subscription',
      help: 'Help & Support',
      signOut: 'Sign Out'
    },
    ar: {
      title: 'الملف الشخصي',
      account: 'الحساب',
      editProfile: 'تعديل الملف',
      savedVendors: 'البائعون المحفوظون',
      myContracts: 'عقودي',
      settings: 'الإعدادات',
      subscription: 'الاشتراك',
      help: 'المساعدة والدعم',
      signOut: 'تسجيل الخروج'
    }
  };

  const t = content[currentLanguage];

  const menuItems: MenuItem[] = [
    {
      icon: <Edit size={20} className="text-primary" />,
      label: t.editProfile,
      onClick: () => navigate('/app/buyer/profile/edit')
    },
    {
      icon: <Heart size={20} className="text-primary" />,
      label: t.savedVendors,
      onClick: () => navigate('/app/buyer/profile/saved-vendors')
    },
    {
      icon: <FileText size={20} className="text-primary" />,
      label: t.myContracts,
      onClick: () => navigate('/app/buyer/profile/contracts')
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
      <SoftCard className="text-center">
        <div className="flex flex-col items-center gap-4">
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
          <div>
            <Heading2 lang={currentLanguage} className="text-2xl">
              {profile?.full_name || user?.email}
            </Heading2>
            <Body lang={currentLanguage} className="text-sm text-muted-foreground mt-1">
              {user?.email}
            </Body>
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

      <MenuGroup items={menuItems} currentLanguage={currentLanguage} />

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