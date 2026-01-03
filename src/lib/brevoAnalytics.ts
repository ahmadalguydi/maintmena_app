// Brevo analytics helper functions for email automation

declare global {
  interface Window {
    Brevo?: any[];
  }
}

// Helper to safely push to Brevo
const brevoTrack = (command: string, ...args: any[]) => {
  if (typeof window !== 'undefined' && window.Brevo) {
    window.Brevo.push([command, ...args]);
  }
};

// Identify user for email automation
export const identifyUser = (email: string, attributes?: {
  firstName?: string;
  lastName?: string;
  userType?: 'buyer' | 'seller' | 'admin';
  companyName?: string;
  subscriptionTier?: string;
  language?: 'en' | 'ar';
  [key: string]: any;
}) => {
  brevoTrack('identify', email, attributes);
};

// Track page view
export const trackPageView = () => {
  brevoTrack('track_page');
};

// Track custom events
export const trackBrevoEvent = (eventName: string, properties?: Record<string, any>) => {
  brevoTrack('track_event', eventName, properties);
};

// User lifecycle events
export const trackSignup = (email: string, userType: 'buyer' | 'seller', language: 'en' | 'ar') => {
  identifyUser(email, {
    userType,
    language,
    signupDate: new Date().toISOString()
  });
  trackBrevoEvent('user_signup', {
    user_type: userType,
    language,
    signup_source: 'web_app'
  });
};

export const trackLogin = (email: string) => {
  trackBrevoEvent('user_login', {
    login_date: new Date().toISOString()
  });
};

// Marketplace events
export const trackJobPosted = (email: string, jobData: {
  serviceCategory: string;
  requestType: 'home' | 'project';
  budget?: string;
  location?: string;
  language: 'en' | 'ar';
}) => {
  trackBrevoEvent('job_posted', {
    service_category: jobData.serviceCategory,
    request_type: jobData.requestType,
    has_budget: !!jobData.budget,
    location: jobData.location,
    language: jobData.language
  });
};

export const trackQuoteSubmitted = (email: string, quoteData: {
  requestId: string;
  amount: number;
  currency: string;
}) => {
  trackBrevoEvent('quote_submitted', {
    request_id: quoteData.requestId,
    quote_amount: quoteData.amount,
    currency: quoteData.currency
  });
};

export const trackQuoteAccepted = (email: string, quoteData: {
  quoteId: string;
  sellerId: string;
  amount: number;
}) => {
  trackBrevoEvent('quote_accepted', {
    quote_id: quoteData.quoteId,
    seller_id: quoteData.sellerId,
    contract_value: quoteData.amount
  });
};

// Contract events
export const trackContractSigned = (email: string, contractData: {
  contractId: string;
  role: 'buyer' | 'seller';
  value?: number;
}) => {
  trackBrevoEvent('contract_signed', {
    contract_id: contractData.contractId,
    user_role: contractData.role,
    contract_value: contractData.value
  });
};

export const trackContractCompleted = (email: string, contractId: string) => {
  trackBrevoEvent('contract_completed', {
    contract_id: contractId
  });
};

// Subscription events
export const trackTrialStarted = (email: string, planType: 'buyer' | 'seller') => {
  trackBrevoEvent('trial_started', {
    plan_type: planType,
    trial_start_date: new Date().toISOString()
  });
};

export const trackSubscriptionUpgraded = (email: string, subscriptionData: {
  fromTier: string;
  toTier: string;
  planType: 'buyer' | 'seller';
}) => {
  trackBrevoEvent('subscription_upgraded', {
    from_tier: subscriptionData.fromTier,
    to_tier: subscriptionData.toTier,
    plan_type: subscriptionData.planType
  });
};

// Engagement events
export const trackMessageSent = (email: string, messageData: {
  conversationId: string;
  recipientType: 'buyer' | 'seller';
}) => {
  trackBrevoEvent('message_sent', {
    conversation_id: messageData.conversationId,
    recipient_type: messageData.recipientType
  });
};

export const trackContentViewed = (email: string, contentData: {
  contentType: 'brief' | 'report' | 'guide' | 'blog';
  contentId: string;
  contentTitle: string;
}) => {
  trackBrevoEvent('content_viewed', {
    content_type: contentData.contentType,
    content_id: contentData.contentId,
    content_title: contentData.contentTitle
  });
};
