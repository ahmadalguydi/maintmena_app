import { Suspense } from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { RouteLoader, lazyRoute } from './routeLoader';

export interface RouteProps {
    currentLanguage: 'en' | 'ar';
}

const PremiumArchive = lazyRoute<RouteProps>(() => import('@/pages/PremiumArchive'));
const Resources = lazyRoute<RouteProps>(() => import('@/pages/Resources'));
const EducationalContent = lazyRoute<RouteProps>(() => import('@/pages/EducationalContent'));
const TemplatesGuides = lazyRoute<RouteProps>(() => import('@/pages/TemplatesGuides'));
const Settings = lazyRoute<RouteProps>(() => import('@/pages/Settings'));
const CalendarPage = lazyRoute<RouteProps>(() => import('@/pages/CalendarPage'));

export function webAppRoutes({ currentLanguage }: RouteProps) {
    return (
        <>
            <Route path="/premium-archive" element={
                <ProtectedRoute allowedRoles={['seller', 'admin']}>
                    <Suspense fallback={<RouteLoader />}>
                        <PremiumArchive currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />
            <Route path="/resources" element={
                <ProtectedRoute allowedRoles={['seller', 'admin']}>
                    <Suspense fallback={<RouteLoader />}>
                        <Resources currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />
            <Route path="/educational-content" element={
                <ProtectedRoute allowedRoles={['seller', 'admin']}>
                    <Suspense fallback={<RouteLoader />}>
                        <EducationalContent currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />
            <Route path="/templates-guides" element={
                <ProtectedRoute allowedRoles={['seller', 'admin']}>
                    <Suspense fallback={<RouteLoader />}>
                        <TemplatesGuides currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />
            <Route path="/calendar" element={<Suspense fallback={<RouteLoader />}><CalendarPage currentLanguage={currentLanguage} /></Suspense>} />
            <Route path="/settings" element={<Suspense fallback={<RouteLoader />}><Settings currentLanguage={currentLanguage} /></Suspense>} />
        </>
    );
}
