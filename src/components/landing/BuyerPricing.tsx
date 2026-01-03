import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';

interface BuyerPricingProps {
  currentLanguage: 'en' | 'ar';
}

const BuyerPricing = ({ currentLanguage }: BuyerPricingProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatAmount } = useCurrency();
  const [isAnnual, setIsAnnual] = useState(false);

  const content = {
    en: {
      tagline: 'FOR HOMEOWNERS & DEVELOPERS',
      headline: 'Choose a plan that keeps your home or project running smoothly',
      toggle: {
        monthly: 'Monthly',
        annual: 'Annual (Save 20%)'
      },
      plans: [
        {
          name: 'Basic',
          price: 'Free',
          period: '',
          popular: false,
          description: 'Perfect for occasional repairs',
          features: [
            '10 job posts',
            'Access to verified pros',
            'Standard support',
            'Standard response time'
          ],
          cta: 'Start Free'
        },
        {
          name: 'Comfort',
          price: { monthly: 29, annual: 278 },
          popular: true,
          description: 'Most popular for homeowners',
          features: [
            'Unlimited job posts',
            'Automated contract generation',
            'Warranty coverage',
            'Priority support',
            'Everything in Basic'
          ],
          cta: 'Subscribe Now'
        },
        {
          name: 'Priority',
          price: { monthly: 119, annual: 1142 },
          popular: false,
          description: 'For developers and property managers',
          features: [
            'Extended warranty + insurance',
            'Dedicated consultant',
            '24/7 priority response',
            'Bulk project discounts',
            'Everything in Comfort'
          ],
          cta: 'Upgrade to Priority'
        }
      ]
    },
    ar: {
      tagline: 'لأصحاب المنازل والمطورين',
      headline: 'اختر خطة تحافظ على بيتك أو مشروعك يشتغل بسلاسة',
      toggle: {
        monthly: 'شهري',
        annual: 'سنوي (وفر 20%)'
      },
      plans: [
        {
          name: 'الأساسية',
          price: 'مجاني',
          period: '',
          popular: false,
          description: 'مثالي للتصليحات العرضية',
          features: [
            '١٠ طلبات وظيفة',
            'وصول لمحترفين موثوقين',
            'دعم أساسي',
            'وقت استجابة قياسي'
          ],
          cta: 'ابدأ مجانًا'
        },
        {
          name: 'الراحة',
          price: { monthly: 29, annual: 278 },
          popular: true,
          description: 'الأكثر شعبية لأصحاب المنازل',
          features: [
            'طلبات غير محدودة',
            'إنشاء عقود تلقائي',
            'تغطية ضمان',
            'دعم أولوية',
            'كل شيء في الأساسية'
          ],
          cta: 'اشترك الآن'
        },
        {
          name: 'الأولوية',
          price: { monthly: 119, annual: 1142 },
          popular: false,
          description: 'للمطورين ومديري العقارات',
          features: [
            'ضمان موسع + تأمين',
            'استشاري مخصص',
            'استجابة أولوية ٢٤/٧',
            'خصومات مشاريع بالجملة',
            'كل شيء في الراحة'
          ],
          cta: 'ترقية للأولوية'
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
      navigate(`/signup?type=buyer&plan=${planId}&billing=${isAnnual ? 'annual' : 'monthly'}`);
    }
  };

  return (
    <section className="py-20 px-4 bg-muted/20" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          >
          <p className="text-accent font-semibold text-sm uppercase tracking-wider mb-3">
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
                  ? 'border-accent shadow-xl scale-105'
                  : 'border-rule/40 hover:border-accent/40'
              } transition-all`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-accent text-paper px-4 py-1 rounded-full text-sm font-bold">
                  {currentLanguage === 'ar' ? 'الأكثر شعبية' : 'Most Popular'}
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
                    <Check className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
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

export default BuyerPricing;
