import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  created_at: string;
  read: boolean;
  content_id?: string;
}

interface NotificationBellProps {
  currentLanguage?: 'en' | 'ar';
}

export const NotificationBell = ({ currentLanguage: propLanguage }: NotificationBellProps = {}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const currentLanguage = propLanguage || (localStorage.getItem('preferredLanguage') as 'en' | 'ar') || 'ar';

  const content = {
    en: {
      notifications: 'Notifications',
      markAllRead: 'Mark all read',
      noNotifications: 'No notifications yet'
    },
    ar: {
      notifications: 'الإشعارات',
      markAllRead: 'تعيين الكل كمقروء',
      noNotifications: 'لا توجد إشعارات بعد'
    }
  };

  const t = content[currentLanguage];

  // Notification title/message translations
  const notificationTranslations: Record<string, { title: { en: string; ar: string }; message: { en: string; ar: string } }> = {
    quote_received: {
      title: { en: 'New Quote Received', ar: 'عرض سعر جديد' },
      message: { en: 'You received a new quote', ar: 'استلمت عرض سعر جديد' }
    },
    quote_accepted: {
      title: { en: 'Quote Accepted', ar: 'تم قبول العرض' },
      message: { en: 'Your quote was accepted', ar: 'تم قبول عرضك' }
    },
    quote_declined: {
      title: { en: 'Quote Declined', ar: 'تم رفض العرض' },
      message: { en: 'Your quote was declined', ar: 'تم رفض عرضك' }
    },
    quote_negotiating: {
      title: { en: 'Quote Negotiation', ar: 'تفاوض على العرض' },
      message: { en: 'Quote is being negotiated', ar: 'جاري التفاوض على العرض' }
    },
    new_message: {
      title: { en: 'New Message', ar: 'رسالة جديدة' },
      message: { en: 'You have a new message', ar: 'لديك رسالة جديدة' }
    },
    booking_request: {
      title: { en: 'New Booking Request', ar: 'طلب حجز جديد' },
      message: { en: 'You received a new booking request', ar: 'استلمت طلب حجز جديد' }
    },
    booking_received: {
      title: { en: 'Booking Received', ar: 'تم استلام الحجز' },
      message: { en: 'New booking request received', ar: 'تم استلام طلب حجز جديد' }
    },
    booking_accepted: {
      title: { en: 'Booking Accepted', ar: 'تم قبول الحجز' },
      message: { en: 'Your booking was accepted', ar: 'تم قبول حجزك' }
    },
    booking_declined: {
      title: { en: 'Booking Declined', ar: 'تم رفض الحجز' },
      message: { en: 'Your booking was declined', ar: 'تم رفض حجزك' }
    },
    counter_proposal_received: {
      title: { en: 'Counter Proposal', ar: 'عرض مضاد' },
      message: { en: 'You received a counter proposal', ar: 'استلمت عرض مضاد' }
    },
    counter_proposal_accepted: {
      title: { en: 'Proposal Accepted', ar: 'تم قبول العرض' },
      message: { en: 'Your counter proposal was accepted', ar: 'تم قبول عرضك المضاد' }
    },
    buyer_counter_received: {
      title: { en: 'Buyer Counter', ar: 'عرض مضاد من المشتري' },
      message: { en: 'Buyer sent a counter proposal', ar: 'أرسل المشتري عرض مضاد' }
    },
    booking_cancelled: {
      title: { en: 'Booking Cancelled', ar: 'تم إلغاء الحجز' },
      message: { en: 'A booking was cancelled', ar: 'تم إلغاء الحجز' }
    },
    booking_message: {
      title: { en: 'New Booking Message', ar: 'رسالة حجز جديدة' },
      message: { en: 'You have a new message', ar: 'لديك رسالة جديدة' }
    },
    booking_updated: {
      title: { en: 'Booking Updated', ar: 'تم تحديث الحجز' },
      message: { en: 'A booking was updated', ar: 'تم تحديث الحجز' }
    },
    contract_created: {
      title: { en: 'Contract Created', ar: 'تم إنشاء العقد' },
      message: { en: 'A new contract has been created', ar: 'تم إنشاء عقد جديد' }
    },
    contract_updated: {
      title: { en: 'Contract Updated', ar: 'تم تحديث العقد' },
      message: { en: 'Contract has been updated', ar: 'تم تحديث العقد' }
    }
  };

  const getTranslatedNotification = (notification: Notification) => {
    const translation = notificationTranslations[notification.notification_type];
    if (translation) {
      return {
        title: currentLanguage === 'ar' ? translation.title.ar : notification.title,
        message: currentLanguage === 'ar' ? translation.message.ar : notification.message
      };
    }
    return { title: notification.title, message: notification.message };
  };

  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    }
  };

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    setIsOpen(false);

    // Handle different notification types with proper routing
    switch (notification.notification_type) {
      // Buyer: Quote Related
      case 'quote_received':
        if (notification.content_id) {
          navigate(`/app/buyer/quote/${notification.content_id}`);
        } else {
          navigate('/app/buyer/requests');
        }
        break;
      case 'quote_negotiating':
        if (notification.content_id) {
          navigate(`/app/buyer/quote/${notification.content_id}`);
        }
        break;

      // Seller: Quote Related
      case 'quote_accepted':
      case 'quote_declined':
        if (notification.content_id) {
          navigate(`/app/seller/quote/${notification.content_id}`);
        } else {
          navigate('/app/seller/quotes');
        }
        break;

      // Seller: Booking Related
      case 'booking_request':
      case 'booking_received':
      case 'booking_cancelled':
      case 'buyer_counter_received':
        if (notification.content_id) {
          navigate(`/app/seller/booking/${notification.content_id}`);
        } else {
          navigate('/app/seller/home');
        }
        break;

      // Buyer: Booking Related
      case 'booking_accepted':
      case 'booking_declined':
      case 'booking_updated':
      case 'counter_proposal_received':
        if (notification.content_id) {
          navigate(`/app/buyer/booking/${notification.content_id}`);
        } else {
          navigate('/app/buyer/home');
        }
        break;

      // Messages
      case 'new_message':
      case 'booking_message':
        navigate('/app/messages');
        break;

      case 'contract_created':
      case 'contract_updated':
        if (notification.content_id && notification.content_id.includes('-')) {
          // Heuristic: If it looks like a UUID, try contract page. 
          // Note: content_id should be the Contract ID ideally. 
          // If trigger sets it to Quote ID, we might need redirection. 
          // Providing safe fallback.
          if (user?.user_metadata?.role === 'seller') {
            navigate(`/app/seller/contract/${notification.content_id}`);
          } else {
            navigate(`/app/buyer/contract/${notification.content_id}`);
          }
        }
        break;

      default:
        navigate('/');
        break;
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, string> = {
      quote_received: '💼',
      quote_accepted: '✅',
      quote_declined: '❌',
      quote_negotiating: '🔄',
      new_message: '💬',
      deadline_reminder: '⏰',
      request_update: '📝',
      booking_request: '📅',
      booking_received: '📅',
      booking_accepted: '✅',
      booking_declined: '❌',
      counter_proposal_received: '🔄',
      counter_proposal_accepted: '✅',
      buyer_counter_received: '↩️',
      booking_cancelled: '🚫',
      booking_message: '💬',
      booking_updated: '📝',
      new_chat: '💬',
      contract_created: '📄',
      contract_updated: '📄'
    };
    return icons[type] || '🔔';
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1"
              >
                <Badge
                  variant="destructive"
                  className="h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-between p-4 border-b border-rule">
          <h3 className={`font-semibold text-ink ${currentLanguage === 'ar' ? 'font-ar-heading' : ''}`}>
            {t.notifications}
          </h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className={`text-xs ${currentLanguage === 'ar' ? 'font-ar-body' : ''}`}
            >
              {t.markAllRead}
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p className={`text-sm ${currentLanguage === 'ar' ? 'font-ar-body' : ''}`}>
                {t.noNotifications}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-rule">
              {notifications.map((notification) => {
                const translated = getTranslatedNotification(notification);
                return (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: currentLanguage === 'ar' ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`p-4 cursor-pointer transition-colors hover:bg-muted/30 ${!notification.read ? 'bg-accent/5' : ''
                      }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-3">
                      <div className="text-2xl flex-shrink-0">
                        {getNotificationIcon(notification.notification_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`font-medium text-sm text-ink line-clamp-1 ${currentLanguage === 'ar' ? 'font-ar-body' : ''}`}>
                            {translated.title}
                          </h4>
                          {!notification.read && (
                            <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className={`text-sm text-muted-foreground mt-1 line-clamp-2 ${currentLanguage === 'ar' ? 'font-ar-body' : ''}`}>
                          {translated.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(notification.created_at), 'MMM dd, h:mm a')}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
