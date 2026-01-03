import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Wrench, MessageSquare, Shield, Search, TrendingUp, Award } from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';
import { JobFOMOTicker } from '@/components/mobile/JobFOMOTicker';

const buyerSlides = [
  {
    icon: Wrench,
    title: { en: 'Find Trusted Pros', ar: 'ابحث عن فنيين موثوقين' },
    subtitle: { en: 'Post your request and get quotes from verified technicians', ar: 'انشر طلبك واحصل على عروض من فنيين معتمدين' }
  },
  {
    icon: MessageSquare,
    title: { en: 'Compare & Chat', ar: 'قارن وتواصل' },
    subtitle: { en: 'Review offers, negotiate prices, and chat directly with providers', ar: 'راجع العروض، فاوض على الأسعار، وتواصل مباشرة' }
  },
  {
    icon: Shield,
    title: { en: 'Secure Contracts', ar: 'عقود آمنة' },
    subtitle: { en: 'Sign digital contracts and pay securely through the platform', ar: 'وقّع عقود رقمية وادفع بأمان عبر المنصة' }
  }
];

const sellerSlides = [
  {
    icon: Search,
    title: { en: 'Find New Clients', ar: 'ابحث عن عملاء جدد' },
    subtitle: { en: 'Browse job opportunities in your area and service categories', ar: 'تصفح فرص العمل في منطقتك وتخصصاتك' }
  },
  {
    icon: TrendingUp,
    title: { en: 'Send Winning Quotes', ar: 'أرسل عروض تنافسية' },
    subtitle: { en: 'Submit competitive quotes and stand out from the competition', ar: 'قدّم عروض أسعار منافسة وتميّز عن غيرك' }
  },
  {
    icon: Award,
    title: { en: 'Grow Your Business', ar: 'طوّر عملك' },
    subtitle: { en: 'Track earnings, build reputation, and get verified', ar: 'تتبع أرباحك، ابنِ سمعتك، واحصل على التوثيق' }
  }
];

export const OnboardingSlides = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [language, setLanguage] = useState<'en' | 'ar'>('ar');
  const navigate = useNavigate();
  const { intendedRole } = useRole();
  const isRtl = language === 'ar';

  // Select slides based on role
  const slides = intendedRole === 'seller' ? sellerSlides : buyerSlides;

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      localStorage.setItem('hasSeenOnboarding', 'true');
      localStorage.setItem('currentLanguage', language);
      
      // Navigate based on role
      if (intendedRole === 'seller') {
        navigate('/app/onboarding/seller-plan-selection');
      } else {
        // Buyers go straight to signup with auto-free plan
        navigate('/app/onboarding/signup');
      }
    }
  };

  const handleSkip = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    localStorage.setItem('currentLanguage', language);
    
    // Navigate based on role
    if (intendedRole === 'seller') {
      navigate('/app/onboarding/seller-plan-selection');
    } else {
      // Buyers go straight to signup with auto-free plan
      navigate('/app/onboarding/signup');
    }
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Language Toggle */}
      <div className="p-4 flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
          className="text-sm"
        >
          {language === 'ar' ? 'English' : 'عربي'}
        </Button>
      </div>

      {/* FOMO Ticker - Only for Sellers */}
      {intendedRole === 'seller' && (
        <div className="px-4 pb-2">
          <JobFOMOTicker currentLanguage={language} />
        </div>
      )}

      {/* Slide Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="text-center max-w-md"
          >
            <div className="mb-8 inline-flex p-6 rounded-full bg-primary/10">
              <Icon className="w-16 h-16 text-primary" />
            </div>

            <h2 className="text-3xl font-display font-bold mb-4">
              {slide.title[language]}
            </h2>

            <p className="text-lg text-muted-foreground leading-relaxed">
              {slide.subtitle[language]}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Pagination Dots */}
        <div className="flex gap-2 mt-12">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide ? 'w-8 bg-primary' : 'w-2 bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="p-6 flex items-center justify-between">
        <Button variant="ghost" onClick={handleSkip}>
          {language === 'ar' ? 'تخطي' : 'Skip'}
        </Button>

        <Button onClick={handleNext} size="lg">
          {currentSlide === slides.length - 1 
            ? (language === 'ar' ? 'ابدأ' : 'Get Started')
            : (language === 'ar' ? 'التالي' : 'Next')
          }
        </Button>
      </div>
    </div>
  );
};
