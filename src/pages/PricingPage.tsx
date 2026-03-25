import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Wrench, Check, Shield, Zap, Award } from 'lucide-react';
import BuyerPricing from '@/components/landing/BuyerPricing';
import SellerPricing from '@/components/landing/SellerPricing';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription, SubscriptionTier } from '@/hooks/useSubscription';
import { toast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';
import { SEOHead } from '@/components/SEOHead';

interface PricingPageProps {
  currentLanguage: 'en' | 'ar';
}

type PricingType = 'buyer' | 'seller';

const PricingPage = ({ currentLanguage }: PricingPageProps) => {
  const [selectedType, setSelectedType] = useState<PricingType>('buyer');
  const navigate = useNavigate();
  const { user, userType } = useAuth();
  const { subscription, updateSubscriptionTier } = useSubscription();

  const handleSelectPlan = async (tier: SubscriptionTier, planType?: 'buyer' | 'seller') => {
    if (!user) {
      // Redirect to signup with plan selection
      const userTypeForNav = planType || userType || 'buyer';
      const planIdMap: Record<SubscriptionTier, string> = {
        free: 'free',
        comfort: 'comfort',
        priority: 'priority',
        starter: 'starter',
        professional: 'professional',
        elite: 'elite',
        basic: 'free',
        enterprise: 'priority'
      };
      navigate(`/signup?type=${userTypeForNav}&plan=${planIdMap[tier]}&billing=monthly`);
      return;
    }

    if (subscription?.tier === tier) {
      toast({
        title: currentLanguage === 'ar' ? 'خطة حالية' : 'Current Plan',
        description: currentLanguage === 'ar' ? 'هذه هي خطتك الحالية' : 'This is your current plan',
      });
      return;
    }

    const { error } = await updateSubscriptionTier(tier);
    if (error) {
      toast({
        title: currentLanguage === 'ar' ? 'خطأ' : 'Error',
        description: currentLanguage === 'ar' ? 'فشل تحديث الخطة' : 'Failed to update plan',
        variant: 'destructive'
      });
    } else {
      toast({
        title: currentLanguage === 'ar' ? 'نجح!' : 'Success!',
        description: currentLanguage === 'ar' ? 'تم تحديث خطتك بنجاح' : 'Plan updated successfully',
      });
      // Navigate to role-specific dashboard
      if (userType === 'buyer') {
        navigate('/buyer-dashboard');
      } else if (userType === 'seller') {
        navigate('/seller-dashboard');
      } else if (userType === 'admin') {
        navigate('/admin');
      } else {
        navigate('/seller-dashboard');
      }
    }
  };

  const handleTypeChange = (type: PricingType) => {
    setSelectedType(type);
    trackEvent('pricing_toggle_switch', {
      from_type: selectedType,
      to_type: type,
      language: currentLanguage
    });
  };

  const content = {
    en: {
      hero: {
        badge: 'Pricing',
        title: 'Plans That Grow With You',
        subtitle: 'Transparent pricing designed for success. Start free, upgrade anytime.',
      },
      trust: [
        { icon: Check, text: 'No Hidden Fees' },
        { icon: Shield, text: 'Cancel Anytime' },
        { icon: Zap, text: 'Instant Activation' },
        { icon: Award, text: '30-Day Money Back' }
      ],
      stats: {
        users: '10,000+',
        usersLabel: 'Active Users',
        projects: '25,000+',
        projectsLabel: 'Projects Completed',
        satisfaction: '98%',
        satisfactionLabel: 'Satisfaction Rate'
      }
    },
    ar: {
      hero: {
        badge: 'الأسعار',
        title: 'خطط تنمو معك',
        subtitle: 'أسعار شفافة مصممة للنجاح. ابدأ مجاناً، وترقى في أي وقت.',
      },
      trust: [
        { icon: Check, text: 'بدون رسوم مخفية' },
        { icon: Shield, text: 'إلغاء في أي وقت' },
        { icon: Zap, text: 'تفعيل فوري' },
        { icon: Award, text: 'ضمان استرداد 30 يوم' }
      ],
      stats: {
        users: '+10,000',
        usersLabel: 'مستخدم نشط',
        projects: '+25,000',
        projectsLabel: 'مشروع مكتمل',
        satisfaction: '98%',
        satisfactionLabel: 'معدل الرضا'
      }
    }
  };

  const lang = content[currentLanguage];

  return (
    <div 
      className="min-h-screen bg-gradient-to-b from-muted/30 via-paper to-muted/20 pt-24" 
      dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
    >
      <SEOHead 
        title={currentLanguage === 'ar' 
          ? 'الأسعار — خطط مرنة للجميع | MaintMENA'
          : 'Pricing — Flexible Plans for Everyone | MaintMENA'
        }
        description={currentLanguage === 'ar'
          ? 'اختر الخطة المناسبة لك. أسعار شفافة بدون رسوم مخفية. ابدأ مجاناً وترقى حسب احتياجاتك'
          : 'Choose the right plan for you. Transparent pricing with no hidden fees. Start free and upgrade as you grow.'
        }
        keywords="pricing plans, subscription, maintenance pricing, contractor pricing, buyer plans, seller plans, أسعار الخدمات, خطط الاشتراك"
        canonical="https://maintmena.com/pricing"
      />

      <div className="max-w-7xl mx-auto px-4 pb-24">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent mb-6"
          >
            <Award className="w-4 h-4" />
            <span className="text-sm font-medium">{lang.hero.badge}</span>
          </motion.div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-ink">
            {lang.hero.title}
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            {lang.hero.subtitle}
          </p>

          {/* Social Proof Stats */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-8 mb-8"
          >
            <div className="text-center">
              <div className="text-3xl font-bold text-accent">{lang.stats.users}</div>
              <div className="text-sm text-muted-foreground">{lang.stats.usersLabel}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-accent">{lang.stats.projects}</div>
              <div className="text-sm text-muted-foreground">{lang.stats.projectsLabel}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-accent">{lang.stats.satisfaction}</div>
              <div className="text-sm text-muted-foreground">{lang.stats.satisfactionLabel}</div>
            </div>
          </motion.div>
        </motion.div>

        {/* Creative Toggle */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="max-w-2xl mx-auto mb-8"
        >
          <div className="relative bg-muted/50 backdrop-blur-sm border-2 border-rule/30 rounded-2xl p-2 shadow-xl">
            {/* Sliding Background */}
            <motion.div
              className="absolute top-2 bottom-2 w-[calc(50%-0.25rem)] bg-gradient-to-br from-accent to-accent-2 rounded-xl shadow-md"
              initial={false}
              animate={{
                x: currentLanguage === 'ar' 
                  ? (selectedType === 'buyer' ? 0 : '-100%')
                  : (selectedType === 'buyer' ? 0 : '100%'),
              }}
              style={{
                left: currentLanguage === 'ar' ? 'auto' : '0.5rem',
                right: currentLanguage === 'ar' ? '0.5rem' : 'auto',
              }}
              transition={{ type: 'tween', duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            />

            {/* Toggle Buttons */}
            <div className="relative grid grid-cols-2 gap-2">
              {/* Buyer Toggle */}
              <button
                onClick={() => handleTypeChange('buyer')}
                className={`relative py-5 px-6 rounded-xl transition-all duration-300 ${
                  selectedType === 'buyer'
                    ? 'text-paper'
                    : 'text-muted-foreground hover:text-ink'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <Home className="w-7 h-7" />
                  <span className="font-bold text-base">
                    {currentLanguage === 'ar' ? 'أبحث عن خدمة' : 'I Need a Service'}
                  </span>
                  <span className="text-xs opacity-90">
                    {currentLanguage === 'ar' ? 'للمنازل والمشاريع' : 'For Homeowners'}
                  </span>
                </div>
              </button>

              {/* Seller Toggle */}
              <button
                onClick={() => handleTypeChange('seller')}
                className={`relative py-5 px-6 rounded-xl transition-all duration-300 ${
                  selectedType === 'seller'
                    ? 'text-paper'
                    : 'text-muted-foreground hover:text-ink'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <Wrench className="w-7 h-7" />
                  <span className="font-bold text-base">
                    {currentLanguage === 'ar' ? 'أقدم خدمة' : 'I Provide Services'}
                  </span>
                  <span className="text-xs opacity-90">
                    {currentLanguage === 'ar' ? 'للمحترفين' : 'For Professionals'}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap justify-center gap-6 mb-16 max-w-3xl mx-auto"
        >
          {lang.trust.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 text-muted-foreground">
              <item.icon className="w-4 h-4 text-accent flex-shrink-0" />
              <span className="text-sm font-medium">{item.text}</span>
            </div>
          ))}
        </motion.div>

        {/* Pricing Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedType}
            initial={{ opacity: 0, x: selectedType === 'buyer' ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: selectedType === 'buyer' ? 20 : -20 }}
            transition={{ duration: 0.3 }}
          >
            {selectedType === 'buyer' ? (
              <BuyerPricing currentLanguage={currentLanguage} />
            ) : (
              <SellerPricing currentLanguage={currentLanguage} />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Bottom CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-24 text-center"
        >
          <div className="max-w-2xl mx-auto bg-gradient-to-br from-accent/5 to-accent-2/5 rounded-3xl p-8 md:p-12 border border-accent/20">
            <h3 className="text-2xl md:text-3xl font-bold mb-4 text-ink">
              {currentLanguage === 'ar' 
                ? 'هل تحتاج مساعدة في اختيار الخطة؟'
                : 'Need Help Choosing a Plan?'
              }
            </h3>
            <p className="text-muted-foreground mb-6 text-lg">
              {currentLanguage === 'ar'
                ? 'فريقنا هنا لمساعدتك في اختيار الخطة المثالية لاحتياجاتك'
                : 'Our team is here to help you find the perfect plan for your needs'
              }
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <motion.a
                href="/contact"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 bg-accent hover:bg-accent/90 text-white rounded-lg font-medium transition-colors"
              >
                {currentLanguage === 'ar' ? 'تواصل معنا' : 'Contact Sales'}
              </motion.a>
              <motion.a
                href="/support"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 border-2 border-accent text-accent hover:bg-accent/5 rounded-lg font-medium transition-colors"
              >
                {currentLanguage === 'ar' ? 'احصل على الدعم' : 'Get Support'}
              </motion.a>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PricingPage;
