import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Settings as MobileSettings } from '@/app/shared/Settings';
import { Help } from '@/app/shared/Help';
import Notifications from '@/app/shared/Notifications';
import { MessageThread } from '@/app/shared/MessageThread';
import { OfflineMode } from '@/app/shared/OfflineMode';
import { AppNotFound } from '@/app/shared/AppNotFound';

export interface SharedRouteProps {
    currentLanguage: 'en' | 'ar';
    setCurrentLanguage: (lang: 'en' | 'ar') => void;
}

export function sharedRoutes({ currentLanguage, setCurrentLanguage }: SharedRouteProps) {
    return (
        <>
            {/* Shared Message Routes */}
            <Route path="/app/messages/thread" element={
                <ProtectedRoute requireAuth>
                    <MessageThread currentLanguage={currentLanguage} />
                </ProtectedRoute>
            } />

            {/* Shared Settings and Help Routes */}
            <Route path="/app/settings" element={
                <ProtectedRoute requireAuth>
                    <MobileSettings currentLanguage={currentLanguage} onLanguageChange={setCurrentLanguage} />
                </ProtectedRoute>
            } />
            <Route path="/app/help" element={
                <ProtectedRoute requireAuth>
                    <Help currentLanguage={currentLanguage} />
                </ProtectedRoute>
            } />
            <Route path="/app/support" element={
                <ProtectedRoute requireAuth>
                    <Help currentLanguage={currentLanguage} />
                </ProtectedRoute>
            } />
            <Route path="/app/notifications" element={
                <ProtectedRoute requireAuth>
                    <Notifications />
                </ProtectedRoute>
            } />
            <Route path="/app/offline" element={<OfflineMode />} />
            <Route path="/app/*" element={<AppNotFound currentLanguage={currentLanguage} />} />
        </>
    );
}
