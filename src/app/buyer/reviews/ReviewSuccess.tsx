import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Heading1, Body } from '@/components/mobile/Typography';
import { CheckCircle, Star, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';
import { useHaptics } from '@/hooks/useHaptics';

interface ReviewSuccessProps {
  currentLanguage: 'en' | 'ar';
}

export const ReviewSuccess = ({ currentLanguage }: ReviewSuccessProps) => {
  const navigate = useNavigate();
  const { notificationSuccess } = useHaptics();

  useEffect(() => {
    // Trigger confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    // Trigger haptic feedback
    notificationSuccess();
  }, []);

  const content = {
    ar: {
      title: 'شكراً لك!',
      message: 'تقييمك يساعدنا على تحسين جودة الخدمة',
      backHome: 'العودة للرئيسية',
      viewBookings: 'عرض الحجوزات'
    },
    en: {
      title: 'Thank You!',
      message: 'Your review helps us improve service quality',
      backHome: 'Back to Home',
      viewBookings: 'View Bookings'
    }
  };

  const t = content[currentLanguage];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <SoftCard className="text-center space-y-6 p-8">
          {/* Success Icon with Animation */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="relative inline-block"
          >
            <div className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
              <CheckCircle size={48} className="text-green-600" />
            </div>
            
            {/* Floating Stars */}
            <motion.div
              animate={{
                y: [0, -10, 0],
                rotate: [0, 5, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute -top-2 -right-2"
            >
              <Star size={24} className="fill-yellow-500 text-yellow-500" />
            </motion.div>
            
            <motion.div
              animate={{
                y: [0, -8, 0],
                rotate: [0, -5, 0]
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5
              }}
              className="absolute -bottom-2 -left-2"
            >
              <Sparkles size={20} className="text-primary" />
            </motion.div>
          </motion.div>

          {/* Title */}
          <Heading1 lang={currentLanguage} className="text-3xl">
            {t.title}
          </Heading1>

          {/* Message */}
          <Body lang={currentLanguage} className="text-muted-foreground">
            {t.message}
          </Body>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            <Button
              size="lg"
              onClick={() => navigate('/app/buyer/home')}
              className="w-full h-14"
            >
              {t.backHome}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/app/buyer/requests')}
              className="w-full h-14"
            >
              {t.viewBookings}
            </Button>
          </div>
        </SoftCard>
      </motion.div>
    </div>
  );
};
