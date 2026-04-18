import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import {
  clearPushNotificationContext,
  configurePushNotifications,
  registerPushNotifications,
  unregisterPushNotifications,
} from '@/lib/pushNotifications';

const SESSION_KEY = 'mm_push_registered_v1';

/**
 * Initialises push notification registration once per session after login.
 * Detects platform automatically (Capacitor native / Median / Web Push).
 *
 * Mounted inside RealtimeHub so it runs for every authenticated user.
 */
export function usePushNotifications(): void {
  const { user, userType, loading } = useAuth();
  const navigate = useNavigate();
  const registeredRef = useRef(false);
  const previousUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      if (previousUserIdRef.current) {
        sessionStorage.removeItem(`${SESSION_KEY}:${previousUserIdRef.current}`);
        void unregisterPushNotifications();
      }

      registeredRef.current = false;
      previousUserIdRef.current = null;
      clearPushNotificationContext();
      return;
    }

    previousUserIdRef.current = user.id;

    configurePushNotifications({
      userId: user.id,
      userType: userType === 'seller' ? 'seller' : 'buyer',
      onNavigate: (url) => navigate(url),
    });

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
        .then((success) => {
          if (success) {
            sessionStorage.setItem(sessionKey, '1');
          } else {
            registeredRef.current = false;
          }
        })
        .catch(() => undefined);
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [loading, navigate, user, userType]);
}
