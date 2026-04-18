import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('buyer' | 'seller' | 'admin')[];
  requireAuth?: boolean;
}

export const ProtectedRoute = ({
  children,
  allowedRoles,
  requireAuth = true
}: ProtectedRouteProps) => {
  const { user, userType, userTypeLoaded, loading } = useAuth();

  // Wait for auth session to resolve
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (requireAuth && !user) {
    const isAppRoute = window.location.pathname.startsWith('/app');
    return <Navigate to={isAppRoute ? "/app/onboarding/login" : "/login"} replace />;
  }

  // Wait for userType fetch to complete (prevents role-check bypass during async fetch)
  if (allowedRoles && user && !userTypeLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (allowedRoles && userType && !allowedRoles.includes(userType)) {
    // Redirect to appropriate home based on user type (mobile app routes)
    const isAppRoute = window.location.pathname.startsWith('/app');
    if (userType === 'buyer') {
      return <Navigate to={isAppRoute ? "/app/buyer/home" : "/buyer-dashboard"} replace />;
    } else if (userType === 'seller') {
      return <Navigate to={isAppRoute ? "/app/seller/home" : "/seller-dashboard"} replace />;
    } else if (userType === 'admin') {
      return <Navigate to={isAppRoute ? "/app/admin/home" : "/admin"} replace />;
    } else {
      // Fallback to buyer home
      return <Navigate to={isAppRoute ? "/app/buyer/home" : "/buyer-dashboard"} replace />;
    }
  }

  return <>{children}</>;
};
