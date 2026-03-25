import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

interface AuthTriggerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentLanguage: 'en' | 'ar';
  pendingAction?: {
    type: 'booking' | 'request' | 'save_vendor' | 'message' | 'navigation';
    data?: any;
    returnPath?: string;
  };
}

export const AuthTriggerModal = ({ 
  open, 
  onOpenChange, 
  currentLanguage,
  pendingAction 
}: AuthTriggerModalProps) => {
  const navigate = useNavigate();

  const content = {
    en: {
      title: 'Complete Your Booking',
      subtitle: 'Create a free account to book this technician and get contract protection.',
      benefits: [
        'Track your requests and bookings',
        'Digital contract protection',
        'Communicate with technicians',
        'Secure payment options'
      ],
      getStarted: 'Get Started',
      haveAccount: 'Already have an account?',
      signIn: 'Sign In'
    },
    ar: {
      title: 'أكمل حجزك',
      subtitle: 'أنشئ حساب مجاني لحجز هذا الفني والحصول على حماية العقود.',
      benefits: [
        'تتبع طلباتك وحجوزاتك',
        'حماية العقود الرقمية',
        'تواصل مع الفنيين',
        'خيارات دفع آمنة'
      ],
      getStarted: 'ابدأ الآن',
      haveAccount: 'لديك حساب؟',
      signIn: 'تسجيل الدخول'
    }
  };

  const t = content[currentLanguage];

  const handleGetStarted = () => {
    // Save pending action to localStorage with complete data
    if (pendingAction) {
      localStorage.setItem('pendingAction', JSON.stringify(pendingAction));
    }
    // Save role as buyer since this modal is for buyer guests
    localStorage.setItem('selectedRole', 'buyer');
    // Also set intendedRole for RoleContext
    localStorage.setItem('intendedRole', 'buyer');
    onOpenChange(false);
    // Go directly to buyer signup (skip role selection)
    navigate('/app/onboarding/signup');
  };

  const handleSignIn = () => {
    // Save pending action to localStorage with complete data
    if (pendingAction) {
      localStorage.setItem('pendingAction', JSON.stringify(pendingAction));
    }
    // Save role as buyer
    localStorage.setItem('selectedRole', 'buyer');
    localStorage.setItem('intendedRole', 'buyer');
    onOpenChange(false);
    navigate('/app/onboarding/login');
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="focus:outline-none">
        <div 
          className="px-6 pt-6 pb-8 space-y-6"
          dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
        >
          {/* Header Section with Warm Background */}
          <div className="bg-[#FDF8F3] dark:bg-amber-950/20 rounded-2xl p-5 -mx-2">
            <h3 className={`text-xl font-bold text-foreground ${currentLanguage === 'ar' ? 'font-ar-heading' : ''}`}>
              {t.title}
            </h3>
            <p className={`text-sm text-muted-foreground mt-2 ${currentLanguage === 'ar' ? 'font-ar-body' : ''}`}>
              {t.subtitle}
            </p>
          </div>

          {/* Benefits List */}
          <div className="space-y-3">
            {t.benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: currentLanguage === 'ar' ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-amber-600" />
                </div>
                <span className={`text-sm text-foreground ${currentLanguage === 'ar' ? 'font-ar-body' : ''}`}>
                  {benefit}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <Button 
              onClick={handleGetStarted}
              className="w-full h-12 text-base rounded-xl bg-amber-600 hover:bg-amber-700 text-white"
            >
              {t.getStarted}
            </Button>
            
            <div className="flex items-center justify-center gap-2">
              <span className={`text-sm text-muted-foreground ${currentLanguage === 'ar' ? 'font-ar-body' : ''}`}>
                {t.haveAccount}
              </span>
              <button
                onClick={handleSignIn}
                className={`text-sm font-medium text-primary hover:underline ${currentLanguage === 'ar' ? 'font-ar-body' : ''}`}
              >
                {t.signIn}
              </button>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
