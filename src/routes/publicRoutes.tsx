import { Route } from 'react-router-dom';
import Index from '@/pages/Index';
import About from '@/pages/About';
import Contact from '@/pages/Contact';
import PricingPage from '@/pages/PricingPage';
import Services from '@/pages/Services';
import Blog from '@/pages/Blog';
import BlogPost from '@/pages/BlogPost';
import Support from '@/pages/Support';
import Terms from '@/pages/Terms';
import Privacy from '@/pages/Privacy';
import NotFound from '@/pages/NotFound';
import Signup from '@/pages/Signup';
import SignupChoice from '@/pages/SignupChoice';
import SignupConfirmation from '@/pages/SignupConfirmation';
import Login from '@/pages/Login';
import Logout from '@/pages/Logout';
import DensityTest from '@/pages/DensityTest';
import { RequestDetail } from '@/app/buyer/requests/RequestDetail';

export interface RouteProps {
    currentLanguage: 'en' | 'ar';
}

export function publicRoutes({ currentLanguage }: RouteProps) {
    return (
        <>
            <Route path="/" element={<Index currentLanguage={currentLanguage} />} />
            <Route path="/about" element={<About currentLanguage={currentLanguage} />} />
            <Route path="/contact" element={<Contact currentLanguage={currentLanguage} />} />
            <Route path="/pricing" element={<PricingPage currentLanguage={currentLanguage} />} />
            <Route path="/blog" element={<Blog currentLanguage={currentLanguage} />} />
            <Route path="/blog/:slug" element={<BlogPost currentLanguage={currentLanguage} />} />
            <Route path="/services" element={<Services currentLanguage={currentLanguage} />} />
            <Route path="/support" element={<Support currentLanguage={currentLanguage} />} />
            <Route path="/terms" element={<Terms currentLanguage={currentLanguage} />} />
            <Route path="/privacy" element={<Privacy currentLanguage={currentLanguage} />} />
            <Route path="/signup" element={<Signup currentLanguage={currentLanguage} />} />
            <Route path="/signup-choice" element={<SignupChoice currentLanguage={currentLanguage} />} />
            <Route path="/signup-confirmation" element={<SignupConfirmation currentLanguage={currentLanguage} />} />
            <Route path="/login" element={<Login currentLanguage={currentLanguage} />} />
            <Route path="/logout" element={<Logout currentLanguage={currentLanguage} />} />
            <Route path="/density-test" element={<DensityTest />} />
            {/* Mock tracking screen for preview */}
            <Route path="/request/mock-1" element={<RequestDetail currentLanguage={currentLanguage} />} />
            <Route path="*" element={<NotFound currentLanguage={currentLanguage} />} />
        </>
    );
}
