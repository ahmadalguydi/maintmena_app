import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';

interface SellerPricingProps {
  currentLanguage: 'en' | 'ar';
}

const SellerPricing = ({ currentLanguage }: SellerPricingProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatAmount } = useCurrency();
  const [isAnnual, setIsAnnual] = useState(false);

  const content = {
    en: {
      tagline: 'FOR PROFESSIONALS & Freelancers',
      headline: 'Get steady clients, verified credibility, and priority placement',
      toggle: {
        monthly: 'Monthly',
        annual: 'Annual (Save 20%)'
      },
      plans: [
        {
          name: 'Starter',
          price: 'Free',
          period: '',
          popular: false,
          description: 'Start building your reputation',
          features: [
            'Send up to 5 quotes',
            'Receive 10 bookings',
            'Weekly briefs',
            'Basic profile'
          ],
          cta: 'Get Started'
        },
        {
          name: 'Professional',
          price: { monthly: 39, annual: 374 },
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
          cta: 'Upgrade to Pro'
        },
        {
          name: 'Elite',
          price: { monthly: 199, annual: 1910 },
          popular: false,
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
          cta: 'Join Elite'
        }
      ]
    },
    ar: {
      tagline: 'للمحترفين والمقاولين',
      headline: 'احصل على عملاء ثابتين، مصداقية موثقة، وترتيب أولوية',
      toggle: {
        monthly: 'شهري',
        annual: 'سنوي (وفر 20%)'
      },
      plans: [
        {
          name: 'البداية',
          price: 'مجاني',
          period: '',
          popular: false,
          description: 'ابدأ ببناء سمعتك',
          features: [
            'أرسل حتى ٥ عروض',
            'استقبل ١٠ حجوزات',
            'ملخصات أسبوعية',
            'ملف أساسي'
          ],
          cta: 'ابدأ الآن'
        },
        {
          name: 'المحترف',
          price: { monthly: 39, annual: 374 },
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
          cta: 'ترقية للمحترف'
        },
        {
          name: 'النخبة',
          price: { monthly: 199, annual: 1910 },
          popular: false,
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
          cta: 'انضم للنخبة'
        }
      ]
    }
  };

  const lang = content[currentLanguage];

  const handleCTA = (planName: string) => {
    if (user) {
      navigate('/settings');
    } else {
      const planId = planName.toLowerCase();
      navigate(`/signup?type=seller&plan=${planId}&billing=${isAnnual ? 'annual' : 'monthly'}`);
    }
  };

  return (
    <section className="py-20 px-4 bg-paper" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          >
          <p className="text-accent-2 font-semibold text-sm uppercase tracking-wider mb-3">
            {lang.tagline}
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-ink mb-6">
            {lang.headline}
          </h2>

          {/* Billing Toggle */}
          <div className="inline-flex gap-2 p-1 bg-paper rounded-lg border border-rule/40 shadow-sm">
            <Button
              variant={!isAnnual ? 'default' : 'ghost'}
              onClick={() => setIsAnnual(false)}
              className="rounded-md"
            >
              {lang.toggle.monthly}
            </Button>
            <Button
              variant={isAnnual ? 'default' : 'ghost'}
              onClick={() => setIsAnnual(true)}
              className="rounded-md relative"
            >
              {lang.toggle.annual}
            </Button>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {lang.plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative bg-paper rounded-2xl p-8 border-2 ${
                plan.popular
                  ? 'border-accent-2 shadow-xl scale-105 bg-accent-2/5'
                  : 'border-rule/40 hover:border-accent-2/40'
              } transition-all`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-accent-2 text-paper px-4 py-1 rounded-full text-sm font-bold">
                  {currentLanguage === 'ar' ? 'موصى به' : 'Recommended'}
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2 text-ink">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  {typeof plan.price === 'string' ? (
                    <span className="text-4xl font-bold text-ink">{plan.price}</span>
                  ) : (
                    <>
                      <span className="text-4xl font-bold text-ink">
                        {formatAmount(isAnnual ? plan.price.annual / 12 : plan.price.monthly, 'SAR')}
                      </span>
                      <span className="text-muted-foreground">
                        {currentLanguage === 'ar' ? '/شهر' : '/mo'}
                      </span>
                    </>
                  )}
                </div>
                {typeof plan.price !== 'string' && isAnnual && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {currentLanguage === 'ar' 
                      ? `${formatAmount(plan.price.annual, 'SAR')} يُدفع سنويًا` 
                      : `${formatAmount(plan.price.annual, 'SAR')} billed annually`}
                  </p>
                )}
              </div>

              <Button
                className="w-full mb-6"
                variant={plan.popular ? 'default' : 'outline'}
                size="lg"
                onClick={() => handleCTA(plan.name)}
              >
                {plan.cta}
              </Button>

              <ul className="space-y-3">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="w-5 h-5 text-accent-2 flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SellerPricing;
