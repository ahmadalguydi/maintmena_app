import { useSyncExternalStore } from 'react';

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}

function getSnapshot() {
  return document.documentElement.classList.contains('dark');
}

/** Reactive hook that returns true when .dark is on <html> */
export function useDarkMode(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
