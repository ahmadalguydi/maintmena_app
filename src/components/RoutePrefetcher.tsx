import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { useAuth } from '@/hooks/useAuth';
import {
  authEntryPrefetchTasks,
  buyerCorePrefetchTasks,
  scheduleIdlePrefetch,
  sellerCorePrefetchTasks,
} from '@/lib/routePrefetch';

export function RoutePrefetcher() {
  const location = useLocation();
  const { user, userType } = useAuth();

  useEffect(() => {
    if (!user && (location.pathname.startsWith('/app/onboarding') || location.pathname === '/login' || location.pathname === '/signup')) {
      return scheduleIdlePrefetch('auth-entry', authEntryPrefetchTasks);
    }

    if (userType === 'buyer' || location.pathname.startsWith('/app/buyer')) {
      return scheduleIdlePrefetch('buyer-core', buyerCorePrefetchTasks);
    }

    if (userType === 'seller' || location.pathname.startsWith('/app/seller')) {
      return scheduleIdlePrefetch('seller-core', sellerCorePrefetchTasks);
    }

    return undefined;
  }, [location.pathname, user, userType]);

  return null;
}
