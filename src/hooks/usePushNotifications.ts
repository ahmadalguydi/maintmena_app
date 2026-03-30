import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { registerPushNotifications } from '@/lib/pushNotifications';

const SESSION_KEY = 'mm_push_registered_v1';

/**
 * Initialises push notification registration once per session after login.
 * Detects platform automatically (Capacitor native / Median / Web Push).
 *
 * Mounted inside RealtimeHub so it runs for every authenticated user.
 */
export function usePushNotifications(): void {
  const { user } = useAuth();
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!user) {
      registeredRef.current = false;
      return;
    }

    // Skip if we already registered in this session for this user
    const sessionKey = `${SESSION_KEY}:${user.id}`;
    if (sessionStorage.getItem(sessionKey) === '1') {
      registeredRef.current = true;
      return;
    }

    if (registeredRef.current) return;
    registeredRef.current = true;

    // 3 s delay so the push-permission prompt doesn't stack on top of login
    const timeoutId = window.setTimeout(() => {
      registerPushNotifications(user.id)
        .then(() => sessionStorage.setItem(sessionKey, '1'))
        .catch(() => undefined);
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [user]);
}
