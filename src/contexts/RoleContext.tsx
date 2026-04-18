import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';

interface RoleContextType {
  currentRole: 'buyer' | 'seller' | null;
  availableRoles: ('buyer' | 'seller')[];
  switchRole: (role: 'buyer' | 'seller') => void;
  intendedRole: 'buyer' | 'seller' | null;
  setIntendedRole: (role: 'buyer' | 'seller' | null) => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  const { userType, loading } = useAuth();
  const [currentRole, setCurrentRole] = useState<'buyer' | 'seller' | null>(null);
  // Initialize intendedRole from localStorage (persists across page refreshes)
  const [intendedRole, setIntendedRole] = useState<'buyer' | 'seller' | null>(() => {
    try {
      const stored = localStorage.getItem('intendedRole');
      if (stored === 'buyer' || stored === 'seller') return stored;
    } catch { /* Safari private browsing */ }
    return null;
  });
  const navigate = useNavigate();
  const location = useLocation();

  // Sync intendedRole to localStorage whenever it changes
  useEffect(() => {
    try {
      if (intendedRole) {
        localStorage.setItem('intendedRole', intendedRole);
      } else {
        localStorage.removeItem('intendedRole');
      }
    } catch { /* Safari private browsing */ }
  }, [intendedRole]);

  // Determine available roles based on user type
  const availableRoles: ('buyer' | 'seller')[] = userType === 'admin'
    ? ['buyer', 'seller']
    : userType ? [userType === 'admin' ? 'buyer' : userType] : [];

  // Initialize role from user type - prioritize userType over URL
  useEffect(() => {
    if (!loading && userType) {
      // Admins can access both buyer and seller routes — don't redirect them
      if (userType === 'admin') {
        // Determine role from current path for admins
        if (location.pathname.startsWith('/app/seller')) {
          setCurrentRole('seller');
        } else {
          setCurrentRole('buyer');
        }
        return;
      }

      const determinedRole: 'buyer' | 'seller' = userType;
      setCurrentRole(determinedRole);

      // Only redirect if user is on the EXACT wrong role's base routes
      // Use startsWith with exact path segments to avoid false matches
      // e.g., /app/buyer-feedback should NOT be rewritten
      if (userType === 'seller' && location.pathname.startsWith('/app/buyer/')) {
        const correctedPath = location.pathname.replace('/app/buyer/', '/app/seller/');
        navigate(correctedPath, { replace: true });
      } else if (userType === 'buyer' && location.pathname.startsWith('/app/seller/')) {
        const correctedPath = location.pathname.replace('/app/seller/', '/app/buyer/');
        navigate(correctedPath, { replace: true });
      }
    }
  }, [userType, loading, location.pathname, navigate]);

  const switchRole = (role: 'buyer' | 'seller') => {
    if (availableRoles.includes(role)) {
      setCurrentRole(role);
      // Store preference
      localStorage.setItem('preferredRole', role);
      navigate(`/app/${role}/home`);
    }
  };

  return (
    <RoleContext.Provider value={{ 
      currentRole, 
      availableRoles, 
      switchRole, 
      intendedRole, 
      setIntendedRole 
    }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};
