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
    subtitle: {
      en: 'Post your request and we will match you with a verified technician.',
      ar: 'انشر طلبك وسنطابقك مع فني معتمد.',
    },
  },
  {
    icon: MessageSquare,
    title: { en: 'Track & Chat', ar: 'تابع وتواصل' },
    subtitle: {
      en: 'Follow request progress, confirm pricing, and chat directly with your provider.',
      ar: 'تابع تقدم الطلب، وأكد التسعير، وتواصل مباشرة مع مقدم الخدمة.',
    },
  },
  {
    icon: Shield,
    title: { en: 'Safe Completion', ar: 'إنهاء آمن' },
    subtitle: {
      en: 'Complete jobs with clear updates, approval steps, and trusted reviews.',
      ar: 'أنهِ الطلبات مع تحديثات واضحة وخطوات اعتماد وتقييمات موثوقة.',
    },
  },
];

const sellerSlides = [
  {
    icon: Search,
    title: { en: 'Receive New Requests', ar: 'استقبل طلبات جديدة' },
    subtitle: {
      en: 'Go online to receive matching service requests in your area.',
      ar: 'ابقَ متصلاً لاستقبال طلبات الخدمة المناسبة في منطقتك.',
    },
  },
  {
    icon: TrendingUp,
    title: { en: 'Respond Fast', ar: 'استجب بسرعة' },
    subtitle: {
      en: 'Accept suitable requests quickly and keep buyers updated during the job.',
      ar: 'اقبل الطلبات المناسبة بسرعة وابقِ العميل على اطلاع أثناء التنفيذ.',
    },
  },
  {
    icon: Award,
    title: { en: 'Grow Your Reputation', ar: 'طوّر سمعتك' },
    subtitle: {
      en: 'Track earnings, complete jobs reliably, and build lasting trust.',
      ar: 'تابع أرباحك، وأنجز الطلبات باحتراف، وابنِ ثقة طويلة الأمد.',
    },
  },
];

export const OnboardingSlides = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [language, setLanguage] = useState<'en' | 'ar'>('ar');
  const navigate = useNavigate();
  const { intendedRole } = useRole();
  const isRtl = language === 'ar';
  const slides = intendedRole === 'seller' ? sellerSlides : buyerSlides;

  const completeOnboarding = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    localStorage.setItem('currentLanguage', language);
    navigate(intendedRole === 'seller' ? '/app/onboarding/seller-plan-selection' : '/app/onboarding/signup');
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((previous) => previous + 1);
      return;
    }
    completeOnboarding();
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="p-4 flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')} className="text-sm">
          {language === 'ar' ? 'English' : 'عربي'}
        </Button>
      </div>

      {intendedRole === 'seller' && (
        <div className="px-4 pb-2">
          <JobFOMOTicker currentLanguage={language} />
        </div>
      )}

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

            <h2 className="text-3xl font-display font-bold mb-4">{slide.title[language]}</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">{slide.subtitle[language]}</p>
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-2 mt-12">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all ${index === currentSlide ? 'w-8 bg-primary' : 'w-2 bg-muted-foreground/30'}`}
            />
          ))}
        </div>
      </div>

      <div className="p-6 space-y-3">
        <Button onClick={handleNext} className="w-full" size="lg">
          {currentSlide === slides.length - 1
            ? language === 'ar' ? 'ابدأ الآن' : 'Get Started'
            : language === 'ar' ? 'التالي' : 'Next'}
        </Button>

        <Button variant="ghost" onClick={completeOnboarding} className="w-full">
          {language === 'ar' ? 'تخطي' : 'Skip'}
        </Button>
      </div>
    </div>
  );
};
