import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useRole } from '@/contexts/RoleContext';

// Safe localStorage access for Safari private browsing
const getLanguageSafely = (): 'en' | 'ar' => {
  try {
    return (localStorage.getItem('currentLanguage') || 'ar') as 'en' | 'ar';
  } catch {
    return 'ar';
  }
};

export const SignupSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentRole } = useRole();
  const [currentLanguage] = useState<'en' | 'ar'>(getLanguageSafely);

  // Use location state first, then context, then default
  const userType = location.state?.userType || currentRole || 'buyer';

  useEffect(() => {
    // Trigger confetti animation safely
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (error) {
      if (import.meta.env.DEV) console.warn('Confetti animation failed:', error);
    }
  }, []);

  const handleContinue = async () => {
    let isNative = false;

    try {
      const { Capacitor } = await import('@capacitor/core');
      isNative = Capacitor.isNativePlatform();
    } catch (error) {
      if (import.meta.env.DEV) console.warn('Capacitor not available, assuming web platform');
      isNative = false;
    }

    if (isNative) {
      navigate('/app/permissions/camera', { replace: true });
    } else {
      navigate(userType === 'seller' ? '/app/seller/home' : '/app/buyer/home', { replace: true });
    }
  };

  return (
    <div
      data-native-screen-surface="true"
      className="min-h-app bg-background flex items-center justify-center p-6 pb-safe-or-4 pt-safe"
      dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="mb-8 inline-flex"
        >
          <div className="p-6 rounded-full bg-success/10">
            <CheckCircle className="w-20 h-20 text-success" />
          </div>
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-display font-bold mb-4"
        >
          {currentLanguage === 'ar' ? '🎉 مرحباً بك في MaintMENA!' : '🎉 Welcome to MaintMENA!'}
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-lg text-muted-foreground mb-8"
        >
          {currentLanguage === 'ar'
            ? 'تم إنشاء حسابك بنجاح. جاهز لبدء رحلتك معنا؟'
            : 'Your account has been created successfully. Ready to start your journey?'}
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Button onClick={handleContinue} size="lg" className="w-full">
            {currentLanguage === 'ar' ? 'لنبدأ' : "Let's Get Started"}
          </Button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-sm text-muted-foreground mt-6"
        >
          {currentLanguage === 'ar'
            ? 'تحقق من بريدك الإلكتروني لتفعيل الحساب'
            : 'Check your email to verify your account'}
        </motion.p>
      </motion.div>
    </div>
  );
};
