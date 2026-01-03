import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SoftCard } from '@/components/mobile/SoftCard';
import { AppHeader } from '@/components/mobile/AppHeader';
import { FloatingNav } from '@/components/mobile/FloatingNav';
import { Skeleton } from '@/components/ui/skeleton';
import { Heading2, Heading3, Body, BodySmall, Caption } from '@/components/mobile/Typography';
import { toast } from 'sonner';

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  created_at: string;
  read: boolean;
  content_id?: string;
}

export default function Notifications() {
  const { user, userType } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const currentLanguage = (localStorage.getItem('preferredLanguage') || localStorage.getItem('currentLanguage') || 'ar') as 'en' | 'ar';

  // Notification type translations
  const notificationTranslations: Record<string, { en: { title: string; message: string }; ar: { title: string; message: string } }> = {
    quote_received: {
      en: { title: 'New Quote Received', message: 'You received a new quote for your request' },
      ar: { title: 'عرض سعر جديد', message: 'لقد استلمت عرض سعر جديد لطلبك' }
    },
    quote_accepted: {
      en: { title: 'Quote Accepted!', message: 'Your quote has been accepted by the buyer' },
      ar: { title: 'تم قبول عرض السعر!', message: 'تم قبول عرض السعر الخاص بك من قبل المشتري' }
    },
    quote_declined: {
      en: { title: 'Quote Declined', message: 'Your quote has been declined' },
      ar: { title: 'تم رفض عرض السعر', message: 'تم رفض عرض السعر الخاص بك' }
    },
    new_message: {
      en: { title: 'New Message', message: 'You have a new message' },
      ar: { title: 'رسالة جديدة', message: 'لديك رسالة جديدة' }
    },
    booking_request: {
      en: { title: 'New Booking Request', message: 'You sent a new booking request' },
      ar: { title: 'طلب حجز جديد', message: 'لقد أرسلت طلب حجز جديد' }
    },
    booking_received: {
      en: { title: 'New Booking Received', message: 'You received a new booking request' },
      ar: { title: 'حجز جديد', message: 'لقد استلمت طلب حجز جديد' }
    },
    booking_accepted: {
      en: { title: 'Booking Accepted!', message: 'Your booking request has been accepted' },
      ar: { title: 'تم قبول الحجز!', message: 'تم قبول طلب الحجز الخاص بك' }
    },
    booking_declined: {
      en: { title: 'Booking Declined', message: 'Your booking request has been declined' },
      ar: { title: 'تم رفض الحجز', message: 'تم رفض طلب الحجز الخاص بك' }
    },
    counter_proposal_received: {
      en: { title: 'Counter Proposal Received', message: 'The seller sent you a counter proposal' },
      ar: { title: 'عرض مضاد', message: 'أرسل لك البائع عرضاً مضاداً' }
    },
    revision_requested: {
      en: { title: 'Revision Requested', message: 'The buyer requested changes to your offer' },
      ar: { title: 'طلب تعديل', message: 'طلب المشتري تعديلات على عرضك' }
    },
    booking_message: {
      en: { title: 'Booking Message', message: 'You have a new message about your booking' },
      ar: { title: 'رسالة حجز', message: 'لديك رسالة جديدة حول حجزك' }
    },
    contract_created: {
      en: { title: 'New Contract', message: 'Your service contract is ready for review' },
      ar: { title: 'عقد جديد', message: 'عقد الخدمة جاهز للمراجعة' }
    },
    contract_signed: {
      en: { title: 'Contract Signed', message: 'The contract has been signed' },
      ar: { title: 'تم توقيع العقد', message: 'تم توقيع العقد' }
    },
    contract_pending: {
      en: { title: 'Contract Pending', message: 'A contract is awaiting your signature' },
      ar: { title: 'عقد في الانتظار', message: 'هناك عقد ينتظر توقيعك' }
    },
    contract_executed: {
      en: { title: 'Contract Executed!', message: 'The contract has been signed by both parties' },
      ar: { title: 'تم تنفيذ العقد!', message: 'تم توقيع العقد من الطرفين' }
    },
    contract_updated: {
      en: { title: 'Contract Updated', message: 'The contract status has been updated' },
      ar: { title: 'تحديث العقد', message: 'تم تحديث حالة العقد' }
    },
    contract_rejected: {
      en: { title: 'Contract Rejected', message: 'The contract has been rejected' },
      ar: { title: 'تم رفض العقد', message: 'تم رفض العقد' }
    },
    job_started: {
      en: { title: 'Job Started', message: 'The service provider has started work' },
      ar: { title: 'بدأ العمل', message: 'بدأ مقدم الخدمة العمل' }
    },
    job_completed: {
      en: { title: 'Job Completed', message: 'The job has been marked as complete' },
      ar: { title: 'اكتمل العمل', message: 'تم وضع علامة على العمل كمكتمل' }
    },
    booking_updated: {
      en: { title: 'Booking Updated', message: 'Your booking request has been updated' },
      ar: { title: 'تم تحديث الحجز', message: 'تم تحديث حالة طلب الحجز الخاص بك' }
    },
    booking_cancelled: {
      en: { title: 'Booking Cancelled', message: 'A booking request has been cancelled' },
      ar: { title: 'تم إلغاء الحجز', message: 'تم إلغاء طلب الحجز' }
    },
    quote_updated: {
      en: { title: 'Quote Updated', message: 'A service provider has updated their quote for your request' },
      ar: { title: 'تم تحديث العرض', message: 'قام مقدم الخدمة بتحديث عرضه لطلبك' }
    }
  };

  const getTranslatedNotification = (notification: Notification) => {
    const translation = notificationTranslations[notification.notification_type];
    if (translation) {
      return translation[currentLanguage];
    }
    // Fallback to database values
    return {
      title: notification.title,
      message: notification.message
    };
  };

  useEffect(() => {
    if (user) {
      loadNotifications();

      // Subscribe to real-time updates
      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            loadNotifications();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;

    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setNotifications(data);
    }
    setLoading(false);
  };

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = async () => {
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    const contentId = notification.content_id;
    const homeRoute = userType === 'buyer' ? '/app/buyer/home' : '/app/seller/home';

    // Helper to check if contract exists
    const checkContractExists = async (id: string): Promise<boolean> => {
      const { data } = await supabase.from('contracts').select('id').eq('id', id).maybeSingle();
      return !!data;
    };

    // Helper to check if booking exists
    const checkBookingExists = async (id: string): Promise<boolean> => {
      const { data } = await supabase.from('booking_requests').select('id').eq('id', id).maybeSingle();
      return !!data;
    };

    // Helper to check if quote exists
    const checkQuoteExists = async (id: string): Promise<boolean> => {
      const { data } = await supabase.from('quote_submissions').select('id').eq('id', id).maybeSingle();
      return !!data;
    };

    // Helper to check if job/request exists
    const checkRequestExists = async (id: string): Promise<boolean> => {
      const { data } = await supabase.from('maintenance_requests').select('id').eq('id', id).maybeSingle();
      return !!data;
    };

    // Show error and navigate home if resource doesn't exist
    const handleMissingResource = (resourceType: string) => {
      toast.error(
        currentLanguage === 'ar'
          ? `هذا ${resourceType === 'contract' ? 'العقد' : resourceType === 'booking' ? 'الحجز' : resourceType === 'quote' ? 'عرض السعر' : 'الطلب'} لم يعد موجوداً`
          : `This ${resourceType} no longer exists`
      );
      navigate(homeRoute);
    };

    // Navigate based on notification type to specific screens
    switch (notification.notification_type) {
      // Quote-related notifications
      case 'quote_received':
      case 'quote_accepted':
      case 'quote_declined':
      case 'quote_revision_requested':
        if (contentId) {
          const quoteExists = await checkQuoteExists(contentId);
          if (!quoteExists) {
            handleMissingResource('quote');
            return;
          }
          if (userType === 'buyer') {
            navigate(`/app/buyer/quote/${contentId}`);
          } else {
            navigate(`/app/seller/quote/${contentId}`);
          }
        } else {
          navigate(userType === 'buyer' ? '/app/buyer/quotes' : '/app/seller/quotes');
        }
        break;

      // Booking-related notifications
      case 'booking_request':
      case 'booking_received':
      case 'booking_response':
        if (contentId) {
          const bookingExists1 = await checkBookingExists(contentId);
          if (!bookingExists1) {
            handleMissingResource('booking');
            return;
          }
          if (userType === 'buyer') {
            navigate(`/app/buyer/booking/${contentId}`);
          } else {
            navigate(`/app/seller/booking/${contentId}`);
          }
        } else {
          navigate(userType === 'buyer' ? '/app/buyer/requests' : '/app/seller/quotes');
        }
        break;

      case 'booking_accepted':
      case 'booking_declined':
      case 'counter_proposal_received':
      case 'revision_requested':
        if (contentId) {
          const bookingExists2 = await checkBookingExists(contentId);
          if (!bookingExists2) {
            handleMissingResource('booking');
            return;
          }
          navigate(`/app/buyer/booking/${contentId}`);
        } else {
          navigate('/app/buyer/requests');
        }
        break;

      // Contract-related notifications
      case 'contract_created':
      case 'contract_pending':
      case 'contract_signed':
      case 'contract_updated':
      case 'contract_rejected':
        if (contentId) {
          // Check if contract still exists
          const contractExists = await checkContractExists(contentId);
          if (!contractExists) {
            handleMissingResource('contract');
            return;
          }
          // Route to contract signing page (the actual existing route)
          if (userType === 'buyer') {
            navigate(`/app/buyer/contract/${contentId}/sign`);
          } else {
            navigate(`/app/seller/contract/${contentId}/review`);
          }
        } else {
          navigate(userType === 'buyer' ? '/app/buyer/requests' : '/app/seller/quotes');
        }
        break;

      case 'contract_executed':
        // For executed contracts, go to the booking/quote detail or home
        if (contentId) {
          const executedContractExists = await checkContractExists(contentId);
          if (!executedContractExists) {
            handleMissingResource('contract');
            return;
          }
          if (userType === 'buyer') {
            navigate(`/app/buyer/contract/${contentId}/sign`);
          } else {
            navigate(`/app/seller/contract/${contentId}/review`);
          }
        } else {
          navigate(userType === 'buyer' ? '/app/buyer/home' : '/app/seller/home');
        }
        break;

      // Job-related notifications
      case 'job_halted':
      case 'job_resolved':
      case 'job_resolution_progress':
        if (contentId) {
          if (userType === 'buyer') {
            navigate(`/app/buyer/job/${contentId}`);
          } else {
            navigate(`/app/seller/job/${contentId}`);
          }
        } else {
          navigate(userType === 'buyer' ? '/app/buyer/home' : '/app/seller/jobs');
        }
        break;

      // Message-related notifications
      case 'new_message':
      case 'booking_message':
        if (contentId) {
          navigate(`/app/messages/thread?booking=${contentId}`);
        } else {
          navigate(userType === 'buyer' ? '/app/buyer/messages' : '/app/seller/messages');
        }
        break;

      default:
        // Fallback to home
        navigate(userType === 'buyer' ? '/app/buyer/home' : '/app/seller/home');
        break;
    }
  };

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, string> = {
      quote_received: '💼',
      quote_accepted: '✅',
      quote_declined: '❌',
      new_message: '💬',
      booking_request: '📅',
      booking_received: '📅',
      booking_accepted: '✅',
      booking_declined: '❌',
      counter_proposal_received: '🔄',
      revision_requested: '✏️',
      booking_message: '💬',
    };
    return icons[type] || '🔔';
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-background pb-24" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <div className="px-4 pt-4 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Heading2 lang={currentLanguage} className="text-foreground">
              {currentLanguage === 'ar' ? 'الإشعارات' : 'Notifications'}
            </Heading2>
            {unreadCount > 0 && (
              <BodySmall lang={currentLanguage} className="text-muted-foreground mt-1">
                {currentLanguage === 'ar' ? `${unreadCount} إشعار جديد` : `${unreadCount} new notification${unreadCount > 1 ? 's' : ''}`}
              </BodySmall>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-primary min-h-[44px]"
            >
              <Check size={16} className="mr-2" />
              {currentLanguage === 'ar' ? 'تحديد الكل مقروء' : 'Mark all read'}
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[calc(100vh-200px)]">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <SoftCard key={i} className="p-4">
                  <div className="flex gap-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                </SoftCard>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <Bell size={64} className="mx-auto text-muted-foreground/30 mb-4" />
              <Heading3 lang={currentLanguage} className="text-foreground mb-2">
                {currentLanguage === 'ar' ? 'لا توجد إشعارات' : 'No Notifications'}
              </Heading3>
              <Body lang={currentLanguage} className="text-muted-foreground">
                {currentLanguage === 'ar' ? 'سيظهر هنا جميع تحديثاتك وإشعاراتك' : 'All your updates and notifications will appear here'}
              </Body>
            </motion.div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {notifications.map((notification, index) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <SoftCard
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 cursor-pointer transition-all hover:shadow-md ${!notification.read ? 'bg-accent/5 border-accent/20' : ''
                        }`}
                    >
                      <div className="flex gap-3">
                        <div className="text-3xl flex-shrink-0">
                          {getNotificationIcon(notification.notification_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <Body lang={currentLanguage} className="font-semibold line-clamp-1">
                              {getTranslatedNotification(notification).title}
                            </Body>
                            {!notification.read && (
                              <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                            )}
                          </div>
                          <BodySmall lang={currentLanguage} className="text-muted-foreground line-clamp-2 mb-2">
                            {getTranslatedNotification(notification).message}
                          </BodySmall>
                          <Caption lang={currentLanguage} className="text-muted-foreground">
                            {format(new Date(notification.created_at), 'MMM dd, h:mm a')}
                          </Caption>
                        </div>
                      </div>
                    </SoftCard>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
