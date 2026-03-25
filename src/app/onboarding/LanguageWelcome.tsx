import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useHaptics } from '@/hooks/useHaptics';

interface LanguageWelcomeProps {
  currentLanguage: 'en' | 'ar';
}

export const LanguageWelcome = ({ currentLanguage }: LanguageWelcomeProps) => {
  const navigate = useNavigate();
  const { vibrate } = useHaptics();

  const handleLanguageSelect = async (language: 'ar' | 'en') => {
    await vibrate('light');
    localStorage.setItem('preferredLanguage', language);
    navigate('/app/onboarding/role-selection');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-background via-muted/20 to-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8 text-center"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center"
        >
          <img 
            src="/images/welcome-maintmena.png" 
            alt="MaintMENA" 
            className="w-32 h-32"
          />
        </motion.div>

        {/* Arabic Hero Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <h1 className="text-3xl font-bold text-foreground leading-tight">
            تبي أحد يخلص لك<br />الشغل بدون وجع راس؟
          </h1>
          <p className="text-lg text-muted-foreground">
            Get reliable pros without the hassle
          </p>
        </motion.div>

        {/* Language Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-3"
        >
          <Button
            onClick={() => handleLanguageSelect('ar')}
            size="lg"
            className="w-full h-14 text-lg font-semibold"
          >
            استمر بالعربي ←
          </Button>

          <button
            onClick={() => handleLanguageSelect('en')}
            className="w-full text-muted-foreground hover:text-foreground transition-colors"
          >
            Continue in English →
          </button>
        </motion.div>

        {/* Terms */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-xs text-muted-foreground"
        >
          By continuing, you agree to our{' '}
          <a href="/terms" className="underline hover:text-foreground">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </a>
        </motion.p>
      </motion.div>
    </div>
  );
};
