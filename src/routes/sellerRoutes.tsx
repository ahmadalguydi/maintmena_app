import { Suspense } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { RouteLoader, lazyNamedRoute, lazyRoute } from './routeLoader';

export interface RouteProps {
    currentLanguage: 'en' | 'ar';
}

const SellerHome = lazyNamedRoute<RouteProps>(() => import('@/app/seller/home/SellerHome'), 'SellerHome');
const ActiveJobs = lazyNamedRoute<RouteProps>(() => import('@/app/seller/jobs/ActiveJobs'), 'ActiveJobs');
const SellerJobDetail = lazyNamedRoute<RouteProps>(() => import('@/app/seller/jobs/SellerJobDetail'), 'SellerJobDetail');
const SellerReviews = lazyNamedRoute<RouteProps>(() => import('@/app/seller/reviews/SellerReviews'), 'SellerReviews');
const SellerEarnings = lazyNamedRoute<RouteProps>(() => import('@/app/seller/earnings/SellerEarnings'), 'SellerEarnings');
const MobileSellerProfile = lazyNamedRoute<RouteProps>(() => import('@/app/seller/profile/SellerProfile'), 'SellerProfile');
const SellerEditProfile = lazyNamedRoute<RouteProps>(() => import('@/app/seller/profile/EditProfile'), 'EditProfile');
const ManageServices = lazyNamedRoute<RouteProps>(() => import('@/app/seller/profile/ManageServices'), 'ManageServices');
const ServiceAreas = lazyNamedRoute<RouteProps>(() => import('@/app/seller/profile/ServiceAreas'), 'ServiceAreas');
const PortfolioGallery = lazyNamedRoute<RouteProps>(() => import('@/app/seller/profile/PortfolioGallery'), 'PortfolioGallery');
const Certifications = lazyNamedRoute<RouteProps>(() => import('@/app/seller/profile/Certifications'), 'Certifications');
const MessagesHub = lazyRoute<RouteProps>(() => import('@/app/shared/MessagesHub'));
const CancelJob = lazyNamedRoute<RouteProps>(() => import('@/app/seller/jobs/CancelJob'), 'CancelJob');
const RescheduleJob = lazyNamedRoute<RouteProps>(() => import('@/app/seller/jobs/RescheduleJob'), 'RescheduleJob');
const JobNotes = lazyNamedRoute<RouteProps>(() => import('@/app/seller/jobs/JobNotes'), 'JobNotes');

export function sellerRoutes({ currentLanguage }: RouteProps) {
    return (
        <>
            <Route path="/app/seller/home" element={
                <ProtectedRoute allowedRoles={['seller']}>
                    <Suspense fallback={<RouteLoader />}>
                        <SellerHome currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />
            <Route path="/app/seller/active-jobs" element={
                <ProtectedRoute allowedRoles={['seller']}>
                    <Suspense fallback={<RouteLoader />}>
                        <ActiveJobs currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />
            <Route path="/app/seller/job/:id" element={
                <ProtectedRoute allowedRoles={['seller']}>
                    <Suspense fallback={<RouteLoader />}>
                        <SellerJobDetail currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />
            <Route path="/app/seller/job/:id/cancel" element={
                <ProtectedRoute allowedRoles={['seller']}>
                    <Suspense fallback={<RouteLoader />}>
                        <CancelJob currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />
            <Route path="/app/seller/job/:id/reschedule" element={
                <ProtectedRoute allowedRoles={['seller']}>
                    <Suspense fallback={<RouteLoader />}>
                        <RescheduleJob currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />
            <Route path="/app/seller/job/:id/notes" element={
                <ProtectedRoute allowedRoles={['seller']}>
                    <Suspense fallback={<RouteLoader />}>
                        <JobNotes currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />
            <Route path="/app/seller/reviews" element={
                <ProtectedRoute allowedRoles={['seller']}>
                    <Suspense fallback={<RouteLoader />}>
                        <SellerReviews currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />
            <Route path="/app/seller/earnings" element={
                <ProtectedRoute allowedRoles={['seller']}>
                    <Suspense fallback={<RouteLoader />}>
                        <SellerEarnings currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />
            <Route path="/app/seller/profile" element={
                <ProtectedRoute allowedRoles={['seller']}>
                    <Suspense fallback={<RouteLoader />}>
                        <MobileSellerProfile currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />
            <Route path="/app/seller/profile/edit" element={
                <ProtectedRoute allowedRoles={['seller']}>
                    <Suspense fallback={<RouteLoader />}>
                        <SellerEditProfile currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />
            <Route path="/app/seller/profile/manage-services" element={
                <ProtectedRoute allowedRoles={['seller']}>
                    <Suspense fallback={<RouteLoader />}>
                        <ManageServices currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />
            <Route path="/app/seller/profile/service-areas" element={
                <ProtectedRoute allowedRoles={['seller']}>
                    <Suspense fallback={<RouteLoader />}>
                        <ServiceAreas currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />
            <Route path="/app/seller/profile/portfolio" element={
                <ProtectedRoute allowedRoles={['seller']}>
                    <Suspense fallback={<RouteLoader />}>
                        <PortfolioGallery currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />
            <Route path="/app/seller/profile/certifications" element={
                <ProtectedRoute allowedRoles={['seller']}>
                    <Suspense fallback={<RouteLoader />}>
                        <Certifications currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />
            <Route path="/app/seller/history" element={<Navigate to="/app/seller/earnings" replace />} />
            <Route path="/app/seller/messages" element={
                <ProtectedRoute allowedRoles={['seller']}>
                    <Suspense fallback={<RouteLoader />}>
                        <MessagesHub currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />
        </>
    );
}
