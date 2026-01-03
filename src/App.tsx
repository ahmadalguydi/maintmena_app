import React, { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from 'framer-motion';
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { trackPageView } from '@/lib/brevoAnalytics';
import { AuthProvider } from "./hooks/useAuth";
import { CurrencyProvider } from "./hooks/useCurrency";
import Index from "./pages/Index";
import About from "./pages/About";
import PremiumArchive from "./pages/PremiumArchive";
import Contact from "./pages/Contact";
import PricingPage from "./pages/PricingPage";
import Services from "./pages/Services";
import Resources from "./pages/Resources";
import EducationalContent from "./pages/EducationalContent";
import TemplatesGuides from "./pages/TemplatesGuides";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Support from "./pages/Support";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";
import Signup from "./pages/Signup";
import SignupChoice from "./pages/SignupChoice";
import { RoleProvider } from "./contexts/RoleContext";
import { CelebrationProvider } from "./contexts/CelebrationContext";
import { FloatingNav } from "./components/mobile/FloatingNav";
import { AppHeader } from "./components/mobile/AppHeader";
import { SplashScreen } from "./app/shared/SplashScreen";
import { OnboardingSlides } from "./app/shared/OnboardingSlides";
import { LanguageWelcome } from "./app/onboarding/LanguageWelcome";
import { RoleSelection } from "./app/onboarding/RoleSelection";
import { Login as MobileLogin } from "./app/onboarding/Login";
import { Signup as MobileSignup } from "./app/onboarding/Signup";
import { OTPVerification } from "./app/shared/OTPVerification";
import { ForgotPassword } from "./app/shared/ForgotPassword";
import { ResetPassword } from "./app/shared/ResetPassword";
import { SignupSuccess } from "./app/shared/SignupSuccess";
import { PermissionCamera } from "./app/shared/PermissionCamera";
import { PermissionLocation } from "./app/shared/PermissionLocation";
import { PermissionNotifications } from "./app/shared/PermissionNotifications";
import { AppNotFound } from "./app/shared/AppNotFound";
import { OfflineMode } from "./app/shared/OfflineMode";
import { BuyerHome } from "./app/buyer/home/BuyerHome";
import { BuyerExplore } from "./app/buyer/explore/BuyerExplore";
import { VendorProfile } from "./app/buyer/explore/VendorProfile";
import { BuyerJobDetail } from "./app/buyer/jobs/BuyerJobDetail";
import { SellerHome } from "./app/seller/home/SellerHome";
import { PostRequest } from "./app/buyer/requests/PostRequest";
import { RequestsList } from "./app/buyer/requests/RequestsList";
import { ContractSign } from "./app/buyer/bookings/ContractSign";
import { ReviewSuccess } from "./app/buyer/reviews/ReviewSuccess";
import { ReviewPage } from "./app/buyer/bookings/ReviewPage";
import { RequestDetail } from "./app/buyer/requests/RequestDetail";
import { QuotesComparison } from "./app/buyer/quotes/QuotesComparison";
import { QuoteDetail } from "./app/buyer/quotes/QuoteDetail";
import { BookingDetail } from "./app/buyer/bookings/BookingDetail";
import { BookService } from "./app/buyer/bookings/BookService";
import { BuyerProfile } from "./app/buyer/profile/BuyerProfile";
import { EditProfile as BuyerEditProfile } from "./app/buyer/profile/EditProfile";
import { SavedVendors } from "./app/buyer/profile/SavedVendors";
import { MyContracts } from "./app/buyer/profile/MyContracts";
import { ContractDetail as BuyerContractDetail } from "./app/buyer/profile/ContractDetail";
import { MyContracts as SellerMyContracts } from "./app/seller/profile/MyContracts";
import { ContractReview } from "./app/seller/contracts/ContractReview";
import { SellerContractDetail } from "./app/seller/profile/ContractDetail";
import { JobDetail as MobileJobDetail } from "./app/seller/marketplace/JobDetail";
import { Marketplace as MobileMarketplace } from "./app/seller/marketplace/Marketplace";
import { QuoteComposer } from "./app/seller/marketplace/QuoteComposer";
import { ActiveJobs } from './app/seller/jobs/ActiveJobs';
import { SellerJobDetail } from './app/seller/jobs/SellerJobDetail';
import { MyQuotes } from "./app/seller/quotes/MyQuotes";
import { MyQuoteDetail } from "./app/seller/quotes/MyQuoteDetail";
import { SellerBookingDetail } from "./app/seller/bookings/SellerBookingDetail";
import { SellerBookingsList } from "./app/seller/bookings/SellerBookingsList";
import { EditRequest } from "./app/buyer/requests/EditRequest";
import { EditQuote } from "./app/seller/quotes/EditQuote";
import { Help } from "./app/shared/Help";
import Notifications from "./app/shared/Notifications";
import { Subscription } from "./app/shared/Subscription";
import { Settings as MobileSettings } from "./app/shared/Settings";
import MessagesHub from "./app/shared/MessagesHub";
import { MessageThread } from "./app/shared/MessageThread";
import { SellerProfile as MobileSellerProfile } from "./app/seller/profile/SellerProfile";
import { EditProfile as SellerEditProfile } from "./app/seller/profile/EditProfile";
import { ManageServices } from "./app/seller/profile/ManageServices";
import { ServiceAreas } from "./app/seller/profile/ServiceAreas";
import { PortfolioGallery } from "./app/seller/profile/PortfolioGallery";
import { Certifications } from "./app/seller/profile/Certifications";
import { ReviewForm } from "./app/buyer/reviews/ReviewForm";
import { SellerReviews } from "./app/seller/reviews/SellerReviews";
import { History as BuyerHistory } from "./app/buyer/profile/History";
import { History as SellerHistory } from "./app/seller/profile/History";
import { SellerCalendar } from "./app/seller/calendar/SellerCalendar";
import { SignatureSettings } from "./app/shared/SignatureSettings";
import PlanSelection from "./components/PlanSelection";
import { AlphaSellerWelcome } from "./app/onboarding/AlphaSellerWelcome";
import SignupConfirmation from "./pages/SignupConfirmation";
import Login from "./pages/Login";
import Logout from "./pages/Logout";
import CalendarPage from "./pages/CalendarPage";
import { ContractDetail } from "./pages/ContractDetail";
import Contracts from "./pages/Contracts";
import BuyerDashboard from "./pages/BuyerDashboard";
import SellerDashboard from "./pages/SellerDashboard";
import Briefs from "./pages/Briefs";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import WebMarketplace from "./pages/Marketplace";
import Explore from "./pages/Explore";
import PostJob from "./pages/PostJob";
import WebJobDetail from "./pages/JobDetail";
import { BlogEditor } from "./components/admin/BlogEditor";
import SellerQuotes from "./pages/SellerQuotes";
import MyRequests from "./pages/MyRequests";
import ManageQuotes from "./pages/ManageQuotes";
import WebEditRequest from "./pages/EditRequest";
import SellerProfile from "./pages/SellerProfile";
import StickyTopBar from './components/StickyTopBar';
import TrialCountdownBanner from './components/TrialCountdownBanner';
import { ProtectedRoute } from './components/ProtectedRoute';

const queryClient = new QueryClient();

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

import { AuthTriggerModal } from './components/mobile/AuthTriggerModal';
import { useOnlineStatus } from './hooks/useOnlineStatus';

function AppChrome({ currentLanguage }: { currentLanguage: 'en' | 'ar' }) {
  const location = useLocation();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authAction, setAuthAction] = useState<{ returnPath?: string } | null>(null);

  const isAppRoute = location.pathname.startsWith('/app');
  const isOnboarding = location.pathname.includes('/onboarding');
  const isSplash = location.pathname === '/app';
  const isMessageThread = location.pathname.startsWith('/app/messages/thread');
  const isEditRequest = location.pathname.includes('/edit');
  const isSellerQuoteDetail = location.pathname.includes('/seller/quote/');
  const isRequestDetail = /^\/app\/buyer\/request\/[^/]+$/.test(location.pathname);
  const isBuyerQuoteDetail = /^\/app\/buyer\/quote\/[^/]+$/.test(location.pathname);
  const isHomeRoute = location.pathname === '/app/buyer/home' || location.pathname === '/app/seller/home';
  const isExplore = location.pathname === '/app/buyer/explore';
  const isRequests = location.pathname === '/app/buyer/requests';
  const isMarketplace = location.pathname === '/app/seller/marketplace';
  const isQuotes = location.pathname === '/app/seller/quotes';
  const isVendorProfile = location.pathname.startsWith('/app/buyer/vendor/');

  const showAppHeader = isHomeRoute || isExplore || isRequests || isMarketplace || isQuotes;

  const isContractAction = location.pathname.includes('/contract/') && (location.pathname.endsWith('/sign') || location.pathname.endsWith('/review'));
  const isBookService = location.pathname.startsWith('/app/buyer/book/');
  const isSellerBookingDetail = /^\/app\/seller\/booking\/[^/]+$/.test(location.pathname);
  const isBuyerBookingDetail = /^\/app\/buyer\/booking\/[^/]+$/.test(location.pathname);
  const isJobDetail = /^\/app\/seller\/marketplace\/[^/]+$/.test(location.pathname);

  const handleAuthRequired = (action: { returnPath?: string }) => {
    setAuthAction(action);
    setShowAuthModal(true);
  };

  const isBuyerJobDetail = /^\/app\/buyer\/job\/[^/]+$/.test(location.pathname);
  const isSellerJobDetail = /^\/app\/seller\/job\/[^/]+$/.test(location.pathname);

  const isOnline = useOnlineStatus();

  // Logic to hide chrome on specific pages (like auth, onboarding, etc)
  // We want to show it on the main app pages defined above
  if (!isOnline || !isAppRoute || isOnboarding || isSplash || isEditRequest || isSellerQuoteDetail || isRequestDetail || isBuyerQuoteDetail || isContractAction || isBookService || isSellerBookingDetail || isBuyerBookingDetail || isJobDetail || isBuyerJobDetail || isSellerJobDetail) {
    return null;
  }

  return (
    <>
      {showAppHeader && (
        <AppHeader
          currentLanguage={currentLanguage}
          onAuthRequired={() => handleAuthRequired({ returnPath: location.pathname })}
        />
      )}
      <FloatingNav currentLanguage={currentLanguage} onAuthRequired={handleAuthRequired} />
      <AuthTriggerModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        currentLanguage={currentLanguage}
        pendingAction={authAction ? { type: 'navigation', returnPath: authAction.returnPath } : undefined}
      />
    </>
  );
}

function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    // Scroll both window and the app scroll container
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // Also scroll the app's scrollable container
    const appContainer = document.getElementById('app-scroll-container');
    if (appContainer) {
      appContainer.scrollTop = 0;
    }
  }, [location.pathname]);

  return null;
}

function PageViewTracker() {
  const location = useLocation();

  useEffect(() => {
    trackPageView();
  }, [location.pathname]);

  return null;
}

function AnimatedRoutesWrapper({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isAppRoute = location.pathname.startsWith('/app');

  // Only animate /app routes for mobile feel
  if (!isAppRoute) {
    return <>{children}</>;
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        id="app-scroll-container"
        className="absolute inset-0 overflow-y-auto overflow-x-hidden bg-background"
      >
        {children}
      </div>
    </div>
  );
}

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
                    <OfflineMode />
                    <div className="min-h-screen flex flex-col bg-paper">
                      <Chrome
                        currentLanguage={currentLanguage}
                        onToggle={() => setCurrentLanguage(currentLanguage === 'en' ? 'ar' : 'en')}
                      />
                      <AppChrome currentLanguage={currentLanguage} />
                      <AnimatedRoutesWrapper>
                        <Routes>
                          <Route path="/" element={<Index currentLanguage={currentLanguage} />} />
                          <Route path="/about" element={<About currentLanguage={currentLanguage} />} />
                          <Route path="/premium-archive" element={
                            <ProtectedRoute allowedRoles={['seller', 'admin']}>
                              <PremiumArchive currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/contact" element={<Contact currentLanguage={currentLanguage} />} />
                          <Route path="/pricing" element={<PricingPage currentLanguage={currentLanguage} />} />
                          <Route path="/blog" element={<Blog currentLanguage={currentLanguage} />} />
                          <Route path="/blog/:slug" element={<BlogPost currentLanguage={currentLanguage} />} />
                          <Route path="/services" element={<Services currentLanguage={currentLanguage} />} />
                          <Route path="/resources" element={
                            <ProtectedRoute allowedRoles={['seller', 'admin']}>
                              <Resources currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/educational-content" element={
                            <ProtectedRoute allowedRoles={['seller', 'admin']}>
                              <EducationalContent currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/templates-guides" element={
                            <ProtectedRoute allowedRoles={['seller', 'admin']}>
                              <TemplatesGuides currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/support" element={<Support currentLanguage={currentLanguage} />} />
                          <Route path="/terms" element={<Terms currentLanguage={currentLanguage} />} />
                          <Route path="/privacy" element={<Privacy currentLanguage={currentLanguage} />} />
                          <Route path="/buyer-dashboard" element={
                            <ProtectedRoute allowedRoles={['buyer']}>
                              <BuyerDashboard currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/seller-dashboard" element={
                            <ProtectedRoute allowedRoles={['seller']}>
                              <SellerDashboard currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/calendar" element={<CalendarPage currentLanguage={currentLanguage} />} />
                          <Route path="/contracts" element={<ProtectedRoute><Contracts currentLanguage={currentLanguage} /></ProtectedRoute>} />
                          <Route path="/contracts/:id" element={<ProtectedRoute><ContractDetail currentLanguage={currentLanguage} /></ProtectedRoute>} />
                          <Route path="/settings" element={<Settings currentLanguage={currentLanguage} />} />
                          <Route path="/briefs" element={
                            <ProtectedRoute allowedRoles={['seller', 'admin']}>
                              <Briefs currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/admin" element={
                            <ProtectedRoute allowedRoles={['admin']}>
                              <Admin currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/admin/blog/new" element={
                            <ProtectedRoute allowedRoles={['admin']}>
                              <BlogEditor />
                            </ProtectedRoute>
                          } />
                          <Route path="/admin/blog/:id" element={
                            <ProtectedRoute allowedRoles={['admin']}>
                              <BlogEditor />
                            </ProtectedRoute>
                          } />
                          <Route path="/signup" element={<Signup currentLanguage={currentLanguage} />} />
                          <Route path="/signup-choice" element={<SignupChoice currentLanguage={currentLanguage} />} />
                          <Route path="/signup-confirmation" element={<SignupConfirmation currentLanguage={currentLanguage} />} />
                          <Route path="/login" element={<Login currentLanguage={currentLanguage} />} />
                          <Route path="/logout" element={<Logout currentLanguage={currentLanguage} />} />

                          {/* Mobile App Routes */}
                          <Route path="/app" element={<SplashScreen />} />
                          <Route path="/app/onboarding/role-selection" element={<RoleSelection currentLanguage={currentLanguage} onToggle={() => setCurrentLanguage(currentLanguage === 'en' ? 'ar' : 'en')} />} />
                          <Route path="/app/onboarding/slides" element={<OnboardingSlides />} />
                          <Route path="/app/onboarding/alpha-seller" element={<AlphaSellerWelcome currentLanguage={currentLanguage} onToggle={() => setCurrentLanguage(currentLanguage === 'en' ? 'ar' : 'en')} />} />
                          <Route path="/app/onboarding/buyer-plan-selection" element={<PlanSelection currentLanguage={currentLanguage} onSelectPlan={(plan, isAnnual) => { localStorage.setItem('selectedPlan', plan); localStorage.setItem('selectedBilling', isAnnual ? 'annual' : 'monthly'); }} userType="buyer" />} />
                          <Route path="/app/onboarding/seller-plan-selection" element={<PlanSelection currentLanguage={currentLanguage} onSelectPlan={(plan, isAnnual) => { localStorage.setItem('selectedPlan', plan); localStorage.setItem('selectedBilling', isAnnual ? 'annual' : 'monthly'); }} userType="seller" />} />
                          <Route path="/app/onboarding/login" element={<MobileLogin currentLanguage={currentLanguage} onToggle={() => setCurrentLanguage(currentLanguage === 'en' ? 'ar' : 'en')} />} />
                          <Route path="/app/onboarding/signup" element={<MobileSignup currentLanguage={currentLanguage} onToggle={() => setCurrentLanguage(currentLanguage === 'en' ? 'ar' : 'en')} />} />
                          <Route path="/app/onboarding/otp-verification" element={<OTPVerification />} />
                          <Route path="/app/onboarding/forgot-password" element={<ForgotPassword currentLanguage={currentLanguage} onToggle={() => setCurrentLanguage(currentLanguage === 'en' ? 'ar' : 'en')} />} />
                          <Route path="/app/onboarding/reset-password" element={<ResetPassword currentLanguage={currentLanguage} onToggle={() => setCurrentLanguage(currentLanguage === 'en' ? 'ar' : 'en')} />} />
                          <Route path="/app/signup-success" element={<SignupSuccess />} />

                          {/* Permissions Flow */}
                          <Route path="/app/permissions/camera" element={<PermissionCamera />} />
                          <Route path="/app/permissions/location" element={<PermissionLocation />} />
                          <Route path="/app/permissions/notifications" element={<PermissionNotifications />} />

                          {/* Buyer Routes */}
                          <Route path="/app/buyer/home" element={
                            <ProtectedRoute allowedRoles={['buyer']}>
                              <BuyerHome currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          {/* Guest-accessible routes for Lazy Registration */}
                          <Route path="/app/buyer/explore" element={
                            <BuyerExplore currentLanguage={currentLanguage} />
                          } />
                          <Route path="/app/buyer/vendor/:id" element={
                            <VendorProfile currentLanguage={currentLanguage} />
                          } />
                          <Route path="/app/buyer/book/:vendorId" element={
                            <BookService currentLanguage={currentLanguage} />
                          } />
                          <Route path="/app/buyer/requests" element={
                            <ProtectedRoute allowedRoles={['buyer']}>
                              <RequestsList currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/buyer/requests/new" element={
                            <PostRequest currentLanguage={currentLanguage} />
                          } />
                          <Route path="/app/buyer/request/:id" element={
                            <ProtectedRoute allowedRoles={['buyer']}>
                              <RequestDetail currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/buyer/request/:id/edit" element={
                            <ProtectedRoute allowedRoles={['buyer']}>
                              <EditRequest currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/buyer/quotes" element={
                            <ProtectedRoute allowedRoles={['buyer']}>
                              <QuotesComparison currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/buyer/quote/:id" element={
                            <ProtectedRoute allowedRoles={['buyer']}>
                              <QuoteDetail currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/buyer/booking/:id" element={
                            <ProtectedRoute allowedRoles={['buyer']}>
                              <BookingDetail currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/buyer/job/:id" element={
                            <ProtectedRoute allowedRoles={['buyer']}>
                              <BuyerJobDetail currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/buyer/bookings/:id/review" element={
                            <ProtectedRoute allowedRoles={['buyer']}>
                              <ReviewPage currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/buyer/contract/:id/sign" element={
                            <ProtectedRoute allowedRoles={['buyer']}>
                              <ContractSign currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/buyer/review/:bookingId" element={
                            <ProtectedRoute allowedRoles={['buyer']}>
                              <ReviewForm currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/buyer/reviews/success" element={
                            <ProtectedRoute allowedRoles={['buyer']}>
                              <ReviewSuccess currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/buyer/profile" element={
                            <ProtectedRoute allowedRoles={['buyer']}>
                              <BuyerProfile currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/buyer/profile/edit" element={
                            <ProtectedRoute allowedRoles={['buyer']}>
                              <BuyerEditProfile currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/buyer/profile/saved-vendors" element={
                            <ProtectedRoute allowedRoles={['buyer']}>
                              <SavedVendors currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/buyer/profile/contracts" element={
                            <ProtectedRoute allowedRoles={['buyer']}>
                              <MyContracts currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/buyer/contract/:id" element={
                            <ProtectedRoute allowedRoles={['buyer']}>
                              <BuyerContractDetail currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/buyer/history" element={
                            <ProtectedRoute allowedRoles={['buyer']}>
                              <BuyerHistory currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/buyer/messages" element={
                            <ProtectedRoute allowedRoles={['buyer']}>
                              <MessagesHub currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />

                          {/* Seller Routes */}
                          <Route path="/app/seller/home" element={
                            <ProtectedRoute allowedRoles={['seller']}>
                              <SellerHome currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/seller/marketplace" element={
                            <ProtectedRoute allowedRoles={['seller']}>
                              <MobileMarketplace currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/seller/active-jobs" element={
                            <ProtectedRoute allowedRoles={['seller']}>
                              <ActiveJobs currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/seller/job/:id" element={
                            <ProtectedRoute allowedRoles={['seller']}>
                              <SellerJobDetail currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/seller/marketplace/:id" element={
                            <ProtectedRoute allowedRoles={['seller']}>
                              <MobileJobDetail currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/seller/job/:id/quote" element={
                            <ProtectedRoute allowedRoles={['seller']}>
                              <QuoteComposer currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/seller/quotes" element={
                            <ProtectedRoute allowedRoles={['seller']}>
                              <MyQuotes currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/seller/quote/:id" element={
                            <ProtectedRoute allowedRoles={['seller']}>
                              <MyQuoteDetail currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/seller/quote/:id/edit" element={
                            <ProtectedRoute allowedRoles={['seller']}>
                              <EditQuote currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/seller/bookings" element={
                            <ProtectedRoute allowedRoles={['seller']}>
                              <SellerBookingsList currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/seller/booking/:id" element={
                            <ProtectedRoute allowedRoles={['seller']}>
                              <SellerBookingDetail currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/seller/reviews" element={
                            <ProtectedRoute allowedRoles={['seller']}>
                              <SellerReviews currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/seller/calendar" element={
                            <ProtectedRoute allowedRoles={['seller']}>
                              <SellerCalendar currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/seller/profile" element={
                            <ProtectedRoute allowedRoles={['seller']}>
                              <MobileSellerProfile currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/seller/profile/edit" element={
                            <ProtectedRoute allowedRoles={['seller']}>
                              <SellerEditProfile currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/seller/profile/contracts" element={
                            <ProtectedRoute allowedRoles={['seller']}>
                              <SellerMyContracts currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/seller/contract/:id" element={
                            <ProtectedRoute allowedRoles={['seller']}>
                              <SellerContractDetail currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/seller/contract/:id/review" element={
                            <ProtectedRoute allowedRoles={['seller']}>
                              <ContractReview currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/seller/profile/manage-services" element={
                            <ProtectedRoute allowedRoles={['seller']}>
                              <ManageServices currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/seller/profile/service-areas" element={
                            <ProtectedRoute allowedRoles={['seller']}>
                              <ServiceAreas currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/seller/profile/portfolio" element={
                            <ProtectedRoute allowedRoles={['seller']}>
                              <PortfolioGallery currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/seller/profile/certifications" element={
                            <ProtectedRoute allowedRoles={['seller']}>
                              <Certifications currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/seller/history" element={
                            <ProtectedRoute allowedRoles={['seller']}>
                              <SellerHistory currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/seller/messages" element={
                            <ProtectedRoute allowedRoles={['seller']}>
                              <MessagesHub currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />

                          {/* Shared Message Routes */}
                          <Route path="/app/messages/thread" element={
                            <ProtectedRoute requireAuth>
                              <MessageThread currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />

                          {/* Shared Routes */}
                          <Route path="/app/settings" element={
                            <ProtectedRoute requireAuth>
                              <MobileSettings currentLanguage={currentLanguage} onLanguageChange={setCurrentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/settings/signature" element={
                            <ProtectedRoute requireAuth>
                              <SignatureSettings currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/help" element={
                            <ProtectedRoute requireAuth>
                              <Help currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/notifications" element={
                            <ProtectedRoute requireAuth>
                              <Notifications />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/subscription" element={
                            <ProtectedRoute requireAuth>
                              <Subscription currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/app/offline" element={<OfflineMode />} />
                          <Route path="/app/*" element={<AppNotFound currentLanguage={currentLanguage} />} />

                          <Route path="/marketplace" element={
                            <ProtectedRoute allowedRoles={['seller']}>
                              <WebMarketplace currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/explore" element={
                            <ProtectedRoute allowedRoles={['buyer']}>
                              <Explore currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/post-job" element={
                            <ProtectedRoute allowedRoles={['buyer']}>
                              <PostJob currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/job/:id" element={
                            <ProtectedRoute>
                              <WebJobDetail currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/seller-quotes" element={
                            <ProtectedRoute allowedRoles={['seller']}>
                              <SellerQuotes currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/my-requests" element={
                            <ProtectedRoute allowedRoles={['buyer']}>
                              <MyRequests currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/edit-request/:id" element={
                            <ProtectedRoute allowedRoles={['buyer']}>
                              <EditRequest currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/manage-quotes/:requestId" element={
                            <ProtectedRoute allowedRoles={['buyer']}>
                              <ManageQuotes currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="/seller/:sellerId" element={
                            <ProtectedRoute allowedRoles={['buyer']}>
                              <SellerProfile currentLanguage={currentLanguage} />
                            </ProtectedRoute>
                          } />
                          <Route path="*" element={<NotFound currentLanguage={currentLanguage} />} />
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
    </ErrorBoundary >
  );
};

export default App;
