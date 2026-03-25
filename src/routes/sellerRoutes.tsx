import { Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { SellerHome } from '@/app/seller/home/SellerHome';
import { ActiveJobs } from '@/app/seller/jobs/ActiveJobs';
import { SellerJobDetail } from '@/app/seller/jobs/SellerJobDetail';
import { SellerReviews } from '@/app/seller/reviews/SellerReviews';
import { SellerEarnings } from '@/app/seller/earnings/SellerEarnings';
import { SellerProfile as MobileSellerProfile } from '@/app/seller/profile/SellerProfile';
import { EditProfile as SellerEditProfile } from '@/app/seller/profile/EditProfile';
import { ManageServices } from '@/app/seller/profile/ManageServices';
import { ServiceAreas } from '@/app/seller/profile/ServiceAreas';
import { PortfolioGallery } from '@/app/seller/profile/PortfolioGallery';
import { Certifications } from '@/app/seller/profile/Certifications';
import MessagesHub from '@/app/shared/MessagesHub';
import { CancelJob } from '@/app/seller/jobs/CancelJob';
import { RescheduleJob } from '@/app/seller/jobs/RescheduleJob';
import { JobNotes } from '@/app/seller/jobs/JobNotes';

export interface RouteProps {
    currentLanguage: 'en' | 'ar';
}

export function sellerRoutes({ currentLanguage }: RouteProps) {
    return (
        <>
            <Route path="/app/seller/home" element={
                <ProtectedRoute allowedRoles={['seller']}>
                    <SellerHome currentLanguage={currentLanguage} />
                </ProtectedRoute>
            } />
            <Route path="/app/seller/active-jobs" element={
                <ProtectedRoute allowedRoles={['seller']}>
                    <ActiveJobs currentLanguage={currentLanguage} />
                </ProtectedRoute>
            } />
            <Route path="/app/seller/job/:id" element={
                <ProtectedRoute allowedRoles={['seller']}>
                    <SellerJobDetail currentLanguage={currentLanguage} />
                </ProtectedRoute>
            } />
            <Route path="/app/seller/job/:id/cancel" element={
                <ProtectedRoute allowedRoles={['seller']}>
                    <CancelJob currentLanguage={currentLanguage} />
                </ProtectedRoute>
            } />
            <Route path="/app/seller/job/:id/reschedule" element={
                <ProtectedRoute allowedRoles={['seller']}>
                    <RescheduleJob currentLanguage={currentLanguage} />
                </ProtectedRoute>
            } />
            <Route path="/app/seller/job/:id/notes" element={
                <ProtectedRoute allowedRoles={['seller']}>
                    <JobNotes currentLanguage={currentLanguage} />
                </ProtectedRoute>
            } />
            <Route path="/app/seller/reviews" element={
                <ProtectedRoute allowedRoles={['seller']}>
                    <SellerReviews currentLanguage={currentLanguage} />
                </ProtectedRoute>
            } />
            <Route path="/app/seller/earnings" element={
                <ProtectedRoute allowedRoles={['seller']}>
                    <SellerEarnings currentLanguage={currentLanguage} />
                </ProtectedRoute>
            } />
            <Route path="/app/seller/profile" element={
                <ProtectedRoute allowedRoles={['seller']}>
                    <MobileSellerProfile currentLanguage={currentLanguage} />
                </ProtectedRoute>
            } />
            <Route path="/app/seller/profile/edit" element={
                <ProtectedRoute allowedRoles={['seller']}>
                    <SellerEditProfile currentLanguage={currentLanguage} />
                </ProtectedRoute>
            } />
            <Route path="/app/seller/profile/manage-services" element={
                <ProtectedRoute allowedRoles={['seller']}>
                    <ManageServices currentLanguage={currentLanguage} />
                </ProtectedRoute>
            } />
            <Route path="/app/seller/profile/service-areas" element={
                <ProtectedRoute allowedRoles={['seller']}>
                    <ServiceAreas currentLanguage={currentLanguage} />
                </ProtectedRoute>
            } />
            <Route path="/app/seller/profile/portfolio" element={
                <ProtectedRoute allowedRoles={['seller']}>
                    <PortfolioGallery currentLanguage={currentLanguage} />
                </ProtectedRoute>
            } />
            <Route path="/app/seller/profile/certifications" element={
                <ProtectedRoute allowedRoles={['seller']}>
                    <Certifications currentLanguage={currentLanguage} />
                </ProtectedRoute>
            } />
            <Route path="/app/seller/history" element={<Navigate to="/app/seller/earnings" replace />} />
            <Route path="/app/seller/messages" element={
                <ProtectedRoute allowedRoles={['seller']}>
                    <MessagesHub currentLanguage={currentLanguage} />
                </ProtectedRoute>
            } />
        </>
    );
}
