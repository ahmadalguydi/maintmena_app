import { Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import PremiumArchive from '@/pages/PremiumArchive';
import Resources from '@/pages/Resources';
import EducationalContent from '@/pages/EducationalContent';
import TemplatesGuides from '@/pages/TemplatesGuides';
import Settings from '@/pages/Settings';
import CalendarPage from '@/pages/CalendarPage';

export interface RouteProps {
    currentLanguage: 'en' | 'ar';
}

export function webAppRoutes({ currentLanguage }: RouteProps) {
    return (
        <>
            <Route path="/premium-archive" element={
                <ProtectedRoute allowedRoles={['seller', 'admin']}>
                    <PremiumArchive currentLanguage={currentLanguage} />
                </ProtectedRoute>
            } />
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
            <Route path="/calendar" element={<CalendarPage currentLanguage={currentLanguage} />} />
            <Route path="/settings" element={<Settings currentLanguage={currentLanguage} />} />
        </>
    );
}
