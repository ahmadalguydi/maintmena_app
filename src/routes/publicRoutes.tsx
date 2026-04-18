import { Suspense } from 'react';
import { Route } from 'react-router-dom';
import { RouteLoader, lazyRoute } from './routeLoader';

export interface RouteProps {
    currentLanguage: 'en' | 'ar';
}

const Index = lazyRoute<RouteProps>(() => import('@/pages/Index'));
const About = lazyRoute<RouteProps>(() => import('@/pages/About'));
const Contact = lazyRoute<RouteProps>(() => import('@/pages/Contact'));
const PricingPage = lazyRoute<RouteProps>(() => import('@/pages/PricingPage'));
const Services = lazyRoute<RouteProps>(() => import('@/pages/Services'));
const Blog = lazyRoute<RouteProps>(() => import('@/pages/Blog'));
const BlogPost = lazyRoute<RouteProps>(() => import('@/pages/BlogPost'));
const Support = lazyRoute<RouteProps>(() => import('@/pages/Support'));
const Terms = lazyRoute<RouteProps>(() => import('@/pages/Terms'));
const Privacy = lazyRoute<RouteProps>(() => import('@/pages/Privacy'));
const NotFound = lazyRoute<RouteProps>(() => import('@/pages/NotFound'));
const Signup = lazyRoute<RouteProps>(() => import('@/pages/Signup'));
const SignupChoice = lazyRoute<RouteProps>(() => import('@/pages/SignupChoice'));
const SignupConfirmation = lazyRoute<RouteProps>(() => import('@/pages/SignupConfirmation'));
const Login = lazyRoute<RouteProps>(() => import('@/pages/Login'));
const Logout = lazyRoute<RouteProps>(() => import('@/pages/Logout'));

export function publicRoutes({ currentLanguage }: RouteProps) {
    return (
        <>
            <Route path="/" element={<Suspense fallback={<RouteLoader />}><Index currentLanguage={currentLanguage} /></Suspense>} />
            <Route path="/about" element={<Suspense fallback={<RouteLoader />}><About currentLanguage={currentLanguage} /></Suspense>} />
            <Route path="/contact" element={<Suspense fallback={<RouteLoader />}><Contact currentLanguage={currentLanguage} /></Suspense>} />
            <Route path="/pricing" element={<Suspense fallback={<RouteLoader />}><PricingPage currentLanguage={currentLanguage} /></Suspense>} />
            <Route path="/blog" element={<Suspense fallback={<RouteLoader />}><Blog currentLanguage={currentLanguage} /></Suspense>} />
            <Route path="/blog/:slug" element={<Suspense fallback={<RouteLoader />}><BlogPost currentLanguage={currentLanguage} /></Suspense>} />
            <Route path="/services" element={<Suspense fallback={<RouteLoader />}><Services currentLanguage={currentLanguage} /></Suspense>} />
            <Route path="/support" element={<Suspense fallback={<RouteLoader />}><Support currentLanguage={currentLanguage} /></Suspense>} />
            <Route path="/terms" element={<Suspense fallback={<RouteLoader />}><Terms currentLanguage={currentLanguage} /></Suspense>} />
            <Route path="/privacy" element={<Suspense fallback={<RouteLoader />}><Privacy currentLanguage={currentLanguage} /></Suspense>} />
            <Route path="/signup" element={<Suspense fallback={<RouteLoader />}><Signup currentLanguage={currentLanguage} /></Suspense>} />
            <Route path="/signup-choice" element={<Suspense fallback={<RouteLoader />}><SignupChoice currentLanguage={currentLanguage} /></Suspense>} />
            <Route path="/signup-confirmation" element={<Suspense fallback={<RouteLoader />}><SignupConfirmation currentLanguage={currentLanguage} /></Suspense>} />
            <Route path="/login" element={<Suspense fallback={<RouteLoader />}><Login currentLanguage={currentLanguage} /></Suspense>} />
            <Route path="/logout" element={<Suspense fallback={<RouteLoader />}><Logout currentLanguage={currentLanguage} /></Suspense>} />
            <Route path="*" element={<Suspense fallback={<RouteLoader />}><NotFound currentLanguage={currentLanguage} /></Suspense>} />
        </>
    );
}
