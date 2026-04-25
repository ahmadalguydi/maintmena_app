import React, { Suspense, lazy } from 'react';
import { Navigate, Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Loader2 } from 'lucide-react';

// Lazy load admin components for code splitting
const AdminHome = lazy(() => import('@/app/admin/home/AdminHome').then(m => ({ default: m.AdminHome })));
const AdminReports = lazy(() => import('@/app/admin/reports/AdminReports').then(m => ({ default: m.AdminReports })));
const AdminUsers = lazy(() => import('@/app/admin/users/AdminUsers').then(m => ({ default: m.AdminUsers })));
const AdminDisputes = lazy(() => import('@/app/admin/disputes/AdminDisputes').then(m => ({ default: m.AdminDisputes })));
const AdminScores = lazy(() => import('@/app/admin/scores/AdminScores').then(m => ({ default: m.AdminScores })));
const AdminIssues = lazy(() => import('@/app/admin/issues/AdminIssues').then(m => ({ default: m.AdminIssues })));
const AdminJobs = lazy(() => import('@/app/admin/jobs/AdminJobs').then(m => ({ default: m.AdminJobs })));
const AdminSellers = lazy(() => import('@/app/admin/sellers/AdminSellers').then(m => ({ default: m.AdminSellers })));
const AdminFinancials = lazy(() => import('@/app/admin/financials/AdminFinancials').then(m => ({ default: m.AdminFinancials })));
const AdminDispatch = lazy(() => import('@/app/admin/dispatch/AdminDispatch').then(m => ({ default: m.AdminDispatch })));
const AdminDemand = lazy(() => import('@/app/admin/demand/AdminDemand').then(m => ({ default: m.AdminDemand })));
const Admin = lazy(() => import('@/pages/Admin'));
const BlogEditor = lazy(() => import('@/components/admin/BlogEditor').then(m => ({ default: m.BlogEditor })));

// Loading fallback component
function RouteLoader() {
    return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
}

export interface RouteProps {
    currentLanguage: 'en' | 'ar';
}

export function adminRoutes({ currentLanguage }: RouteProps) {
    return (
        <>
            {/* Web Admin Routes */}
            <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <Suspense fallback={<RouteLoader />}>
                        <Admin currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />
            <Route path="/admin/blog/new" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <Suspense fallback={<RouteLoader />}>
                        <BlogEditor />
                    </Suspense>
                </ProtectedRoute>
            } />
            <Route path="/admin/blog/:id" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <Suspense fallback={<RouteLoader />}>
                        <BlogEditor />
                    </Suspense>
                </ProtectedRoute>
            } />

            {/* Mobile Admin App Routes */}
            <Route path="/app/admin/home" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <Suspense fallback={<RouteLoader />}>
                        <AdminHome currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />
            <Route path="/app/admin/reports" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <Suspense fallback={<RouteLoader />}>
                        <AdminReports currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />
            <Route path="/app/admin/users" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <Suspense fallback={<RouteLoader />}>
                        <AdminUsers currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />
            <Route path="/app/admin/support" element={
                <Navigate to="/app/admin/home" replace />
            } />
            <Route path="/app/admin/disputes" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <Suspense fallback={<RouteLoader />}>
                        <AdminDisputes currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />
            <Route path="/app/admin/issues" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <Suspense fallback={<RouteLoader />}>
                        <AdminIssues currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />
            <Route path="/app/admin/scores" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <Suspense fallback={<RouteLoader />}>
                        <AdminScores currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />

            {/* New Admin Screens */}
            <Route path="/app/admin/jobs" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <Suspense fallback={<RouteLoader />}>
                        <AdminJobs currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />
            <Route path="/app/admin/sellers" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <Suspense fallback={<RouteLoader />}>
                        <AdminSellers currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />
            <Route path="/app/admin/financials" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <Suspense fallback={<RouteLoader />}>
                        <AdminFinancials currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />
            <Route path="/app/admin/dispatch" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <Suspense fallback={<RouteLoader />}>
                        <AdminDispatch currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />
            <Route path="/app/admin/demand" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <Suspense fallback={<RouteLoader />}>
                        <AdminDemand currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
            } />
        </>
    );
}
