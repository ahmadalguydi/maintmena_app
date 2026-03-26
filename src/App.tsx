import React, { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RealtimeHub } from "@/components/RealtimeHub";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from 'framer-motion';
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { trackPageView } from '@/lib/brevoAnalytics';
import { AuthProvider } from "./hooks/useAuth";
import { CurrencyProvider } from "./hooks/useCurrency";
import { RoleProvider } from "./contexts/RoleContext";
import { CelebrationProvider } from "./contexts/CelebrationContext";
import { getSupabaseRetryDelay, shouldRetryReactQuery } from '@/lib/supabaseQuery';
import StickyTopBar from './components/StickyTopBar';
import TrialCountdownBanner from './components/TrialCountdownBanner';
import { FloatingNav } from "./components/mobile/FloatingNav";
import { AppHeader } from "./components/mobile/AppHeader";
import { AuthTriggerModal } from './components/mobile/AuthTriggerModal';
import { OfflineMode } from "./app/shared/OfflineMode";
import { NetworkStatus } from "./components/mobile/NetworkStatus";
import { RoutePrefetcher } from './components/RoutePrefetcher';

// Route modules
import {
  publicRoutes,
  buyerRoutes,
  sellerRoutes,
  adminRoutes,
  onboardingRoutes,
  sharedRoutes,
  webAppRoutes,
} from './routes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => shouldRetryReactQuery(failureCount, error, 2),
      retryDelay: getSupabaseRetryDelay,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
});

/**
 * Chrome component - Shows sticky header on website pages (not app)
 */
function Chrome({ currentLanguage, onToggle }: { currentLanguage: 'en' | 'ar'; onToggle: () => void }) {
  const location = useLocation();
  if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/app')) return null;
  return (
    <>
      <StickyTopBar
        currentLanguage={currentLanguage}
        onLanguageToggle={onToggle}
      />
      <TrialCountdownBanner currentLanguage={currentLanguage} />
    </>
  );
}

/**
 * AppChrome component - Shows mobile app header and navigation
 */
function AppChrome({ currentLanguage }: { currentLanguage: 'en' | 'ar' }) {
  const location = useLocation();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authReturnPath, setAuthReturnPath] = useState<string | undefined>();

  // Only show app chrome on /app routes
  const isAppRoute = location.pathname.startsWith('/app');
  if (!isAppRoute) return null;

  // Don't show on onboarding or permission pages
  const hideNavPaths = [
    '/app/onboarding',
    '/app/permissions',
    '/app/signup-success',
    '/app/offline',
  ];
  const shouldHideNav =
    location.pathname === '/app' ||
    hideNavPaths.some(path => location.pathname.startsWith(path));

  if (shouldHideNav) return null;

  const handleAuthRequired = (action: { returnPath?: string }) => {
    setAuthReturnPath(action.returnPath);
    setShowAuthModal(true);
  };

  return (
    <>
      <AppHeader currentLanguage={currentLanguage} />
      <FloatingNav
        currentLanguage={currentLanguage}
        onAuthRequired={handleAuthRequired}
      />
      <AuthTriggerModal
        open={showAuthModal}
        onOpenChange={(open) => setShowAuthModal(open)}
        pendingAction={authReturnPath ? { type: 'navigation', returnPath: authReturnPath } : undefined}
        currentLanguage={currentLanguage}
      />
    </>
  );
}

/**
 * ScrollToTop - Scrolls to top on route change
 */
function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  return null;
}

/**
 * PageViewTracker - Tracks page views for analytics
 */
function PageViewTracker() {
  const location = useLocation();

  useEffect(() => {
    trackPageView();
  }, [location.pathname]);

  return null;
}

/**
 * AnimatedRoutesWrapper - Provides page transition animations
 */
function AnimatedRoutesWrapper({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.15 }}
        className="flex-1"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Main App Component
 * Provides all context providers and renders routes
 */
const App = () => {
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'ar'>(() => {
    const saved = localStorage.getItem('language');
    return (saved === 'en' || saved === 'ar') ? saved : 'ar';
  });

  useEffect(() => {
    localStorage.setItem('language', currentLanguage);
  }, [currentLanguage]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <CurrencyProvider>
                <RoleProvider>
                  <CelebrationProvider currentLanguage={currentLanguage}>
                    <PageViewTracker />
                    <ScrollToTop />
                    <RealtimeHub />
                    <RoutePrefetcher />
                    <OfflineMode />
                    <div className="min-h-screen flex flex-col bg-paper">
                      <Chrome
                        currentLanguage={currentLanguage}
                        onToggle={() => setCurrentLanguage(currentLanguage === 'en' ? 'ar' : 'en')}
                      />
                      <AppChrome currentLanguage={currentLanguage} />
                      <AnimatedRoutesWrapper>
                        <Routes>
                          {/* Public Website Routes */}
                          {publicRoutes({ currentLanguage })}

                          {/* Protected Web App Routes */}
                          {webAppRoutes({ currentLanguage })}

                          {/* Admin Routes */}
                          {adminRoutes({ currentLanguage })}

                          {/* Mobile App Onboarding Routes */}
                          {onboardingRoutes({ currentLanguage, setCurrentLanguage })}

                          {/* Mobile App Buyer Routes */}
                          {buyerRoutes({ currentLanguage })}

                          {/* Mobile App Seller Routes */}
                          {sellerRoutes({ currentLanguage })}

                          {/* Mobile App Shared Routes */}
                          {sharedRoutes({ currentLanguage, setCurrentLanguage })}
                        </Routes>
                      </AnimatedRoutesWrapper>
                    </div>
                  </CelebrationProvider>
                </RoleProvider>
              </CurrencyProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
