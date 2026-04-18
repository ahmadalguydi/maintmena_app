/**
 * useDeepLinks.ts — Capacitor deep-link handler
 *
 * Handles two cases:
 *   1. Warm start: app is already running, OS opens it via a custom URL scheme.
 *   2. Cold start: app was not running, OS launches it with a deep-link URL.
 *      `App.getLaunchUrl()` is called after registering the listener to catch
 *      any URL that arrived before the listener was attached.
 *
 * On web this hook is a no-op — the browser handles URL routing natively.
 *
 * Expected URL formats:
 *   maintmena://localhost/app/seller/home   (Capacitor Android/iOS)
 *   https://maintmena.app/app/seller/home   (Universal / App Links)
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export function useDeepLinks() {
  const navigate = useNavigate();
  // Keep a stable ref to navigate so the async callback never goes stale
  const navigateRef = useRef(navigate);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);

  useEffect(() => {
    let cleanup: (() => void) | null = null;

    const handleUrl = (rawUrl: string) => {
      try {
        const url = new URL(rawUrl);
        const path = url.pathname + url.search + url.hash;
        if (path && path !== '/') {
          navigateRef.current(path, { replace: true });
        }
      } catch {
        // Malformed URL — ignore silently
      }
    };

    const setup = async () => {
      try {
        // Lazy-import so the web bundle is not bloated by native-only code
        const { App } = await import('@capacitor/app');

        // Register listener for warm-start deep links
        const handle = await App.addListener('appUrlOpen', (event) => {
          handleUrl(event.url);
        });

        // Handle cold-start deep link: the URL that launched the app
        // (may have fired before the listener above was ready)
        const launchResult = await App.getLaunchUrl();
        if (launchResult?.url) {
          handleUrl(launchResult.url);
        }

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
  // Intentionally empty — runs once on mount, navigateRef keeps navigate current
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
