import { DollarSign, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { getRequestPriceDisplay, parseRequestPrice } from '@/lib/requestPresentation';

interface RequestPriceCardProps {
  currentLanguage: 'en' | 'ar';
  sellerPricing?: unknown;
  finalAmount?: number | null;
  compact?: boolean;
  className?: string;
}

export const RequestPriceCard = ({
  currentLanguage,
  sellerPricing,
  finalAmount,
  compact = false,
  className,
}: RequestPriceCardProps) => {
  const { formatAmount } = useCurrency();
  const display = getRequestPriceDisplay(
    parseRequestPrice(sellerPricing, finalAmount),
    { currentLanguage, formatAmount },
  );

  if (!display) {
    return null;
  }

  const emphasisStyles = {
    brand: 'border-primary/15 bg-primary/8 text-primary',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
  } as const;

  return (
    <div
      className={cn(
        'rounded-[24px] border p-4 shadow-[0_12px_28px_rgba(0,0,0,0.04)]',
        emphasisStyles[display.emphasis],
        className,
      )}
      dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/70 shadow-sm">
          <DollarSign className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn('text-[11px] font-semibold uppercase tracking-[0.18em] opacity-75', currentLanguage === 'ar' ? 'font-ar-body' : 'font-body')}>
            {display.eyebrow}
          </p>
          <h4 className={cn(compact ? 'mt-1 text-lg' : 'mt-1.5 text-2xl', 'font-semibold tracking-tight', currentLanguage === 'ar' ? 'font-ar-display' : 'font-display')}>
            {display.title}
          </h4>
          <div className="mt-2 flex items-start gap-2 text-sm opacity-80">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p className={cn('leading-6', currentLanguage === 'ar' ? 'font-ar-body' : 'font-body')}>
              {display.detail}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
