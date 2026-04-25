import { Suspense } from 'react';
import { Route } from 'react-router-dom';
import { RouteLoader, lazyRoute } from './routeLoader';

export interface RouteProps {
    currentLanguage: 'en' | 'ar';
}

const Settings = lazyRoute<RouteProps>(() => import('@/pages/Settings'));
const CalendarPage = lazyRoute<RouteProps>(() => import('@/pages/CalendarPage'));

export function webAppRoutes({ currentLanguage }: RouteProps) {
    return (
        <>
            <Route path="/calendar" element={<Suspense fallback={<RouteLoader />}><CalendarPage currentLanguage={currentLanguage} /></Suspense>} />
            <Route path="/settings" element={<Suspense fallback={<RouteLoader />}><Settings currentLanguage={currentLanguage} /></Suspense>} />
        </>
    );
}
