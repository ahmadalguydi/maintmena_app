import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { registerPushNotifications } from '@/lib/pushNotifications';

export const PermissionNotifications = () => {
  const [isRequesting, setIsRequesting] = useState(false);
  const navigate = useNavigate();
  const { user, userType } = useAuth();
  const currentLanguage = (localStorage.getItem('currentLanguage') || 'ar') as 'en' | 'ar';

  const targetRoute = userType === 'seller' ? '/app/seller/home' : '/app/buyer/home';

  const handleAllow = async () => {
    setIsRequesting(true);

    try {
      if (user) {
        const success = await registerPushNotifications(user.id, {
          force: true,
          userType: userType === 'seller' ? 'seller' : 'buyer',
          onNavigate: (url) => navigate(url),
        });

        if (success) {
          localStorage.setItem('notificationsPermission', 'granted');
          toast.success(currentLanguage === 'ar' ? 'تم منح الإذن' : 'Permission granted');
        } else {
          localStorage.removeItem('notificationsPermission');
          toast.error(
            currentLanguage === 'ar'
              ? 'لم يتم تفعيل الإشعارات'
              : 'Notifications were not enabled',
          );
        }
      }

      navigate(targetRoute);
    } catch {
      navigate(targetRoute);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSkip = () => {
    navigate(targetRoute);
  };

  return (
    <div
      data-native-screen-surface="true"
      className="min-h-app bg-background flex flex-col items-center justify-center p-6 pb-safe-or-4 pt-safe"
      dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center max-w-md"
      >
        <div className="mb-8 inline-flex p-8 rounded-full bg-primary/10">
          <Bell className="w-20 h-20 text-primary" />
        </div>

        <h2 className="text-2xl font-display font-bold mb-4">
          {currentLanguage === 'ar' ? 'الإشعارات' : 'Stay Updated'}
        </h2>

        <p className="text-muted-foreground mb-8 leading-relaxed">
          {currentLanguage === 'ar'
            ? 'احصل على تنبيهات فورية عند استلام عروض أسعار جديدة أو رسائل'
            : 'Get instant alerts when your request is updated or a new message arrives'}
        </p>

        <div className="space-y-3">
          <Button onClick={handleAllow} disabled={isRequesting} className="w-full" size="lg">
            {isRequesting
              ? currentLanguage === 'ar'
                ? 'جاري الطلب...'
                : 'Requesting...'
              : currentLanguage === 'ar'
                ? 'تفعيل الإشعارات'
                : 'Enable Notifications'}
          </Button>

          <Button variant="ghost" onClick={handleSkip} className="w-full">
            {currentLanguage === 'ar' ? 'تخطي الآن' : 'Skip for Now'}
          </Button>
        </div>

        <div className="mt-8 p-4 bg-muted/30 rounded-lg">
          <p className="text-xs text-muted-foreground">
            {currentLanguage === 'ar'
              ? 'نرسل إشعارات مهمة فقط - لن نزعجك كثيراً'
              : "We only send important notifications - we won't spam you"}
          </p>
        </div>
      </motion.div>
    </div>
  );
};
