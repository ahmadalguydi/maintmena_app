import React, { useState, useEffect, useCallback } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RealtimeHub } from "@/components/RealtimeHub";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence } from 'framer-motion';
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { trackPageView } from '@/lib/brevoAnalytics';
import { getLanguage, setLanguage } from '@/lib/preferences';
import { AuthProvider } from "./hooks/useAuth";
import { useDeepLinks } from "./hooks/useDeepLinks";
import { useNativeSystemBars } from '@/hooks/useNativeSystemBars';
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

import { Capacitor } from '@capacitor/core';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => shouldRetryReactQuery(failureCount, error, 2),
      retryDelay: getSupabaseRetryDelay,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      staleTime: 30_000,   // 30s default — data considered stale quickly
      gcTime: 5 * 60_000,  // 5 min garbage collection
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

  const shouldHideHeader = location.pathname.startsWith('/app/messages/thread') || location.pathname.includes('/messages/thread');

  return (
    <>
      <AnimatePresence>
        {!shouldHideHeader && <AppHeader currentLanguage={currentLanguage} />}
      </AnimatePresence>
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
 * ScrollToTop - Scrolls to top on route change.
 * Also initialises the deep link listener (needs router context).
 */
function ScrollToTop() {
  const location = useLocation();
  useDeepLinks();

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
function NativeRedirect() {
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        if (Capacitor.isNativePlatform() && location.pathname === '/') {
            navigate('/app', { replace: true });
        }
    }, [location.pathname, navigate]);

    return null;
}

function NativeSystemBarsSync() {
  useNativeSystemBars();
  return null;
}
/**
 * AnimatedRoutesWrapper - Provides page transition animations
 */
function AnimatedRoutesWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-0 flex-1">
      {children}
    </div>
  );
}

/**
 * Main App Component
 * Provides all context providers and renders routes
 */
const App = () => {
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'ar'>(() => getLanguage());

  const handleLanguageToggle = useCallback((lang: 'en' | 'ar') => {
    setCurrentLanguage(lang);
    setLanguage(lang);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const { lang } = (e as CustomEvent<{ lang: 'en' | 'ar' }>).detail;
      handleLanguageToggle(lang);
    };
    window.addEventListener('mm:language-change', handler);
    return () => window.removeEventListener('mm:language-change', handler);
  }, [handleLanguageToggle]);

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
                    <NativeRedirect />
                    <NativeSystemBarsSync />
                    <RealtimeHub />
                    <RoutePrefetcher />
                    <OfflineMode />
                    <div className="min-h-full flex flex-col bg-paper">
                      <Chrome
                        currentLanguage={currentLanguage}
                        onToggle={() => handleLanguageToggle(currentLanguage === 'en' ? 'ar' : 'en')}
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
