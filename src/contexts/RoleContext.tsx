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
  const [intendedRole, setIntendedRole] = useState<'buyer' | 'seller' | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Determine available roles based on user type
  const availableRoles: ('buyer' | 'seller')[] = userType === 'admin' 
    ? ['buyer', 'seller'] 
    : userType ? [userType] : [];

  // Initialize role from user type - prioritize userType over URL
  useEffect(() => {
    if (!loading && userType) {
      // Use userType as source of truth
      const determinedRole: 'buyer' | 'seller' = userType === 'admin' ? 'buyer' : userType;
      setCurrentRole(determinedRole);
      
      // Redirect if user is on wrong role's routes
      if (userType === 'seller' && location.pathname.includes('/app/buyer')) {
        const correctedPath = location.pathname.replace('/app/buyer', '/app/seller');
        navigate(correctedPath, { replace: true });
      } else if ((userType === 'buyer' || userType === 'admin') && location.pathname.includes('/app/seller')) {
        const correctedPath = location.pathname.replace('/app/seller', '/app/buyer');
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
