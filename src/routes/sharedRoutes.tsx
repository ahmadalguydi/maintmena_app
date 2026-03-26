import { Suspense } from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { OfflineMode } from '@/app/shared/OfflineMode';
import { RouteLoader, lazyNamedRoute, lazyRoute } from './routeLoader';

export interface SharedRouteProps {
    currentLanguage: 'en' | 'ar';
    setCurrentLanguage: (lang: 'en' | 'ar') => void;
}

const MobileSettings = lazyNamedRoute<{
    currentLanguage: 'en' | 'ar';
    onLanguageChange: (lang: 'en' | 'ar') => void;
}>(() => import('@/app/shared/Settings'), 'Settings');
const Help = lazyNamedRoute<{ currentLanguage: 'en' | 'ar' }>(() => import('@/app/shared/Help'), 'Help');
const Notifications = lazyRoute(() => import('@/app/shared/Notifications'));
const MessageThread = lazyNamedRoute<{ currentLanguage: 'en' | 'ar' }>(() => import('@/app/shared/MessageThread'), 'MessageThread');
const AppNotFound = lazyNamedRoute<{ currentLanguage: 'en' | 'ar' }>(() => import('@/app/shared/AppNotFound'), 'AppNotFound');

export function sharedRoutes({ currentLanguage, setCurrentLanguage }: SharedRouteProps) {
    return (
        <>
            {/* Shared Message Routes */}
            <Route path="/app/messages/thread" element={
                <ProtectedRoute requireAuth>
                    <Suspense fallback={<RouteLoader />}>
                        <MessageThread currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />

            {/* Shared Settings and Help Routes */}
            <Route path="/app/settings" element={
                <ProtectedRoute requireAuth>
                    <Suspense fallback={<RouteLoader />}>
                        <MobileSettings currentLanguage={currentLanguage} onLanguageChange={setCurrentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />
            <Route path="/app/help" element={
                <ProtectedRoute requireAuth>
                    <Suspense fallback={<RouteLoader />}>
                        <Help currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />
            <Route path="/app/support" element={
                <ProtectedRoute requireAuth>
                    <Suspense fallback={<RouteLoader />}>
                        <Help currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />
            <Route path="/app/notifications" element={
                <ProtectedRoute requireAuth>
                    <Suspense fallback={<RouteLoader />}>
                        <Notifications />
                    </Suspense>
                </ProtectedRoute>
            } />
            <Route path="/app/offline" element={<OfflineMode />} />
            <Route path="/app/*" element={
                <Suspense fallback={<RouteLoader />}>
                    <AppNotFound currentLanguage={currentLanguage} />
                </Suspense>
            } />
        </>
    );
}
