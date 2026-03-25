import { AlertTriangle, Shield, Ban, X, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface CashSafetyBannerProps {
  variant?: 'warning' | 'info' | 'compact' | 'seller';
  currentLanguage: 'en' | 'ar';
  className?: string;
  onDismiss?: () => void;
}

export function CashSafetyBanner({ 
  variant = 'warning',
  currentLanguage,
  className,
  onDismiss
}: CashSafetyBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const isRtl = currentLanguage === 'ar';
  
  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  if (dismissed) return null;
  
  const content = {
    en: {
      warning: {
        title: 'Cash Payment Safety',
        messages: [
          'Do not pay upfront. Pay only after work is completed.',
          'Never send money via bank transfer before work starts.',
          'Report any seller asking for advance payment.'
        ]
      },
      info: {
        title: 'Payment Protected',
        message: 'Your work is protected by a digital contract. Pay in cash only after the job is done to your satisfaction.'
      },
      compact: {
        message: '⚠️ Pay cash only AFTER work is completed'
      },
      seller: {
        title: 'Build Your Reputation',
        message: 'Mark jobs complete to earn reviews & unlock Elite status!'
      }
    },
    ar: {
      warning: {
        title: 'أمان الدفع النقدي',
        messages: [
          'لا تدفع مقدماً. ادفع فقط بعد إتمام العمل.',
          'لا ترسل أموالاً عبر التحويل البنكي قبل بدء العمل.',
          'أبلغ عن أي بائع يطلب دفعة مقدمة.'
        ]
      },
      info: {
        title: 'دفعتك محمية',
        message: 'عملك محمي بعقد رقمي. ادفع نقداً فقط بعد إتمام العمل بما يرضيك.'
      },
      compact: {
        message: '⚠️ ادفع نقداً فقط بعد إتمام العمل'
      },
      seller: {
        title: 'ابنِ سمعتك',
        message: 'أكمل الأعمال لتحصل على تقييمات وتفتح شارة النخبة!'
      }
    }
  };
  
  const t = content[currentLanguage];
  
  if (variant === 'seller') {
    return (
      <div className={cn(
        'p-3 rounded-xl relative',
        'bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20',
        'border border-emerald-200 dark:border-emerald-800',
        className
      )} dir={isRtl ? 'rtl' : 'ltr'}>
        <button
          onClick={handleDismiss}
          className={cn(
            "absolute top-2 p-1 rounded-full hover:bg-emerald-200/50 transition-colors",
            isRtl ? "left-2" : "right-2"
          )}
        >
          <X className="w-4 h-4 text-emerald-600" />
        </button>
        <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''} ${isRtl ? 'pl-6' : 'pr-6'}`}>
          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-800/30 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className={`flex-1 ${isRtl ? 'text-right' : ''}`}>
            <p className="font-semibold text-sm text-emerald-800 dark:text-emerald-300">
              {t.seller.title}
            </p>
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              {t.seller.message}
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  if (variant === 'compact') {
    return (
      <div className={cn(
        'py-2 px-4 rounded-lg',
        'bg-amber-50 dark:bg-amber-900/20',
        'border border-amber-200 dark:border-amber-800',
        'text-center',
        className
      )} dir={isRtl ? 'rtl' : 'ltr'}>
        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
          {t.compact.message}
        </p>
      </div>
    );
  }
  
  if (variant === 'info') {
    return (
      <div className={cn(
        'p-4 rounded-xl',
        'bg-blue-50 dark:bg-blue-900/20',
        'border border-blue-200 dark:border-blue-800',
        className
      )} dir={isRtl ? 'rtl' : 'ltr'}>
        <div className={`flex items-start gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-800/30 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className={`flex-1 ${isRtl ? 'text-right' : ''}`}>
            <p className="font-semibold text-blue-800 dark:text-blue-300 mb-1">
              {t.info.title}
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              {t.info.message}
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Warning variant (default) - with dismissable X button and RTL-aware layout
  return (
    <div className={cn(
      'p-4 rounded-xl relative',
      'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20',
      'border-2 border-amber-300 dark:border-amber-700',
      className
    )} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className={cn(
          "absolute top-2 p-1 rounded-full hover:bg-amber-200/50 transition-colors",
          isRtl ? "left-2" : "right-2"
        )}
      >
        <X className="w-4 h-4 text-amber-600" />
      </button>
      
      <div className={`flex items-start gap-3 ${isRtl ? 'flex-row-reverse' : ''} ${isRtl ? 'pl-6' : 'pr-6'}`}>
        <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-800/30 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
        </div>
        <div className={`flex-1 ${isRtl ? 'text-right' : 'text-left'}`}>
          <p className={cn(
            "font-bold text-amber-800 dark:text-amber-300 mb-2",
            isRtl && "font-ar-display"
          )}>
            {t.warning.title}
          </p>
          <ul className="space-y-2">
            {t.warning.messages.map((msg, i) => (
              <li key={i} className={`flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <Ban className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className={isRtl ? 'font-ar-body text-right' : ''}>{msg}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}