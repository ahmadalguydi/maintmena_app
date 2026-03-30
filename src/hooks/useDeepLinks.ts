/**
 * useDeepLinks.ts — Capacitor deep-link handler
 *
 * Listens for the Capacitor App `appUrlOpen` event (triggered when the OS
 * opens the app via a custom URL scheme, e.g. maintmena://app/...) and
 * navigates to the corresponding React Router path.
 *
 * On web this hook is a no-op — the browser handles URL routing natively.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function useDeepLinks() {
  const navigate = useNavigate();

  useEffect(() => {
    let cleanup: (() => void) | null = null;

    const setup = async () => {
      try {
        // Lazy-import so the web bundle is not bloated by native-only code
        const { App } = await import('@capacitor/app');

        const handle = await App.addListener('appUrlOpen', (event) => {
          try {
            // event.url looks like:  maintmena://app/seller/home
            // or for Universal Links: https://maintmena.app/app/seller/home
            const url = new URL(event.url);

            // Extract path + search from the URL and navigate
            const path = url.pathname + url.search + url.hash;
            if (path && path !== '/') {
              navigate(path, { replace: true });
            }
          } catch {
            // Malformed URL — ignore silently
          }
        });

        cleanup = () => {
          handle.remove().catch(() => { /* ignore */ });
        };
      } catch {
        // Not running on native / @capacitor/app not installed — no-op on web
      }
    };

    setup();

    return () => {
      cleanup?.();
    };
  }, [navigate]);
}
