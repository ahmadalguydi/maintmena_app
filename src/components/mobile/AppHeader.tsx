import { Bell, MessageCircle, MapPin, UserPlus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AppHeaderProps {
  currentLanguage?: 'en' | 'ar';
  greeting?: string;
  userName?: string;
  location?: string;
  showNotifications?: boolean;
  showMessages?: boolean;
  onAuthRequired?: () => void;
}

export const AppHeader = ({
  currentLanguage = 'en',
  greeting,
  userName,
  location = 'Riyadh',
  showNotifications = true,
  showMessages = true,
  onAuthRequired
}: AppHeaderProps) => {
  const navigate = useNavigate();
  const { user, userType } = useAuth();
  const { profile, getAvatarUrl } = useProfile(user?.id);
  const [unreadCount, setUnreadCount] = useState(0);

  const isGuestBuyer = !user;

  useEffect(() => {
    if (user) {
      loadUnreadCount();

      // Real-time subscription for notifications
      const channel = supabase
        .channel('notifications-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            loadUnreadCount();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadUnreadCount = async () => {
    if (!user) return;
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);

    setUnreadCount(count || 0);
  };

  const getGreeting = () => {
    if (greeting) return greeting;

    const hour = new Date().getHours();
    if (currentLanguage === 'ar') {
      if (hour < 12) return 'صباح الخير';
      if (hour < 18) return 'مساء الخير';
      return 'مساء الخير';
    } else {
      if (hour < 12) return 'Good morning';
      if (hour < 18) return 'Good afternoon';
      return 'Good evening';
    }
  };

  const displayName = userName ||
    (currentLanguage === 'ar' ? profile?.full_name_ar : profile?.full_name) ||
    profile?.full_name ||
    user?.email?.split('@')[0] ||
    'User';

  const handleSignUpClick = () => {
    // Navigate directly to buyer signup form
    navigate('/app/onboarding/signup?role=buyer');
  };

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
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
          ) : (
            // Authenticated user: Show avatar + greeting
            <>
              <Avatar className="w-11 h-11 border-2 border-border/50">
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
                  {getGreeting()}
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

        {/* Right: Location + Notifications + Messages */}
        <div className="flex items-center gap-2">
          {/* Location Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 border border-border/30">
            <MapPin size={14} className="text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">
              {currentLanguage === 'ar' ? 'الرياض' : location}
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
              {unreadCount > 0 && (
                <div className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full border border-background" />
              )}
            </button>
          )}

          {/* Messages */}
          {showMessages && (
            <button
              onClick={() => {
                if (!user && onAuthRequired) {
                  onAuthRequired();
                } else {
                  const messagesRoute = userType === 'buyer'
                    ? '/app/buyer/messages'
                    : '/app/seller/messages';
                  navigate(messagesRoute);
                }
              }}
              className={cn(
                'relative p-2 rounded-full min-h-[44px] min-w-[44px]',
                'hover:bg-muted/50 transition-colors',
                'active:scale-95 flex items-center justify-center'
              )}
            >
              <MessageCircle size={20} className="text-foreground" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};