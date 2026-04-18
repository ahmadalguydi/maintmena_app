import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, User, MessageCircle, Wallet, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/useHaptics';
import { useRole } from '@/contexts/RoleContext';
import { useAuth } from '@/hooks/useAuth';
import { useKeyboardAvoidance } from '@/hooks/useKeyboardAvoidance';
import { useDarkMode } from '@/hooks/useDarkMode';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_TIME } from '@/lib/queryConfig';

interface TabItem {
  name: string;
  nameAr: string;
  icon: React.ReactNode;
  route: string;
}

const BUYER_TABS: TabItem[] = [
  {
    name: 'Home',
    nameAr: 'الرئيسية',
    icon: <Home size={22} />,
    route: '/app/buyer/home'
  },
  {
    name: 'Activity',
    nameAr: 'النشاط',
    icon: <Clock size={22} />,
    route: '/app/buyer/activity'
  },
  {
    name: 'Messages',
    nameAr: 'الرسائل',
    icon: <MessageCircle size={22} />,
    route: '/app/buyer/messages'
  },
  {
    name: 'Profile',
    nameAr: 'الملف',
    icon: <User size={22} />,
    route: '/app/buyer/profile'
  }
];

const SELLER_TABS: TabItem[] = [
  {
    name: 'Home',
    nameAr: 'الرئيسية',
    icon: <Home size={22} />,
    route: '/app/seller/home'
  },
  {
    name: 'Wallet',
    nameAr: 'المحفظة',
    icon: <Wallet size={22} />,
    route: '/app/seller/earnings'
  },
  {
    name: 'Messages',
    nameAr: 'الرسائل',
    icon: <MessageCircle size={22} />,
    route: '/app/seller/messages'
  },
  {
    name: 'Profile',
    nameAr: 'الملف',
    icon: <User size={22} />,
    route: '/app/seller/profile'
  }
];

// Protected tabs that require auth (for buyers)
const PROTECTED_BUYER_TABS = ['Home', 'Activity', 'Messages', 'Profile'];

interface FloatingNavProps {
  currentLanguage?: 'en' | 'ar';
  onAuthRequired?: (action: { returnPath: string }) => void;
}

export const FloatingNav = ({
  currentLanguage = 'en',
  onAuthRequired
}: FloatingNavProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { vibrate } = useHaptics();
  const { currentRole } = useRole();
  const { user, userType } = useAuth();
  const { isKeyboardVisible } = useKeyboardAvoidance();
  const isDark = useDarkMode();

  // Fetch unread message count for badge on Messages tab
  const { data: unreadMessages = 0 } = useQuery({
    queryKey: ['nav-unread-messages', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false)
        .eq('notification_type', 'new_message');
      return count || 0;
    },
    enabled: !!user,
    staleTime: STALE_TIME.DYNAMIC,
  });

  // Show seller tabs if authenticated as seller, or if admin/dual-role browsing as seller
  const isLoggedInSeller = user && (userType === 'seller' || currentRole === 'seller');

  // Determine which tabs to show
  const tabs = isLoggedInSeller ? SELLER_TABS : BUYER_TABS;

  const handleTabClick = async (route: string, tabName: string) => {
    await vibrate('light');

    // Check if this is a protected tab and user is not logged in
    if (!user && PROTECTED_BUYER_TABS.includes(tabName)) {
      onAuthRequired?.({ returnPath: route });
      return;
    }

    navigate(route);
  };

  // Hide nav on detail/full-screen pages
  const isMessageThreadPage = location.pathname.startsWith('/app/messages/thread');
  const isSellerJobDetailPage = location.pathname.startsWith('/app/seller/job/');
  const isBuyerJobDetailPage = location.pathname.startsWith('/app/buyer/job/');
  const isVendorProfilePage = location.pathname.startsWith('/app/buyer/vendor/');
  const isHelpPage = location.pathname === '/app/help';
  const isRequestDetailPage = location.pathname.startsWith('/app/buyer/request/');
  const isSettingsPage = location.pathname === '/app/settings';
  const isAdminPage = location.pathname.startsWith('/app/admin/');

  const shouldHideNav =
    isKeyboardVisible ||
    isMessageThreadPage ||
    isSellerJobDetailPage ||
    isBuyerJobDetailPage ||
    isVendorProfilePage ||
    isHelpPage ||
    isRequestDetailPage ||
    isSettingsPage ||
    isAdminPage;

  return (
    <motion.nav
      data-native-bottom-surface={isDark ? '#121212' : '#ffffff'}
      className="fixed bottom-0 left-0 right-0 z-50 pb-safe"
      initial={false}
      animate={{
        y: shouldHideNav ? '100%' : 0,
        opacity: shouldHideNav ? 0 : 1
      }}
      transition={{
        type: 'spring',
        damping: 25,
        stiffness: 300,
        delay: shouldHideNav ? 0 : 0.1
      }}
    >
      <div className="px-4 pb-5 pt-2">
        <div className={cn(
          'bg-background/80 backdrop-blur-xl rounded-full',
          'shadow-[0_8px_30px_rgb(0,0,0,0.12)]',
          'border border-border/50',
          'px-4 py-3'
        )}>
          <div className="flex items-center justify-around relative">
            {tabs.map((tab) => {
              // Use exact match for home routes; prefix match for others but avoid false positives
              const isActive = location.pathname === tab.route ||
                (tab.route !== '/app/buyer/home' && tab.route !== '/app/seller/home' &&
                  location.pathname.startsWith(tab.route));
              const isMessages = tab.name === 'Messages';
              const showBadge = isMessages && unreadMessages > 0;

              return (
                <motion.button
                  key={tab.route}
                  onClick={() => handleTabClick(tab.route, tab.name)}
                  whileTap={{ scale: 0.88 }}
                  className={cn(
                    'flex flex-col items-center justify-center min-w-[56px] min-h-[44px] relative py-1 gap-0.5',
                    'transition-colors duration-200',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {/* Icon with badge */}
                  <div className="relative">
                    <motion.div
                      animate={{ scale: isActive ? 1.1 : 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    >
                      {tab.icon}
                    </motion.div>
                    <AnimatePresence>
                      {showBadge && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full bg-destructive flex items-center justify-center px-1"
                        >
                          <span className="text-[10px] font-bold text-white leading-none">
                            {unreadMessages > 9 ? '9+' : unreadMessages}
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Tab label */}
                  <span className={cn(
                    'text-[10px] font-medium leading-none',
                    isActive ? 'text-primary' : 'text-muted-foreground/60',
                    currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                  )}>
                    {currentLanguage === 'ar' ? tab.nameAr : tab.name}
                  </span>

                  {/* Active indicator pill */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTabPill"
                      className="absolute -bottom-1 w-5 h-1 rounded-full bg-primary"
                      transition={{
                        type: 'spring',
                        bounce: 0.2,
                        duration: 0.5
                      }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </motion.nav>
  );
};
