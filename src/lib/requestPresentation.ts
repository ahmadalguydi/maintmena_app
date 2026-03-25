export type SupportedLanguage = 'en' | 'ar';

export interface ParsedRequestPrice {
  kind: 'none' | 'fixed' | 'range' | 'inspection' | 'final';
  fixedPrice?: number;
  minPrice?: number;
  maxPrice?: number;
  finalAmount?: number;
}

interface PriceDisplayOptions {
  currentLanguage: SupportedLanguage;
  formatAmount: (amount: number | null | undefined, fromCurrency?: 'SAR') => string;
}

export interface RequestPriceDisplay {
  eyebrow: string;
  title: string;
  detail: string;
  emphasis: 'brand' | 'success' | 'warning';
}

export interface RequestStatusUpdateDisplay {
  title: string;
  subtitle: string;
  accent: 'emerald' | 'amber' | 'blue' | 'purple' | 'orange' | 'slate';
}

export const parseRequestPrice = (
  sellerPricing: unknown,
  finalAmount?: number | null,
): ParsedRequestPrice => {
  if (typeof finalAmount === 'number' && Number.isFinite(finalAmount) && finalAmount > 0) {
    return { kind: 'final', finalAmount };
  }

  if (!sellerPricing) {
    return { kind: 'none' };
  }

  try {
    const parsed =
      typeof sellerPricing === 'string' ? JSON.parse(sellerPricing) : sellerPricing;

    if (parsed?.type === 'fixed' && Number.isFinite(parsed.fixedPrice)) {
      return { kind: 'fixed', fixedPrice: Number(parsed.fixedPrice) };
    }

    if (
      parsed?.type === 'range' &&
      Number.isFinite(parsed.minPrice) &&
      Number.isFinite(parsed.maxPrice)
    ) {
      return {
        kind: 'range',
        minPrice: Number(parsed.minPrice),
        maxPrice: Number(parsed.maxPrice),
      };
    }

    if (parsed?.type === 'inspection') {
      return { kind: 'inspection' };
    }
  } catch {
    return { kind: 'none' };
  }

  return { kind: 'none' };
};

export const getRequestPriceDisplay = (
  price: ParsedRequestPrice,
  { currentLanguage, formatAmount }: PriceDisplayOptions,
): RequestPriceDisplay | null => {
  const isArabic = currentLanguage === 'ar';

  switch (price.kind) {
    case 'final':
      return {
        eyebrow: isArabic ? 'السعر النهائي' : 'Final amount',
        title: formatAmount(price.finalAmount, 'SAR'),
        detail: isArabic
          ? 'هذا المبلغ النهائي اللي سجله الفني لإقفال الطلب.'
          : 'This is the amount the provider entered to close the job.',
        emphasis: 'success',
      };
    case 'fixed':
      return {
        eyebrow: isArabic ? 'السعر المتوقع' : 'Expected total',
        title: formatAmount(price.fixedPrice, 'SAR'),
        detail: isArabic
          ? 'هذا السعر المتوقع قبل البداية، وما يتغير إلا إذا تغيّر نطاق الشغل.'
          : 'A clear quote before work starts. It should only change if the scope changes.',
        emphasis: 'brand',
      };
    case 'range':
      return {
        eyebrow: isArabic ? 'النطاق المتوقع' : 'Expected range',
        title: `${formatAmount(price.minPrice, 'SAR')} - ${formatAmount(price.maxPrice, 'SAR')}`,
        detail: isArabic
          ? 'يعطيك تصور واضح عن السعر قبل ما يتحدد المبلغ النهائي.'
          : 'This gives you a realistic range before the final amount is confirmed.',
        emphasis: 'brand',
      };
    case 'inspection':
      return {
        eyebrow: isArabic ? 'التسعير بعد المعاينة' : 'Price after inspection',
        title: isArabic ? 'يُحدد بعد المعاينة' : 'Confirmed after inspection',
        detail: isArabic
          ? 'السعر يتحدد بعد ما يفحص الفني الحالة في الموقع.'
          : 'The provider will confirm the final amount after checking the issue onsite.',
        emphasis: 'warning',
      };
    default:
      return null;
  }
};

export const getRequestStatusUpdateDisplay = (
  status: string,
  currentLanguage: SupportedLanguage,
  providerName?: string,
): RequestStatusUpdateDisplay | null => {
  const name = providerName || (currentLanguage === 'ar' ? 'الفني' : 'your provider');

  switch (status) {
    case 'accepted':
      return currentLanguage === 'ar'
        ? {
            title: 'تم تعيين الفني',
            subtitle: `وافق ${name} على طلبك وتقدر تتابع التفاصيل الحين.`,
            accent: 'emerald',
          }
        : {
            title: 'Provider found',
            subtitle: `${name} accepted your request and is ready to proceed.`,
            accent: 'emerald',
          };
    case 'on_the_way':
    case 'en_route':
      return currentLanguage === 'ar'
        ? {
            title: 'الفني بالطريق',
            subtitle: `${name} في طريقه لموقعك وتقدر تتابع وصوله.`,
            accent: 'amber',
          }
        : {
            title: 'Provider on the way',
            subtitle: `${name} is heading to your location now.`,
            accent: 'amber',
          };
    case 'arrived':
      return currentLanguage === 'ar'
        ? {
            title: 'الفني وصل',
            subtitle: `${name} وصل للموقع، وإذا احتجت شيء تقدر تكلمه مباشرة.`,
            accent: 'blue',
          }
        : {
            title: 'Provider arrived',
            subtitle: `${name} has reached your location.`,
            accent: 'blue',
          };
    case 'in_progress':
      return currentLanguage === 'ar'
        ? {
            title: 'العمل شغال',
            subtitle: `${name} بدأ يشتغل على الخدمة.`,
            accent: 'purple',
          }
        : {
            title: 'Work has started',
            subtitle: `${name} is actively working on the service.`,
            accent: 'purple',
          };
    case 'awaiting_approval':
      return currentLanguage === 'ar'
        ? {
            title: 'السعر النهائي جاهز',
            subtitle: 'راجع السعر ووافق عليه عشان نقفل الطلب.',
            accent: 'orange',
          }
        : {
            title: 'Final amount ready',
            subtitle: 'Review the final amount to approve and close the request.',
            accent: 'orange',
          };
    case 'completed':
    case 'confirmed':
      return currentLanguage === 'ar'
        ? {
            title: 'اكتمل الطلب',
            subtitle: 'تقفل الطلب بنجاح وتقدر تضيف تقييمك الحين.',
            accent: 'slate',
          }
        : {
            title: 'Request completed',
            subtitle: 'The job is closed successfully. You can leave a review now.',
            accent: 'slate',
          };
    default:
      return null;
  }
};
