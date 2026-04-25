import { Bell, MapPin, UserPlus } from 'lucide-react';
import { getGreeting } from '@/lib/smartTime';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useNotifications } from '@/hooks/useNotifications';
import { useDarkMode } from '@/hooks/useDarkMode';
import { motion, AnimatePresence } from 'framer-motion';
import { SAUDI_CITIES_BILINGUAL } from '@/lib/saudiCities';

interface AppHeaderProps {
  currentLanguage?: 'en' | 'ar';
  greeting?: string;
  userName?: string;
  location?: string;
  showNotifications?: boolean;
  onAuthRequired?: () => void;
}

export const AppHeader = ({
  currentLanguage = 'en',
  greeting,
  userName,
  location = 'Riyadh',
  showNotifications = true,
  onAuthRequired
}: AppHeaderProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, getAvatarUrl, isLoading: isProfileLoading } = useProfile(user?.id);
  const { unreadCount } = useNotifications({ includeList: false });
  const isDark = useDarkMode();

  const isGuestBuyer = !user;

  const localizedLocation = (() => {
    if (currentLanguage !== 'ar' || !location) return location;

    return location
      .split(',')
      .map((segment) => {
        const value = segment.trim();
        const city = SAUDI_CITIES_BILINGUAL.find(
          (item) =>
            item.en.toLowerCase() === value.toLowerCase() ||
            item.aliases?.some((alias) => alias.toLowerCase() === value.toLowerCase()),
        );
        return city?.ar || value;
      })
      .join('، ');
  })();

  const greetingText = greeting ?? getGreeting(currentLanguage);

  const displayName = userName ||
    (currentLanguage === 'ar' ? (profile as any)?.full_name_ar : profile?.full_name) ||
    profile?.full_name ||
    user?.email?.split('@')[0] ||
    'User';

  const handleSignUpClick = () => {
    // Navigate directly to buyer signup form
    navigate('/app/onboarding/signup?role=buyer');
  };

  return (
    <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        data-native-app-header="true"
        data-native-top-surface={isDark ? '#121212' : '#ffffff'}
        data-native-tone={isDark ? 'dark' : 'light'}
        className="sticky top-0 z-40 border-b border-border/50 bg-background/95 shadow-sm backdrop-blur-xl"
    >
        <div className="bg-background/95 pt-safe-top">
            <div className="px-4 py-3 flex items-center justify-between">
        {/* Left: Avatar + Greeting (or Sign Up for guests) */}
        <div className="flex items-center gap-3">
          {isGuestBuyer ? (
            // Guest buyer: Show sign up button
            <Button
              onClick={handleSignUpClick}
              className={cn(
                "gap-2",
                currentLanguage === 'ar' ? 'font-ar-body flex-row-reverse' : 'font-body'
              )}
            >
              <UserPlus size={18} />
              {currentLanguage === 'ar' ? 'إنشاء حساب' : 'Sign Up'}
            </Button>
          ) : isProfileLoading ? (
            // Loading skeleton for profile
            <>
              <Skeleton className="w-11 h-11 rounded-full flex-shrink-0" />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-4 w-28 rounded" />
              </div>
            </>
          ) : (
            // Authenticated user: Show avatar + greeting
            <>
              <Avatar className="w-11 h-11 border-2 border-border/50 flex-shrink-0">
                <AvatarImage src={getAvatarUrl()} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex flex-col">
                <span className={cn(
                  'text-sm text-muted-foreground font-medium',
                  currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                )}>
                  {greetingText}
                </span>
                <span className={cn(
                  'text-base font-bold text-foreground',
                  currentLanguage === 'ar' ? 'font-ar-display' : 'font-display'
                )}>
                  {displayName}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Right: Location + Notifications */}
        <div className="flex items-center gap-2">
          {/* Location Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 border border-border/30">
            <MapPin size={14} className="text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">
              {localizedLocation}
            </span>
          </div>

          {/* Notifications */}
          {showNotifications && (
            <button
              onClick={() => {
                if (!user && onAuthRequired) {
                  onAuthRequired();
                } else {
                  navigate('/app/notifications');
                }
              }}
              className={cn(
                'relative p-2 rounded-full min-h-[44px] min-w-[44px]',
                'hover:bg-muted/50 transition-colors',
                'active:scale-95 flex items-center justify-center'
              )}
            >
              <Bell size={20} className="text-foreground" />
              <AnimatePresence>
                {unreadCount > 0 && (
                  <motion.div
                    key="notification-dot"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute top-1 right-1 min-w-[16px] h-4 rounded-full bg-destructive border border-background flex items-center justify-center px-0.5"
                  >
                    <span className="text-[9px] font-bold text-white leading-none">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          )}

          </div>
        </div>
      </div>
    </motion.header>
  );
};
