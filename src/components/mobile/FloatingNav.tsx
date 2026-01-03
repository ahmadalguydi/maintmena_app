import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Briefcase, FileText, User, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/useHaptics';
import { useRole } from '@/contexts/RoleContext';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';

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
    name: 'Explore',
    nameAr: 'استكشاف',
    icon: <Search size={22} />,
    route: '/app/buyer/explore'
  },
  {
    name: 'center',
    nameAr: 'center',
    icon: <Plus size={24} />,
    route: '/app/buyer/requests/new'
  },
  {
    name: 'Requests',
    nameAr: 'الطلبات',
    icon: <FileText size={22} />,
    route: '/app/buyer/requests'
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
    name: 'Jobs',
    nameAr: 'الوظائف',
    icon: <Briefcase size={22} />,
    route: '/app/seller/marketplace'
  },
  {
    name: 'Quotes',
    nameAr: 'عروضي',
    icon: <FileText size={22} />,
    route: '/app/seller/quotes'
  },
  {
    name: 'Profile',
    nameAr: 'الملف',
    icon: <User size={22} />,
    route: '/app/seller/profile'
  }
];

// Protected tabs that require auth (for buyers)
const PROTECTED_BUYER_TABS = ['Home', 'Requests', 'Profile'];

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

  // Only show seller tabs if authenticated as seller
  const isLoggedInSeller = user && userType === 'seller';
  const tabs = isLoggedInSeller ? SELLER_TABS : BUYER_TABS;
  const effectiveRole = isLoggedInSeller ? 'seller' : 'buyer';

  const handleTabClick = async (route: string, tabName: string) => {
    await vibrate('light');

    // Check if this is a protected tab and user is not logged in
    if (!user && PROTECTED_BUYER_TABS.includes(tabName)) {
      onAuthRequired?.({ returnPath: route });
      return;
    }

    navigate(route);
  };

  const isPostRequestPage = location.pathname === '/app/buyer/requests/new';
  const isMessageThreadPage = location.pathname.startsWith('/app/messages/thread');
  const isQuoteComposerPage = location.pathname.includes('/job/') && location.pathname.endsWith('/quote');
  const isEditQuotePage = location.pathname.includes('/quote/') && location.pathname.endsWith('/edit');
  const isContractDetailPage = location.pathname.includes('/contract/');
  const isSellerJobDetailPage = location.pathname.startsWith('/app/seller/job/');
  const isBuyerJobDetailPage = location.pathname.startsWith('/app/buyer/job/');
  const isVendorProfilePage = location.pathname.startsWith('/app/buyer/vendor/');
  const shouldHideNav = isPostRequestPage || isMessageThreadPage || isQuoteComposerPage || isEditQuotePage || isContractDetailPage || isSellerJobDetailPage || isBuyerJobDetailPage || isVendorProfilePage;

  return (
    <motion.nav
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
            {tabs.map((tab, index) => {
              const isCenter = tab.name === 'center';
              const isActive = !isCenter && (location.pathname === tab.route || location.pathname.startsWith(tab.route));

              // Center button for buyers (including guests browsing as buyers)
              if (isCenter && effectiveRole !== 'seller') {
                return (
                  <button
                    key={tab.route}
                    onClick={() => handleTabClick(tab.route, tab.name)}
                    className={cn(
                      'absolute left-1/2 -translate-x-1/2 -top-6',
                      'w-14 h-14 rounded-full',
                      'bg-gradient-to-br from-primary to-accent',
                      'flex items-center justify-center',
                      'shadow-[0_8px_30px_rgb(0,0,0,0.15)]',
                      'transition-all duration-300',
                      'hover:scale-110 active:scale-95',
                      'border-4 border-background'
                    )}
                  >
                    <div className="text-white">
                      {tab.icon}
                    </div>
                  </button>
                );
              }

              // Skip center placeholder for sellers
              if (isCenter) return null;

              // Calculate spacing for buyer nav (avoid center button)
              const isBuyerAdjacentToCenter = effectiveRole === 'buyer' && (index === 1 || index === 3);

              return (
                <button
                  key={tab.route}
                  onClick={() => handleTabClick(tab.route, tab.name)}
                  className={cn(
                    'flex flex-col items-center justify-center min-w-[56px] min-h-[44px] relative py-1',
                    'transition-colors duration-200 active:scale-95',
                    isActive ? 'text-primary' : 'text-muted-foreground',
                    isBuyerAdjacentToCenter && 'mx-4'
                  )}
                >
                  {/* Icon */}
                  <div className={cn('transition-transform duration-200', isActive && 'scale-110')}>
                    {tab.icon}
                  </div>

                  {/* Active dot */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTabDot"
                      className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary"
                      transition={{
                        type: 'spring',
                        bounce: 0.2,
                        duration: 0.6
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </motion.nav>
  );
};
