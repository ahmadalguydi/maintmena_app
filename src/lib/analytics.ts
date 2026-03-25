// GA4 event tracking helper functions for MaintMENA

export const trackEvent = (eventName: string, params?: Record<string, any>) => {
  if (typeof window !== 'undefined' && (window as any).dataLayer) {
    (window as any).dataLayer.push({
      event: eventName,
      ...params,
      timestamp: Date.now()
    });
  }
};

// Hero variant tracking
export const trackHeroVariant = (variant: string) => {
  trackEvent('hero_variant_impression', {
    variant_id: variant,
    experiment_name: 'hero_headline_test'
  });
};

// CTA tracking
export const trackCTAClick = (location: string, type: string, variant?: string) => {
  trackEvent('cta_click', {
    cta_location: location,
    cta_type: type,
    hero_variant: variant
  });
};

// Scroll depth tracking
export const trackScrollDepth = (depth: number, section: string) => {
  trackEvent('scroll_depth', {
    scroll_percentage: depth,
    section_name: section
  });
};

// Plan selection tracking
export const trackPlanSelection = (planName: string, planType: 'buyer' | 'seller', price: number) => {
  trackEvent('plan_selected', {
    plan_name: planName,
    plan_type: planType,
    plan_price: price,
    currency: 'SAR'
  });
};

// Language switch tracking
export const trackLanguageSwitch = (fromLang: string, toLang: string) => {
  trackEvent('language_switch', {
    from_language: fromLang,
    to_language: toLang
  });
};

// Tab switch tracking
export const trackTabSwitch = (section: string, tabName: string) => {
  trackEvent('tab_switch', {
    section_name: section,
    tab_name: tabName
  });
};

// Category click tracking
export const trackCategoryClick = (category: string, audience: 'home' | 'project') => {
  trackEvent('category_click', {
    category_name: category,
    audience_type: audience
  });
};

// FAQ interaction tracking
export const trackFAQOpen = (questionId: string, question: string) => {
  trackEvent('faq_open', {
    question_id: questionId,
    question_text: question
  });
};

// Section view tracking
export const trackSectionView = (sectionName: string) => {
  trackEvent('section_view', {
    section_name: sectionName
  });
};
