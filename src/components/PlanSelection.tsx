import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';
import { PRICING_CONFIG } from '@/utils/pricingConfig';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { JobFOMOTicker } from '@/components/mobile/JobFOMOTicker';

interface PlanSelectionProps {
  userType: 'buyer' | 'seller';
  currentLanguage: 'en' | 'ar';
  onSelectPlan: (plan: string, isAnnual: boolean) => void;
  preSelectedPlan?: string;
  preSelectedBilling?: 'monthly' | 'annual';
}

const PlanSelection = ({ userType, currentLanguage, onSelectPlan, preSelectedPlan, preSelectedBilling }: PlanSelectionProps) => {
  const { formatAmount } = useCurrency();
  const navigate = useNavigate();
  const [isAnnual, setIsAnnual] = useState(preSelectedBilling === 'annual');

  const handleSelectPlan = (planId: string, annual: boolean) => {
    onSelectPlan(planId, annual);
    navigate('/app/onboarding/signup');
  };

  const content = {
    en: {
      buyer: {
        tagline: 'CHOOSE YOUR PLAN',
        headline: 'Select the plan that fits your needs',
        plans: [
          {
            id: 'free',
            name: 'Basic',
            description: 'Perfect for occasional repairs',
            features: [
              '10 job posts',
              'Access to verified pros',
              'Standard support',
              'Standard response time'
            ],
            cta: 'Continue with Basic'
          },
          {
            id: 'comfort',
            name: 'Comfort',
            popular: true,
            description: 'Most popular for homeowners',
            features: [
              'Unlimited job posts',
              'Automated contract generation',
              'Warranty coverage',
              'Priority support',
              'Everything in Basic'
            ],
            cta: 'Continue with Comfort'
          },
          {
            id: 'priority',
            name: 'Priority',
            description: 'For developers and property managers',
            features: [
              'Extended warranty + insurance',
              'Dedicated consultant',
              '24/7 priority response',
              'Bulk project discounts',
              'Everything in Comfort'
            ],
            cta: 'Continue with Priority'
          }
        ]
      },
      seller: {
        tagline: 'CHOOSE YOUR PLAN',
        headline: 'Select the plan that fits your business',
        plans: [
          {
            id: 'starter',
            name: 'Starter',
            description: 'Start building your reputation',
            features: [
              'Send up to 5 quotes',
              'Receive 10 bookings',
              'Weekly briefs',
              'Basic profile'
            ],
            cta: 'Continue with Starter'
          },
          {
            id: 'professional',
            name: 'Professional',
            popular: true,
            description: 'Recommended for growing businesses',
            features: [
              'Unlimited quotes',
              'Unlimited Bookings',
              'Verified badge',
              'Automated contract generation',
              'Priority Support',
              'Everything in Starter'
            ],
            cta: 'Continue with Professional'
          },
          {
            id: 'elite',
            name: 'Elite',
            description: 'For established pros and contractors',
            features: [
              'Featured profile',
              'Advanced analytics dashboard',
              'Premium customer support',
              'Customizable contracts',
              'Marketing toolkit',
              'Exclusive networking events',
              'Everything in Professional'
            ],
            cta: 'Continue with Elite'
          }
        ]
      },
      toggle: {
        monthly: 'Monthly',
        annual: 'Annual (Save 20%)'
      }
    },
    ar: {
      buyer: {
        tagline: 'اختر خطتك',
        headline: 'اختر الخطة التي تناسب احتياجاتك',
        plans: [
          {
            id: 'free',
            name: 'الأساسية',
            description: 'مثالي للتصليحات العرضية',
            features: [
              '١٠ طلبات وظيفة',
              'وصول لمحترفين موثوقين',
              'دعم أساسي',
              'وقت استجابة قياسي'
            ],
            cta: 'متابعة مع الأساسية'
          },
          {
            id: 'comfort',
            name: 'الراحة',
            popular: true,
            description: 'الأكثر شعبية لأصحاب المنازل',
            features: [
              'طلبات غير محدودة',
              'إنشاء عقود تلقائي',
              'تغطية ضمان',
              'دعم أولوية',
              'كل شيء في الأساسية'
            ],
            cta: 'متابعة مع الراحة'
          },
          {
            id: 'priority',
            name: 'الأولوية',
            description: 'للمطورين ومديري العقارات',
            features: [
              'ضمان موسع + تأمين',
              'استشاري مخصص',
              'استجابة أولوية ٢٤/٧',
              'خصومات مشاريع بالجملة',
              'كل شيء في الراحة'
            ],
            cta: 'متابعة مع الأولوية'
          }
        ]
      },
      seller: {
        tagline: 'اختر خطتك',
        headline: 'اختر الخطة التي تناسب عملك',
        plans: [
          {
            id: 'starter',
            name: 'البداية',
            description: 'ابدأ ببناء سمعتك',
            features: [
              'أرسل حتى ٥ عروض',
              'استقبل ١٠ حجوزات',
              'ملخصات أسبوعية',
              'ملف أساسي'
            ],
            cta: 'متابعة مع البداية'
          },
          {
            id: 'professional',
            name: 'المحترف',
            popular: true,
            description: 'موصى به للأعمال النامية',
            features: [
              'عروض غير محدودة',
              'حجوزات غير محدودة',
              'شارة موثق',
              'إنشاء عقود تلقائي',
              'دعم أولوية',
              'كل شيء في البداية'
            ],
            cta: 'متابعة مع المحترف'
          },
          {
            id: 'elite',
            name: 'النخبة',
            description: 'للمحترفين والمقاولين المعروفين',
            features: [
              'ملف مميز',
              'لوحة تحليلات متقدمة',
              'دعم عملاء ممتاز',
              'عقود قابلة للتخصيص',
              'أدوات تسويق',
              'فعاليات تواصل حصرية',
              'كل شيء في المحترف'
            ],
            cta: 'متابعة مع النخبة'
          }
        ]
      },
      toggle: {
        monthly: 'شهري',
        annual: 'سنوي (وفر 20%)'
      }
    }
  };

  const lang = content[currentLanguage][userType];
  const toggleLang = content[currentLanguage].toggle;

  const getPlanPrice = (planId: string) => {
    const planConfig = PRICING_CONFIG[planId as keyof typeof PRICING_CONFIG];
    if (!planConfig || planConfig.monthly === 0) return null;
    
    return {
      monthly: planConfig.monthly,
      annual: planConfig.annual
    };
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto">
        {/* FOMO Ticker for Sellers */}
        {userType === 'seller' && (
          <div className="mb-8">
            <JobFOMOTicker currentLanguage={currentLanguage} />
          </div>
        )}

        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-3">
            {lang.tagline}
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            {lang.headline}
          </h1>

          {/* Billing Toggle */}
          <div className="inline-flex gap-2 p-1 bg-card rounded-lg border shadow-sm">
            <Button
              variant={!isAnnual ? 'default' : 'ghost'}
              onClick={() => setIsAnnual(false)}
              className="rounded-md"
            >
              {toggleLang.monthly}
            </Button>
            <Button
              variant={isAnnual ? 'default' : 'ghost'}
              onClick={() => setIsAnnual(true)}
              className="rounded-md"
            >
              {toggleLang.annual}
            </Button>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {lang.plans.map((plan, index) => {
            const price = getPlanPrice(plan.id);
            
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative bg-card rounded-2xl p-8 border-2 ${
                  preSelectedPlan === plan.id
                    ? 'border-primary shadow-xl scale-105 ring-2 ring-primary/20'
                    : plan.popular
                    ? 'border-primary shadow-xl scale-105'
                    : 'border-border hover:border-primary/40'
                } transition-all`}
              >
                {preSelectedPlan === plan.id ? (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-bold">
                    {currentLanguage === 'ar' ? 'محدد مسبقًا' : 'Pre-selected'}
                  </div>
                ) : plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-bold">
                    {currentLanguage === 'ar' ? 'الأكثر شعبية' : 'Most Popular'}
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                  
                  {price && (
                    <div className="mb-3 inline-block">
                      <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-semibold">
                        {currentLanguage === 'ar' ? '✨ تجربة مجانية لمدة 14 يومًا' : '✨ 14-day free trial'}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-baseline gap-1">
                    {price ? (
                      <>
                        <span className="text-4xl font-bold">
                          {formatAmount(isAnnual ? price.annual / 12 : price.monthly, 'SAR')}
                        </span>
                        <span className="text-muted-foreground">
                          {currentLanguage === 'ar' ? '/شهر' : '/mo'}
                        </span>
                      </>
                    ) : (
                      <span className="text-4xl font-bold">
                        {currentLanguage === 'ar' ? 'مجاني' : 'Free'}
                      </span>
                    )}
                  </div>
                  {price && isAnnual && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {currentLanguage === 'ar' 
                        ? `${formatAmount(price.annual, 'SAR')} يُدفع سنويًا` 
                        : `${formatAmount(price.annual, 'SAR')} billed annually`}
                    </p>
                  )}
                  {price && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {currentLanguage === 'ar' 
                        ? 'بعد التجربة المجانية' 
                        : 'After free trial'}
                    </p>
                  )}
                </div>

                <Button
                  className="w-full mb-6"
                  variant={plan.popular ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => handleSelectPlan(plan.id, isAnnual)}
                >
                  {plan.cta}
                </Button>

                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PlanSelection;
