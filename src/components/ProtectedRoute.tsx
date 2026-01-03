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
  const { user, userType, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (requireAuth && !user) {
    // Check if we are in the mobile app context
    const isAppRoute = window.location.pathname.startsWith('/app');
    return <Navigate to={isAppRoute ? "/app/onboarding/login" : "/login"} replace />;
  }

  if (allowedRoles && userType && !allowedRoles.includes(userType)) {
    // Redirect to appropriate dashboard based on user type
    if (userType === 'buyer') {
      return <Navigate to="/buyer-dashboard" replace />;
    } else if (userType === 'seller') {
      return <Navigate to="/seller-dashboard" replace />;
    } else if (userType === 'admin') {
      return <Navigate to="/admin" replace />;
    } else {
      // Fallback to seller dashboard
      return <Navigate to="/seller-dashboard" replace />;
    }
  }

  return <>{children}</>;
};
