import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Check, Home, Wrench, ArrowRight, Crown, ShoppingBag, Zap, Sparkles, Shield } from 'lucide-react';
import { SubscriptionTier } from '@/hooks/useSubscription';
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrency } from '@/hooks/useCurrency';
import { useAuth } from '@/hooks/useAuth';
import { trackTrialStarted, trackSubscriptionUpgraded } from '@/lib/brevoAnalytics';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: SubscriptionTier;
  onUpgrade: (tier: SubscriptionTier) => Promise<void>;
  onDowngrade: (tier: SubscriptionTier) => Promise<void>;
  onCancel: () => Promise<void>;
  currentLanguage: 'en' | 'ar';
}

type PricingType = 'buyer' | 'seller';

const tierDetails: Record<SubscriptionTier, {
  name: string;
  nameAr: string;
  monthlyPrice: number;
  annualPrice: number;
  icon: any;
  features: string[];
  featuresAr: string[];
  category: 'buyer' | 'seller' | 'general';
  description: string;
  descriptionAr: string;
}> = {
  free: { 
    name: 'Basic', 
    nameAr: 'الأساسي', 
    monthlyPrice: 0, 
    annualPrice: 0, 
    icon: Shield, 
    category: 'buyer',
    description: 'Perfect to get started',
    descriptionAr: 'مثالي للبدء',
    features: ['Post up to 3 service requests', 'Receive quotes from vendors', 'Basic messaging', 'Email support'], 
    featuresAr: ['انشر حتى 3 طلبات خدمة', 'استلم عروض من المزودين', 'مراسلة أساسية', 'دعم البريد'] 
  },
  comfort: { 
    name: 'Comfort', 
    nameAr: 'الراحة', 
    monthlyPrice: 29, 
    annualPrice: 278, 
    icon: ShoppingBag, 
    category: 'buyer',
    description: 'Enhanced features for homeowners',
    descriptionAr: 'ميزات محسّنة لأصحاب المنازل',
    features: ['Post up to 15 requests', 'Priority quote responses', 'Compare multiple quotes', 'Request calendar integration', 'Priority support'], 
    featuresAr: ['انشر حتى 15 طلب', 'ردود عروض أولوية', 'قارن عروض متعددة', 'تكامل تقويم الطلبات', 'دعم أولوية'] 
  },
  priority: { 
    name: 'Priority', 
    nameAr: 'الأولوية', 
    monthlyPrice: 119, 
    annualPrice: 1142, 
    icon: Crown, 
    category: 'buyer',
    description: 'For property managers and power users',
    descriptionAr: 'لمديري الممتلكات والمستخدمين المتقدمين',
    features: ['Unlimited requests', 'Dedicated account manager', 'Multi-property management', 'Custom contract templates', 'Advanced analytics', '24/7 priority support'], 
    featuresAr: ['طلبات غير محدودة', 'مدير حساب مخصص', 'إدارة ممتلكات متعددة', 'قوالب عقود مخصصة', 'تحليلات متقدمة', 'دعم أولوية 24/7'] 
  },
  starter: { 
    name: 'Starter', 
    nameAr: 'البداية', 
    monthlyPrice: 0, 
    annualPrice: 0, 
    icon: Shield, 
    category: 'seller',
    description: 'Great for new professionals',
    descriptionAr: 'رائع للمحترفين الجدد',
    features: ['Submit up to 10 quotes/month', 'Basic profile', 'Request notifications', 'Email support'], 
    featuresAr: ['قدم حتى 10 عروض/شهر', 'ملف أساسي', 'إشعارات الطلبات', 'دعم البريد'] 
  },
  professional: { 
    name: 'Professional', 
    nameAr: 'المحترف', 
    monthlyPrice: 39, 
    annualPrice: 374, 
    icon: Zap, 
    category: 'seller',
    description: 'Grow your maintenance business',
    descriptionAr: 'نمِّ أعمال الصيانة الخاصة بك',
    features: ['Unlimited quote submissions', 'Enhanced profile & portfolio', 'Verified badge', 'Priority listing', 'Quote analytics', 'Priority support'], 
    featuresAr: ['تقديم عروض غير محدود', 'ملف ونماذج أعمال محسّنة', 'شارة موثق', 'قائمة أولوية', 'تحليلات العروض', 'دعم أولوية'] 
  },
  elite: { 
    name: 'Elite', 
    nameAr: 'النخبة', 
    monthlyPrice: 199, 
    annualPrice: 1910, 
    icon: Sparkles, 
    category: 'seller',
    description: 'Maximum visibility and features',
    descriptionAr: 'أقصى رؤية وميزات',
    features: ['Everything in Professional', 'Featured placement', 'Elite badge', 'Advanced analytics dashboard', 'Dedicated success manager', 'API access for integrations', '24/7 VIP support'], 
    featuresAr: ['كل ما في المحترف', 'موضع مميز', 'شارة النخبة', 'لوحة تحليلات متقدمة', 'مدير نجاح مخصص', 'وصول API للتكاملات', 'دعم VIP على مدار الساعة'] 
  },
  basic: { 
    name: 'Basic', 
    nameAr: 'أساسي', 
    monthlyPrice: 0, 
    annualPrice: 0, 
    icon: Shield, 
    category: 'general',
    description: 'Basic access',
    descriptionAr: 'وصول أساسي',
    features: ['Basic access', 'Email support'], 
    featuresAr: ['وصول أساسي', 'دعم البريد'] 
  },
  enterprise: {
    name: 'Enterprise',
    nameAr: 'المؤسسة',
    monthlyPrice: 0,
    annualPrice: 0,
    icon: Crown,
    category: 'general',
    description: 'Custom solutions',
    descriptionAr: 'حلول مخصصة',
    features: ['Custom solutions', 'Dedicated support', 'Advanced features'],
    featuresAr: ['حلول مخصصة', 'دعم مخصص', 'ميزات متقدمة']
  }
};

export function SubscriptionManagementModal({
  isOpen,
  onClose,
  currentTier,
  onUpgrade,
  onDowngrade,
  onCancel,
  currentLanguage
}: SubscriptionManagementModalProps) {
  const { userType } = useAuth();
  
  // Determine if user is buyer or seller - prioritize userType from auth context
  const isBuyer = userType === 'buyer' ||
    (!userType && ['free', 'comfort', 'priority'].includes(currentTier));
  const isSeller = userType === 'seller' || 
    (!userType && ['starter', 'professional', 'elite'].includes(currentTier));
  
  const [selectedType, setSelectedType] = useState<PricingType>(
    isSeller ? 'seller' : 'buyer'
  );
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'upgrade' | 'downgrade'>('upgrade');
  const [processing, setProcessing] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);
  const { formatAmount } = useCurrency();

  const content = {
    en: {
      title: 'Manage Your Plan',
      subtitle: 'Choose the perfect plan for your needs',
      currentPlan: 'Current Plan',
      buyer: { title: 'I Need a Service', subtitle: 'For Homeowners' },
      seller: { title: 'I Provide a Service', subtitle: 'For Professionals' },
      monthly: 'Monthly',
      annually: 'Annually',
      save: 'Save 20%',
      perMonth: '/mo',
      perYear: '/yr',
      changePlan: 'Change Plan',
      current: 'Current',
      confirmUpgrade: 'Confirm Upgrade',
      confirmDowngrade: 'Confirm Plan Change',
      upgradeDesc: 'You will be charged the new amount starting from your next billing cycle.',
      downgradeDesc: 'Your plan will change at the end of your current billing period.',
      proceed: 'Confirm',
      cancelAction: 'Cancel',
      processing: 'Processing...',
      trust: {
        noFees: 'No Hidden Fees',
        cancel: 'Cancel Anytime',
        support: 'Fast Support'
      }
    },
    ar: {
      title: 'إدارة خطتك',
      subtitle: 'اختر الخطة المثالية لاحتياجاتك',
      currentPlan: 'الخطة الحالية',
      buyer: { title: 'أبحث عن خدمة', subtitle: 'للمنازل والمشاريع' },
      seller: { title: 'أقدم خدمة', subtitle: 'للمحترفين' },
      monthly: 'شهري',
      annually: 'سنوي',
      save: 'وفر 20%',
      perMonth: '/شهر',
      perYear: '/سنة',
      changePlan: 'تغيير الخطة',
      current: 'الحالية',
      confirmUpgrade: 'تأكيد الترقية',
      confirmDowngrade: 'تأكيد تغيير الخطة',
      upgradeDesc: 'سيتم محاسبتك بالمبلغ الجديد ابتداءً من دورة الفوترة التالية.',
      downgradeDesc: 'ستتغير خطتك في نهاية فترة الفوترة الحالية.',
      proceed: 'تأكيد',
      cancelAction: 'إلغاء',
      processing: 'جاري المعالجة...',
      trust: {
        noFees: 'بدون رسوم خفية',
        cancel: 'إلغاء في أي وقت',
        support: 'دعم سريع'
      }
    }
  };

  const t = content[currentLanguage];
  
  const buyerTiers: SubscriptionTier[] = ['free', 'comfort', 'priority'];
  const sellerTiers: SubscriptionTier[] = ['starter', 'professional', 'elite'];
  
  const tierOrder: SubscriptionTier[] = ['free', 'starter', 'basic', 'comfort', 'priority', 'professional', 'elite', 'enterprise'];
  const currentIndex = tierOrder.indexOf(currentTier);

  const handleTypeChange = (type: PricingType) => {
    // Prevent switching between buyer and seller types
    if ((isBuyer && type === 'seller') || (isSeller && type === 'buyer')) {
      return;
    }
    setSelectedType(type);
  };

  const handleTierSelect = (tier: SubscriptionTier) => {
    if (tier === currentTier) return;
    
    setSelectedTier(tier);
    const selectedIndex = tierOrder.indexOf(tier);
    setActionType(selectedIndex > currentIndex ? 'upgrade' : 'downgrade');
    setIsConfirmDialogOpen(true);
  };

  const formatPrice = (tier: SubscriptionTier) => {
    const details = tierDetails[tier];
    
    if (details.monthlyPrice === 0) {
      return currentLanguage === 'ar' ? 'مجاني' : 'Free';
    }
    
    const price = isAnnual ? details.annualPrice : details.monthlyPrice;
    const period = isAnnual ? t.perYear : t.perMonth;
    
    return `${formatAmount(price)}${period}`;
  };

  const handleConfirmAction = async () => {
    if (!selectedTier) return;
    
    setProcessing(true);
    try {
      if (actionType === 'upgrade') {
        await onUpgrade(selectedTier);
      } else {
        await onDowngrade(selectedTier);
      }

      // Track subscription change in Brevo (after successful change)
      // We'll use a setTimeout to let the user object update first
      setTimeout(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          trackSubscriptionUpgraded(user.email, {
            fromTier: currentTier,
            toTier: selectedTier,
            planType: isBuyer ? 'buyer' : 'seller'
          });
        }
      }, 100);
      
      setIsConfirmDialogOpen(false);
      onClose();
    } catch (error) {
      console.error('Error processing subscription change:', error);
    } finally {
      setProcessing(false);
    }
  };

  // Force display based on user type
  const displayTiers = isBuyer ? buyerTiers : isSeller ? sellerTiers : (selectedType === 'buyer' ? buyerTiers : sellerTiers);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 gap-0" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
          {/* Header Section */}
          <div className="bg-gradient-to-b from-muted/30 to-paper p-8 pb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-3 text-ink">
                {t.title}
              </h2>
              <p className="text-muted-foreground text-lg">
                {t.subtitle}
              </p>
            </motion.div>

            {/* Hide toggle if user is locked to one type */}
            {!isBuyer && !isSeller && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-2xl mx-auto mb-6"
              >
                <div className="relative bg-muted/50 backdrop-blur-sm border-2 border-rule/30 rounded-2xl p-2 shadow-lg">
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
                      className={`relative py-4 px-6 rounded-xl transition-all duration-300 ${
                        selectedType === 'buyer'
                          ? 'text-paper'
                          : 'text-muted-foreground hover:text-ink'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Home className="w-6 h-6" />
                        <span className="font-bold text-base">
                          {t.buyer.title}
                        </span>
                        <span className="text-xs opacity-80">
                          {t.buyer.subtitle}
                        </span>
                      </div>
                    </button>

                    {/* Seller Toggle */}
                    <button
                      onClick={() => handleTypeChange('seller')}
                      className={`relative py-4 px-6 rounded-xl transition-all duration-300 ${
                        selectedType === 'seller'
                          ? 'text-paper'
                          : 'text-muted-foreground hover:text-ink'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Wrench className="w-6 h-6" />
                        <span className="font-bold text-base">
                          {t.seller.title}
                        </span>
                        <span className="text-xs opacity-80">
                          {t.seller.subtitle}
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <Button
                variant={!isAnnual ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsAnnual(false)}
                className="min-w-[100px]"
              >
                {t.monthly}
              </Button>
              <Button
                variant={isAnnual ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsAnnual(true)}
                className="min-w-[100px] relative"
              >
                {t.annually}
                {isAnnual && (
                  <Badge className="absolute -top-2 -right-2 bg-accent text-paper text-xs px-1.5 py-0.5">
                    {t.save}
                  </Badge>
                )}
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="text-accent text-xl">✓</span>
                <span>{t.trust.noFees}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-accent text-xl">✓</span>
                <span>{t.trust.cancel}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-accent text-xl">✓</span>
                <span>{t.trust.support}</span>
              </div>
            </div>
          </div>

          {/* Pricing Cards Section */}
          <div className="p-8 pt-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedType}
                initial={{ opacity: 0, x: selectedType === 'buyer' ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: selectedType === 'buyer' ? 20 : -20 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                {displayTiers.map((tier, index) => {
                  const details = tierDetails[tier];
                  const Icon = details.icon;
                  const isCurrentTier = tier === currentTier;

                  return (
                    <motion.div
                      key={tier}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className={`relative p-6 h-full flex flex-col transition-all ${
                        isCurrentTier 
                          ? 'border-2 border-accent shadow-lg bg-accent/5' 
                          : 'border border-rule hover:border-accent/50 hover:shadow-md'
                      }`}>
                        {isCurrentTier && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                            <Badge className="bg-accent text-paper px-3 py-1">
                              {t.current}
                            </Badge>
                          </div>
                        )}

                        <div className="flex flex-col items-center text-center space-y-4 flex-1">
                          <div className="p-3 rounded-xl bg-accent/10">
                            <Icon className="w-8 h-8 text-accent" />
                          </div>

                          <div>
                            <h3 className="text-xl font-bold text-ink mb-1">
                              {currentLanguage === 'ar' ? details.nameAr : details.name}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              {currentLanguage === 'ar' ? details.descriptionAr : details.description}
                            </p>
                            <p className="text-3xl font-bold text-ink">
                              {formatPrice(tier)}
                            </p>
                          </div>

                          <ul className="space-y-2.5 w-full flex-1">
                            {(currentLanguage === 'ar' ? details.featuresAr : details.features).map((feature, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                <Check className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                                <span className="text-byline text-left">{feature}</span>
                              </li>
                            ))}
                          </ul>

                          {!isCurrentTier && (
                            <Button
                              className="w-full mt-4"
                              variant="default"
                              onClick={() => handleTierSelect(tier)}
                            >
                              {t.changePlan}
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                          )}
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'upgrade' ? t.confirmUpgrade : t.confirmDowngrade}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'upgrade' ? t.upgradeDesc : t.downgradeDesc}
              {selectedTier && (
                <div className="mt-4 p-4 bg-accent/10 rounded-lg border border-accent/20">
                  <div className="font-semibold text-ink">
                    {currentLanguage === 'ar' 
                      ? `${tierDetails[currentTier].nameAr} → ${tierDetails[selectedTier].nameAr}`
                      : `${tierDetails[currentTier].name} → ${tierDetails[selectedTier].name}`}
                  </div>
                  <div className="text-lg font-bold text-accent mt-2">
                    {formatPrice(selectedTier)}
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>
              {t.cancelAction}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              disabled={processing}
            >
              {processing ? t.processing : t.proceed}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}