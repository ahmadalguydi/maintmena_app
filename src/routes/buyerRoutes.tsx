import { Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { BuyerHome } from '@/app/buyer/home/BuyerHome';
import { BuyerActivity } from '@/app/buyer/activity/BuyerActivity';
import { RequestDetail } from '@/app/buyer/requests/RequestDetail';
import { BuyerProfile } from '@/app/buyer/profile/BuyerProfile';
import { EditProfile as BuyerEditProfile } from '@/app/buyer/profile/EditProfile';
import { History as BuyerHistory } from '@/app/buyer/profile/History';
import MessagesHub from '@/app/shared/MessagesHub';

export interface RouteProps {
    currentLanguage: 'en' | 'ar';
}

export function buyerRoutes({ currentLanguage }: RouteProps) {
    return (
        <>
            {/* Guest-accessible routes */}
            <Route path="/app/buyer/explore" element={<Navigate to="/app/buyer/home" replace />} />
            <Route path="/app/buyer/vendor/:id" element={<Navigate to="/app/buyer/home" replace />} />

            <Route path="/app/buyer/requests/new" element={<Navigate to="/app/buyer/home?compose=1" replace />} />
            <Route path="/app/buyer/requests" element={<Navigate to="/app/buyer/activity" replace />} />

            {/* Protected Buyer Routes */}
            <Route path="/app/buyer/home" element={
                <ProtectedRoute allowedRoles={['buyer']}>
                    <BuyerHome currentLanguage={currentLanguage} />
                </ProtectedRoute>
            } />
            <Route path="/app/buyer/activity" element={
                <ProtectedRoute allowedRoles={['buyer']}>
                    <BuyerActivity currentLanguage={currentLanguage} />
                </ProtectedRoute>
            } />
            <Route path="/app/buyer/request/:id" element={
                <ProtectedRoute allowedRoles={['buyer']}>
                    <RequestDetail currentLanguage={currentLanguage} />
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
        </>
    );
}
