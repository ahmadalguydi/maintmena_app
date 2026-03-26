import { Suspense } from 'react';
import { Route } from 'react-router-dom';
import { RouteLoader, lazyNamedRoute, lazyRoute } from './routeLoader';

export interface OnboardingRouteProps {
    currentLanguage: 'en' | 'ar';
    setCurrentLanguage: (lang: 'en' | 'ar') => void;
}

const SplashScreen = lazyNamedRoute(() => import('@/app/shared/SplashScreen'), 'SplashScreen');
const OnboardingSlides = lazyNamedRoute(() => import('@/app/shared/OnboardingSlides'), 'OnboardingSlides');
const RoleSelection = lazyNamedRoute<{ currentLanguage: 'en' | 'ar'; onToggle: () => void }>(() => import('@/app/onboarding/RoleSelection'), 'RoleSelection');
const MobileLogin = lazyNamedRoute<{ currentLanguage: 'en' | 'ar'; onToggle: () => void }>(() => import('@/app/onboarding/Login'), 'Login');
const MobileSignup = lazyNamedRoute<{ currentLanguage: 'en' | 'ar'; onToggle: () => void }>(() => import('@/app/onboarding/Signup'), 'Signup');
const OTPVerification = lazyNamedRoute(() => import('@/app/shared/OTPVerification'), 'OTPVerification');
const ForgotPassword = lazyNamedRoute<{ currentLanguage: 'en' | 'ar'; onToggle: () => void }>(() => import('@/app/shared/ForgotPassword'), 'ForgotPassword');
const ResetPassword = lazyNamedRoute<{ currentLanguage: 'en' | 'ar'; onToggle: () => void }>(() => import('@/app/shared/ResetPassword'), 'ResetPassword');
const SignupSuccess = lazyNamedRoute(() => import('@/app/shared/SignupSuccess'), 'SignupSuccess');
const PermissionCamera = lazyNamedRoute(() => import('@/app/shared/PermissionCamera'), 'PermissionCamera');
const PermissionLocation = lazyNamedRoute(() => import('@/app/shared/PermissionLocation'), 'PermissionLocation');
const PermissionNotifications = lazyNamedRoute(() => import('@/app/shared/PermissionNotifications'), 'PermissionNotifications');
const AlphaSellerWelcome = lazyNamedRoute<{ currentLanguage: 'en' | 'ar'; onToggle: () => void }>(() => import('@/app/onboarding/AlphaSellerWelcome'), 'AlphaSellerWelcome');
const PlanSelection = lazyRoute(() => import('@/components/PlanSelection'));

export function onboardingRoutes({ currentLanguage, setCurrentLanguage }: OnboardingRouteProps) {
    const handleToggle = () => setCurrentLanguage(currentLanguage === 'en' ? 'ar' : 'en');

    return (
        <>
            <Route path="/app" element={
                <Suspense fallback={<RouteLoader />}>
                    <SplashScreen />
                </Suspense>
            } />
            <Route path="/app/onboarding/role-selection" element={
                <Suspense fallback={<RouteLoader />}>
                    <RoleSelection currentLanguage={currentLanguage} onToggle={handleToggle} />
                </Suspense>
            } />
            <Route path="/app/onboarding/slides" element={
                <Suspense fallback={<RouteLoader />}>
                    <OnboardingSlides />
                </Suspense>
            } />
            <Route path="/app/onboarding/alpha-seller" element={
                <Suspense fallback={<RouteLoader />}>
                    <AlphaSellerWelcome currentLanguage={currentLanguage} onToggle={handleToggle} />
                </Suspense>
            } />
            <Route path="/app/onboarding/buyer-plan-selection" element={
                <Suspense fallback={<RouteLoader />}>
                    <PlanSelection
                        currentLanguage={currentLanguage}
                        onSelectPlan={(plan, isAnnual) => {
                            localStorage.setItem('selectedPlan', plan);
                            localStorage.setItem('selectedBilling', isAnnual ? 'annual' : 'monthly');
                        }}
                        userType="buyer"
                    />
                </Suspense>
            } />
            <Route path="/app/onboarding/seller-plan-selection" element={
                <Suspense fallback={<RouteLoader />}>
                    <PlanSelection
                        currentLanguage={currentLanguage}
                        onSelectPlan={(plan, isAnnual) => {
                            localStorage.setItem('selectedPlan', plan);
                            localStorage.setItem('selectedBilling', isAnnual ? 'annual' : 'monthly');
                        }}
                        userType="seller"
                    />
                </Suspense>
            } />
            <Route path="/app/onboarding/login" element={
                <Suspense fallback={<RouteLoader />}>
                    <MobileLogin currentLanguage={currentLanguage} onToggle={handleToggle} />
                </Suspense>
            } />
            <Route path="/app/onboarding/signup" element={
                <Suspense fallback={<RouteLoader />}>
                    <MobileSignup currentLanguage={currentLanguage} onToggle={handleToggle} />
                </Suspense>
            } />
            <Route path="/app/onboarding/otp-verification" element={
                <Suspense fallback={<RouteLoader />}>
                    <OTPVerification />
                </Suspense>
            } />
            <Route path="/app/onboarding/forgot-password" element={
                <Suspense fallback={<RouteLoader />}>
                    <ForgotPassword currentLanguage={currentLanguage} onToggle={handleToggle} />
                </Suspense>
            } />
            <Route path="/app/onboarding/reset-password" element={
                <Suspense fallback={<RouteLoader />}>
                    <ResetPassword currentLanguage={currentLanguage} onToggle={handleToggle} />
                </Suspense>
            } />
            <Route path="/app/signup-success" element={
                <Suspense fallback={<RouteLoader />}>
                    <SignupSuccess />
                </Suspense>
            } />

            {/* Permissions Flow */}
            <Route path="/app/permissions/camera" element={
                <Suspense fallback={<RouteLoader />}>
                    <PermissionCamera />
                </Suspense>
            } />
            <Route path="/app/permissions/location" element={
                <Suspense fallback={<RouteLoader />}>
                    <PermissionLocation />
                </Suspense>
            } />
            <Route path="/app/permissions/notifications" element={
                <Suspense fallback={<RouteLoader />}>
                    <PermissionNotifications />
                </Suspense>
            } />
        </>
    );
}
