import { Route } from 'react-router-dom';
import { SplashScreen } from '@/app/shared/SplashScreen';
import { OnboardingSlides } from '@/app/shared/OnboardingSlides';
import { LanguageWelcome } from '@/app/onboarding/LanguageWelcome';
import { RoleSelection } from '@/app/onboarding/RoleSelection';
import { Login as MobileLogin } from '@/app/onboarding/Login';
import { Signup as MobileSignup } from '@/app/onboarding/Signup';
import { OTPVerification } from '@/app/shared/OTPVerification';
import { ForgotPassword } from '@/app/shared/ForgotPassword';
import { ResetPassword } from '@/app/shared/ResetPassword';
import { SignupSuccess } from '@/app/shared/SignupSuccess';
import { PermissionCamera } from '@/app/shared/PermissionCamera';
import { PermissionLocation } from '@/app/shared/PermissionLocation';
import { PermissionNotifications } from '@/app/shared/PermissionNotifications';
import { AlphaSellerWelcome } from '@/app/onboarding/AlphaSellerWelcome';
import PlanSelection from '@/components/PlanSelection';

export interface OnboardingRouteProps {
    currentLanguage: 'en' | 'ar';
    setCurrentLanguage: (lang: 'en' | 'ar') => void;
}

export function onboardingRoutes({ currentLanguage, setCurrentLanguage }: OnboardingRouteProps) {
    const handleToggle = () => setCurrentLanguage(currentLanguage === 'en' ? 'ar' : 'en');

    return (
        <>
            <Route path="/app" element={<SplashScreen />} />
            <Route path="/app/onboarding/role-selection" element={
                <RoleSelection currentLanguage={currentLanguage} onToggle={handleToggle} />
            } />
            <Route path="/app/onboarding/slides" element={<OnboardingSlides />} />
            <Route path="/app/onboarding/alpha-seller" element={
                <AlphaSellerWelcome currentLanguage={currentLanguage} onToggle={handleToggle} />
            } />
            <Route path="/app/onboarding/buyer-plan-selection" element={
                <PlanSelection
                    currentLanguage={currentLanguage}
                    onSelectPlan={(plan, isAnnual) => {
                        localStorage.setItem('selectedPlan', plan);
                        localStorage.setItem('selectedBilling', isAnnual ? 'annual' : 'monthly');
                    }}
                    userType="buyer"
                />
            } />
            <Route path="/app/onboarding/seller-plan-selection" element={
                <PlanSelection
                    currentLanguage={currentLanguage}
                    onSelectPlan={(plan, isAnnual) => {
                        localStorage.setItem('selectedPlan', plan);
                        localStorage.setItem('selectedBilling', isAnnual ? 'annual' : 'monthly');
                    }}
                    userType="seller"
                />
            } />
            <Route path="/app/onboarding/login" element={
                <MobileLogin currentLanguage={currentLanguage} onToggle={handleToggle} />
            } />
            <Route path="/app/onboarding/signup" element={
                <MobileSignup currentLanguage={currentLanguage} onToggle={handleToggle} />
            } />
            <Route path="/app/onboarding/otp-verification" element={<OTPVerification />} />
            <Route path="/app/onboarding/forgot-password" element={
                <ForgotPassword currentLanguage={currentLanguage} onToggle={handleToggle} />
            } />
            <Route path="/app/onboarding/reset-password" element={
                <ResetPassword currentLanguage={currentLanguage} onToggle={handleToggle} />
            } />
            <Route path="/app/signup-success" element={<SignupSuccess />} />

            {/* Permissions Flow */}
            <Route path="/app/permissions/camera" element={<PermissionCamera />} />
            <Route path="/app/permissions/location" element={<PermissionLocation />} />
            <Route path="/app/permissions/notifications" element={<PermissionNotifications />} />
        </>
    );
}
