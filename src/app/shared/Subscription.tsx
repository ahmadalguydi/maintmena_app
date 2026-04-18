import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSoftOpening } from '@/hooks/useSoftOpening';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Crown, Calendar, Zap, Check, Sparkles, Gift } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface SubscriptionProps {
  currentLanguage: 'en' | 'ar';
}

export const Subscription = ({ currentLanguage }: SubscriptionProps) => {
  const { user, userType } = useAuth();
  const { isSoftOpening } = useSoftOpening();
  const navigate = useNavigate();
  const isArabic = currentLanguage === 'ar';

  // Server-controlled: sellers get professional tier during soft opening
  const isAlphaSeller = isSoftOpening && userType === 'seller';

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const isOnTrial = subscription?.trial_ends_at && 
    new Date(subscription.trial_ends_at) > new Date();

  const tierFeatures = {
    free: {
      en: ['Basic marketplace access', 'Limited requests', 'Standard support'],
      ar: ['الوصول الأساسي للسوق', 'طلبات محدودة', 'دعم قياسي']
    },
    comfort: {
      en: ['Unlimited requests', 'Priority quotes', 'Advanced analytics', '24/7 support'],
      ar: ['طلبات غير محدودة', 'عروض أسعار أولوية', 'تحليلات متقدمة', 'دعم على مدار الساعة']
    },
    professional: {
      en: ['All marketplace jobs', 'Unlimited quotes', 'Premium profile', 'Analytics dashboard', 'Contract generation', 'Priority support'],
      ar: ['جميع وظائف السوق', 'عروض أسعار غير محدودة', 'ملف تعريف مميز', 'لوحة تحليلات', 'إنشاء عقود', 'دعم أولوية']
    },
    starter: {
      en: ['Limited jobs', 'Basic quotes', 'Standard profile'],
      ar: ['وظائف محدودة', 'عروض أسعار أساسية', 'ملف تعريف قياسي']
    }
  };

  const content = {
    en: {
      title: 'Subscription',
      currentPlan: 'Current Plan',
      trialEnds: 'Trial ends',
      planExpires: 'Plan expires',
      features: 'Features included',
      upgrade: 'Upgrade Plan',
      manage: 'Manage Billing',
      onTrial: 'On Trial',
      active: 'Active',
      alphaMember: 'Soft Opening Member',
      alphaBenefits: 'Exclusive Benefits',
      zeroPlatformFees: '0% Fees',
      zeroPlatformFeesDesc: 'Keep 100% of your earnings during soft opening',
      freeForAlpha: 'FREE during Soft Opening',
      normalPrice: 'Normally SAR 199/mo',
      alphaEnds: 'Exclusive benefits until beta launch'
    },
    ar: {
      title: 'الاشتراك',
      currentPlan: 'الخطة الحالية',
      trialEnds: 'تنتهي التجربة',
      planExpires: 'تنتهي الخطة',
      features: 'الميزات المضمنة',
      upgrade: 'ترقية الخطة',
      manage: 'إدارة الفوترة',
      onTrial: 'نسخة تجريبية',
      active: 'نشط',
      alphaMember: 'عضو الإفتتاح التجريبي',
      alphaBenefits: 'مزايا حصرية',
      zeroPlatformFees: '٠٪ عمولة',
      zeroPlatformFeesDesc: 'كل اللي تكسبه لك خلال الإفتتاح التجريبي',
      freeForAlpha: 'مجاناً خلال الإفتتاح التجريبي',
      normalPrice: 'عادةً ١٩٩ ريال/شهر',
      alphaEnds: 'مزايا حصرية حتى إطلاق البيتا'
    }
  };

  const t = content[currentLanguage];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-24" dir={isArabic ? 'rtl' : 'ltr'}>
        <GradientHeader title={t.title} onBack={() => navigate(-1)} />
        <div className="px-6 py-6 space-y-4">
          <Skeleton className="h-48 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
        </div>
      </div>
    );
  }

  // For alpha sellers, always show professional tier
  const displayTier = isAlphaSeller && userType === 'seller' ? 'professional' : (subscription?.tier || 'free');
  const features = tierFeatures[displayTier as keyof typeof tierFeatures]?.[currentLanguage] || [];

  return (
    <div className="min-h-screen bg-background pb-24" dir={isArabic ? 'rtl' : 'ltr'}>
      <GradientHeader title={t.title} onBack={() => navigate(-1)} />

      <div className="px-6 py-6 space-y-6">
        {/* Alpha Member Banner for Sellers */}
        {isAlphaSeller && userType === 'seller' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-4 text-white"
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={20} />
              <span className="font-bold">{t.alphaMember}</span>
              <Sparkles size={20} />
            </div>
            <p className="text-sm text-white/90">{t.alphaEnds}</p>
          </motion.div>
        )}

        {/* Zero Platform Fees Banner for Alpha Sellers */}
        {isAlphaSeller && userType === 'seller' && (
          <SoftCard className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <Gift className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className={`font-bold text-green-700 dark:text-green-400 ${isArabic ? 'font-ar-display' : ''}`}>
                  {t.zeroPlatformFees}
                </p>
                <p className="text-sm text-green-600 dark:text-green-500">
                  {t.zeroPlatformFeesDesc}
                </p>
              </div>
            </div>
          </SoftCard>
        )}

        {/* Current Plan Card */}
        <SoftCard>
          <div className="text-center space-y-4 py-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto">
              <Crown className="w-10 h-10 text-white" />
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground mb-2">{t.currentPlan}</p>
              <h2 className={`text-3xl font-bold capitalize ${isArabic ? 'font-ar-display' : ''}`}>
                {isArabic && displayTier === 'professional' ? 'المحترف' : displayTier}
              </h2>
              {isAlphaSeller && userType === 'seller' && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="text-sm text-muted-foreground line-through">{t.normalPrice}</span>
                  <span className="text-sm font-bold text-green-600">{t.freeForAlpha}</span>
                </div>
              )}
            </div>

            {isOnTrial && !isAlphaSeller && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20">
                <Zap size={16} className="text-accent" />
                <span className="text-sm font-medium text-accent">{t.onTrial}</span>
              </div>
            )}

            {isAlphaSeller && userType === 'seller' && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20">
                <Sparkles size={16} className="text-amber-500" />
                <span className="text-sm font-medium text-amber-600">{t.alphaMember}</span>
              </div>
            )}

            {/* Expiration Info */}
            {subscription?.trial_ends_at && isOnTrial && !isAlphaSeller && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Calendar size={16} />
                <span>
                  {t.trialEnds}: {format(new Date(subscription.trial_ends_at), 'MMM dd, yyyy')}
                </span>
              </div>
            )}

            {subscription?.subscription_ends_at && !isOnTrial && !isAlphaSeller && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Calendar size={16} />
                <span>
                  {t.planExpires}: {format(new Date(subscription.subscription_ends_at), 'MMM dd, yyyy')}
                </span>
              </div>
            )}
          </div>
        </SoftCard>

        {/* Features Card */}
        <SoftCard>
          <div className="space-y-4">
            <h3 className={`text-lg font-semibold ${isArabic ? 'font-ar-display' : ''}`}>
              {isAlphaSeller && userType === 'seller' ? t.alphaBenefits : t.features}
            </h3>
            <div className="space-y-3">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check size={14} className="text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">{feature}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </SoftCard>

        {/* Action Buttons - Coming Soon */}
        <div className="space-y-3">
          <Button
            variant="outline"
            size="lg"
            className="w-full rounded-full h-14"
            disabled
          >
            🔒 {t.manage} - {currentLanguage === ‘ar’ ? ‘قريباً’ : ‘Coming Soon’}
          </Button>
          <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200 dark:border-amber-900">
            <p className="text-xs text-center text-amber-900 dark:text-amber-100">
              {currentLanguage === ‘ar’
                ? ‘💳 نظام الفواتير والترقية قريباً’
                : ‘💳 Billing and upgrade system coming soon’}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

