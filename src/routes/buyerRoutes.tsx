import { Suspense } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { RouteLoader, lazyNamedRoute, lazyRoute } from './routeLoader';

export interface RouteProps {
    currentLanguage: 'en' | 'ar';
}

const BuyerHome = lazyNamedRoute<RouteProps>(() => import('@/app/buyer/home/BuyerHome'), 'BuyerHome');
const BuyerActivity = lazyNamedRoute<RouteProps>(() => import('@/app/buyer/activity/BuyerActivity'), 'BuyerActivity');
const RequestDetail = lazyNamedRoute<RouteProps>(() => import('@/app/buyer/requests/RequestDetail'), 'RequestDetail');
const BuyerProfile = lazyNamedRoute<RouteProps>(() => import('@/app/buyer/profile/BuyerProfile'), 'BuyerProfile');
const BuyerEditProfile = lazyNamedRoute<RouteProps>(() => import('@/app/buyer/profile/EditProfile'), 'EditProfile');
const BuyerHistory = lazyNamedRoute<RouteProps>(() => import('@/app/buyer/profile/History'), 'History');
const MessagesHub = lazyRoute<RouteProps>(() => import('@/app/shared/MessagesHub'));

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
                    <Suspense fallback={<RouteLoader />}>
                        <BuyerHome currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />
            <Route path="/app/buyer/activity" element={
                <ProtectedRoute allowedRoles={['buyer']}>
                    <Suspense fallback={<RouteLoader />}>
                        <BuyerActivity currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />
            <Route path="/app/buyer/request/:id" element={
                <ProtectedRoute allowedRoles={['buyer']}>
                    <Suspense fallback={<RouteLoader />}>
                        <RequestDetail currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />
            <Route path="/app/buyer/profile" element={
                <ProtectedRoute allowedRoles={['buyer']}>
                    <Suspense fallback={<RouteLoader />}>
                        <BuyerProfile currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />
            <Route path="/app/buyer/profile/edit" element={
                <ProtectedRoute allowedRoles={['buyer']}>
                    <Suspense fallback={<RouteLoader />}>
                        <BuyerEditProfile currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />
            <Route path="/app/buyer/history" element={
                <ProtectedRoute allowedRoles={['buyer']}>
                    <Suspense fallback={<RouteLoader />}>
                        <BuyerHistory currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />
            <Route path="/app/buyer/messages" element={
                <ProtectedRoute allowedRoles={['buyer']}>
                    <Suspense fallback={<RouteLoader />}>
                        <MessagesHub currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />
        </>
    );
}
