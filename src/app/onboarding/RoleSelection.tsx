import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TouchCard } from '@/components/mobile/TouchCard';
import { useRole } from '@/contexts/RoleContext';
import { useHaptics } from '@/hooks/useHaptics';
import { LanguageToggle } from '@/components/mobile/LanguageToggle';

interface RoleSelectionProps {
  currentLanguage: 'en' | 'ar';
  onToggle: () => void;
}

export const RoleSelection = ({ currentLanguage, onToggle }: RoleSelectionProps) => {
  const navigate = useNavigate();
  const { setIntendedRole } = useRole();
  const { vibrate } = useHaptics();
  const [selectedRole, setSelectedRole] = useState<'buyer' | 'seller' | null>(null);

  const content = {
    en: {
      heading: 'What brings you here?',
      subheading: 'Let us help you get started',
      buyer: {
        title: 'I need a service',
        description: 'Post jobs, get quotes from trusted pros'
      },
      seller: {
        title: 'I provide services',
        description: 'Find clients, grow your business'
      },
      continue: 'Get Started',
      hasAccount: 'Already have an account?',
      signIn: 'Sign In'
    },
    ar: {
      heading: 'تبي أحد يخلص لك الشغل؟',
      subheading: 'خلنا نساعدك تبدأ',
      buyer: {
        title: 'أحتاج خدمة',
        description: 'انشر طلبات واحصل على عروض من فنيين موثوقين'
      },
      seller: {
        title: 'أقدم خدمات',
        description: 'ابحث عن عملاء وطوّر شغلك'
      },
      continue: 'إبدأ الان',
      hasAccount: 'عندك حساب؟',
      signIn: 'تسجيل الدخول'
    }
  };

  const t = content[currentLanguage];

  const handleRoleSelect = async (role: 'buyer' | 'seller') => {
    await vibrate('light');
    setSelectedRole(role);
  };

  const handleContinue = () => {
    if (!selectedRole) return;
    setIntendedRole(selectedRole);
    
    // Lazy Registration: Buyers go directly to explore (guest mode)
    // Sellers go to alpha welcome page (special benefits)
    if (selectedRole === 'buyer') {
      localStorage.setItem('guestMode', 'true');
      navigate('/app/buyer/explore');
    } else {
      // Alpha run: send sellers to special alpha welcome instead of plan selection
      navigate('/app/onboarding/alpha-seller');
    }
  };

  return (
    <div 
      className="min-h-screen bg-background flex flex-col p-6 justify-center" 
      dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Language Toggle */}
      <div className="absolute top-4 right-4">
        <LanguageToggle language={currentLanguage} onToggle={onToggle} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md mx-auto w-full"
      >
        <h1 className={`text-4xl font-bold mb-3 text-center ${
          currentLanguage === 'ar' ? 'font-ar-display' : 'font-display'
        }`}>
          {t.heading}
        </h1>
        
        <p className="text-center text-muted-foreground mb-12 text-lg">
          {t.subheading}
        </p>

        <div className="space-y-4 mb-8">
          <TouchCard
            onClick={() => handleRoleSelect('buyer')}
            variant={selectedRole === 'buyer' ? 'elevated' : 'outlined'}
            className={selectedRole === 'buyer' ? 'border-accent border-2 bg-accent/5' : ''}
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-accent/10">
                <Home className="w-8 h-8 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-1">{t.buyer.title}</h3>
                <p className="text-sm text-muted-foreground">{t.buyer.description}</p>
              </div>
            </div>
          </TouchCard>

          <TouchCard
            onClick={() => handleRoleSelect('seller')}
            variant={selectedRole === 'seller' ? 'elevated' : 'outlined'}
            className={selectedRole === 'seller' ? 'border-accent border-2 bg-accent/5' : ''}
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Wrench className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-1">{t.seller.title}</h3>
                <p className="text-sm text-muted-foreground">{t.seller.description}</p>
              </div>
            </div>
          </TouchCard>
        </div>

        <Button
          size="lg"
          className="w-full h-14 text-lg"
          disabled={!selectedRole}
          onClick={handleContinue}
        >
          {t.continue}
        </Button>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t.hasAccount}{' '}
            <Button
              variant="link"
              className="p-0 h-auto"
              onClick={() => navigate('/app/onboarding/login')}
            >
              {t.signIn}
            </Button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};
