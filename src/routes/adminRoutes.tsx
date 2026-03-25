import React, { Suspense, lazy } from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Loader2 } from 'lucide-react';

// Lazy load admin components for code splitting
const AdminHome = lazy(() => import('@/app/admin/home/AdminHome').then(m => ({ default: m.AdminHome })));
const AdminReports = lazy(() => import('@/app/admin/reports/AdminReports').then(m => ({ default: m.AdminReports })));
const AdminUsers = lazy(() => import('@/app/admin/users/AdminUsers').then(m => ({ default: m.AdminUsers })));
const AdminSupport = lazy(() => import('@/app/admin/support/AdminSupport').then(m => ({ default: m.AdminSupport })));
const AdminDisputes = lazy(() => import('@/app/admin/disputes/AdminDisputes').then(m => ({ default: m.AdminDisputes })));
const AdminScores = lazy(() => import('@/app/admin/scores/AdminScores').then(m => ({ default: m.AdminScores })));
const AdminIssues = lazy(() => import('@/app/admin/issues/AdminIssues').then(m => ({ default: m.AdminIssues })));
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
                <ProtectedRoute allowedRoles={['admin']}>
                    <Suspense fallback={<RouteLoader />}>
                        <AdminSupport currentLanguage={currentLanguage} />
                    </Suspense>
                </ProtectedRoute>
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
        </>
    );
}
