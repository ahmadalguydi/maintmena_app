// Centralized pricing configuration
// All prices are in SAR (Saudi Riyal) as default currency

export const PRICING_CONFIG = {
  // Buyer plans (in SAR)
  free: {
    name: 'Basic',
    nameAr: 'الأساسي',
    monthly: 0,
    annual: 0,
    currency: 'SAR'
  },
  comfort: {
    name: 'Comfort',
    nameAr: 'الراحة',
    monthly: 29,
    annual: 278, // 20% off (29 * 12 * 0.8)
    currency: 'SAR'
  },
  priority: {
    name: 'Priority',
    nameAr: 'الأولوية',
    monthly: 119,
    annual: 1142, // 20% off (119 * 12 * 0.8)
    currency: 'SAR'
  },
  // Seller plans (in SAR)
  starter: {
    name: 'Starter',
    nameAr: 'البداية',
    monthly: 0,
    annual: 0,
    currency: 'SAR'
  },
  professional: {
    name: 'Professional',
    nameAr: 'المحترف',
    monthly: 39,
    annual: 374, // 20% off (39 * 12 * 0.8)
    currency: 'SAR'
  },
  elite: {
    name: 'Elite',
    nameAr: 'النخبة',
    monthly: 199,
    annual: 1910, // 20% off (199 * 12 * 0.8)
    currency: 'SAR'
  },
  // Content subscription plans (in SAR)
  basic: {
    name: 'Basic',
    nameAr: 'الأساسية',
    monthly: 29,
    annual: 278, // 20% off
    currency: 'SAR'
  },
  enterprise: {
    name: 'Enterprise',
    nameAr: 'المؤسسة',
    monthly: 99,
    annual: 950, // 20% off
    currency: 'SAR'
  }
};

export type PricingTier = keyof typeof PRICING_CONFIG;
