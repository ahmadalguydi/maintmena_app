import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Check, X, Crown, Gift, Sparkles } from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';
import { LanguageToggle } from '@/components/mobile/LanguageToggle';

interface AlphaSellerWelcomeProps {
  currentLanguage: 'en' | 'ar';
  onToggle: () => void;
}

export const AlphaSellerWelcome = ({ currentLanguage, onToggle }: AlphaSellerWelcomeProps) => {
  const navigate = useNavigate();
  const { setIntendedRole } = useRole();
  const isRtl = currentLanguage === 'ar';

  const handleContinue = () => {
    setIntendedRole('seller');
    // Store that this is an alpha seller
    localStorage.setItem('isAlphaSeller', 'true');
    localStorage.setItem('selectedPlan', 'professional');
    localStorage.setItem('selectedBilling', 'monthly');
    navigate('/app/onboarding/signup');
  };

  const content = {
    en: {
      badge: 'EXCLUSIVE MEMBERSHIP',
      heading: "Because You're Special",
      subheading: 'As an early adopter, you get exclusive benefits during our soft opening',
      freeLabel: 'FREE during Soft Opening',
      comparison: {
        title: 'Your Exclusive Benefits',
        starter: {
          name: 'Starter Plan',
          price: 'SAR 0/mo',
          features: [
            { text: '5 quotes/month', included: true },
            { text: '10 bookings/month', included: true },
            { text: 'Basic profile', included: true },
            { text: 'Verified badge', included: false },
            { text: 'Unlimited quotes', included: false },
            { text: 'Priority support', included: false },
          ]
        },
        professional: {
          name: 'Professional Plan',
          price: 'SAR 199/mo',
          yourPrice: 'FREE',
          features: [
            { text: 'Unlimited quotes', included: true },
            { text: 'Unlimited bookings', included: true },
            { text: 'Premium profile', included: true },
            { text: 'Verified badge', included: true },
            { text: 'Contract generation', included: true },
            { text: 'Priority support', included: true },
          ]
        }
      },
      zeroPlatformFees: '0% Fees',
      zeroPlatformFeesDesc: 'Keep 100% of your earnings during soft opening',
      cta: 'Continue'
    },
    ar: {
      badge: 'عضوية حصرية',
      heading: 'لأنك تستاهل',
      subheading: 'كونك من أوائل المستخدمين، تحصل على مزايا حصرية خلال الإفتتاح التجريبي',
      freeLabel: 'مجاناً خلال الإفتتاح التجريبي',
      comparison: {
        title: 'مزاياك الحصرية',
        starter: {
          name: 'خطة البداية',
          price: '٠ ريال/شهر',
          features: [
            { text: '٥ عروض بالشهر', included: true },
            { text: '١٠ حجوزات بالشهر', included: true },
            { text: 'ملف أساسي', included: true },
            { text: 'شارة موثق', included: false },
            { text: 'عروض بلا حدود', included: false },
            { text: 'دعم أولوية', included: false },
          ]
        },
        professional: {
          name: 'خطة المحترف',
          price: '١٩٩ ريال/شهر',
          yourPrice: 'ببلاش',
          features: [
            { text: 'عروض بلا حدود', included: true },
            { text: 'حجوزات بلا حدود', included: true },
            { text: 'ملف مميز', included: true },
            { text: 'شارة موثق', included: true },
            { text: 'إنشاء عقود', included: true },
            { text: 'دعم أولوية', included: true },
          ]
        }
      },
      zeroPlatformFees: '٠٪ عمولة',
      zeroPlatformFeesDesc: 'كل اللي تكسبه لك خلال الإفتتاح التجريبي',
      cta: 'يلا نكمل'
    }
  };

  const t = content[currentLanguage];

  return (
    <div 
      className="min-h-screen bg-background flex flex-col" 
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Language Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageToggle language={currentLanguage} onToggle={onToggle} />
      </div>

      <div className="flex-1 p-6 pt-16 pb-32 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto space-y-6"
        >
          {/* Exclusive Badge */}
          <div className="flex justify-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm shadow-lg"
            >
              <Sparkles size={16} />
              <span className={isRtl ? 'font-ar-display' : ''}>{t.badge}</span>
              <Sparkles size={16} />
            </motion.div>
          </div>

          {/* Heading */}
          <div className="text-center space-y-2">
            <h1 className={`text-3xl font-bold ${isRtl ? 'font-ar-display' : 'font-display'}`}>
              {t.heading}
            </h1>
            <p className={`text-muted-foreground ${isRtl ? 'font-ar-body' : ''}`}>
              {t.subheading}
            </p>
          </div>

          {/* Zero Platform Fees Banner */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-4 text-white text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <Gift size={24} />
              <span className={`text-2xl font-bold ${isRtl ? 'font-ar-display' : ''}`}>{t.zeroPlatformFees}</span>
            </div>
            <p className={`text-sm text-white/90 ${isRtl ? 'font-ar-body' : ''}`}>{t.zeroPlatformFeesDesc}</p>
          </motion.div>

          {/* Comparison Cards */}
          <div className="space-y-3">
            <h3 className={`text-lg font-semibold text-center ${isRtl ? 'font-ar-display' : ''}`}>
              {t.comparison.title}
            </h3>

            {/* Starter Plan (crossed out) */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-muted/50 rounded-xl p-4 opacity-60"
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`font-semibold line-through ${isRtl ? 'font-ar-body' : ''}`}>{t.comparison.starter.name}</span>
                <span className="text-sm text-muted-foreground">{t.comparison.starter.price}</span>
              </div>
              <div className="space-y-2">
                {t.comparison.starter.features.map((feature, i) => (
                  <div key={i} className={`flex items-center gap-2 text-sm ${!feature.included ? 'text-muted-foreground' : ''}`}>
                    {feature.included ? (
                      <Check size={16} className="text-muted-foreground" />
                    ) : (
                      <X size={16} className="text-red-400" />
                    )}
                    <span className={`${!feature.included ? 'line-through' : ''} ${isRtl ? 'font-ar-body' : ''}`}>{feature.text}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Professional Plan (highlighted) */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl p-4 border-2 border-primary relative overflow-hidden"
            >
              {/* Free badge */}
              <div className={`absolute -top-1 ${isRtl ? '-left-1' : '-right-1'}`}>
                <div className={`bg-green-500 text-white text-xs font-bold px-3 py-1 ${isRtl ? 'rounded-br-lg font-ar-body' : 'rounded-bl-lg'}`}>
                  {t.freeLabel}
                </div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Crown size={20} className="text-primary" />
                  <span className={`font-bold ${isRtl ? 'font-ar-body' : ''}`}>{t.comparison.professional.name}</span>
                </div>
                <div className={isRtl ? 'text-left' : 'text-right'}>
                  <span className="text-sm text-muted-foreground line-through">{t.comparison.professional.price}</span>
                  <span className={`block text-lg font-bold text-green-600 ${isRtl ? 'font-ar-display' : ''}`}>{t.comparison.professional.yourPrice}</span>
                </div>
              </div>
              <div className="space-y-2">
                {t.comparison.professional.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Check size={16} className="text-green-500" />
                    <span className={isRtl ? 'font-ar-body' : ''}>{feature.text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-background/95 backdrop-blur border-t">
        <Button
          size="lg"
          className={`w-full h-14 text-lg ${isRtl ? 'font-ar-display' : ''}`}
          onClick={handleContinue}
        >
          {t.cta}
        </Button>
      </div>
    </div>
  );
};