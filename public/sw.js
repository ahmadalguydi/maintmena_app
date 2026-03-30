// Service Worker for MaintMENA
// Handles push notifications and offline caching

const CACHE_NAME = 'maintmena-v3';
const ASSETS_TO_PRECACHE = ['/', '/index.html', '/manifest.json'];

// ── Install: precache shell ───────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_PRECACHE)),
  );
  self.skipWaiting();
});

// ── Activate: purge old caches ────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      ),
    ),
  );
  self.clients.claim();
});

// ── Fetch: stale-while-revalidate for static assets, network-first for API ───
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests (Supabase, Mapbox, FCM, etc.)
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // Skip Vite HMR & Chrome extensions
  if (url.pathname.startsWith('/@') || url.protocol === 'chrome-extension:') return;

  // For HTML navigation: network-first, fallback to cached /index.html (SPA shell)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache a fresh copy of the shell
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match('/index.html').then((cached) => cached || Response.error()),
        ),
    );
    return;
  }

  // For JS/CSS/fonts/images: cache-first (they are content-hashed by Vite)
  const isStaticAsset =
    /\.(js|css|woff2?|ttf|eot|png|jpg|jpeg|svg|gif|webp|ico)(\?.*)?$/.test(url.pathname);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      }),
    );
  }
  // All other same-origin requests go straight to network (no caching)
});

// ── Push notification received (background/foreground) ───────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: 'MaintMENA', body: event.data.text() };
  }

  const title = data.title || 'MaintMENA';
  const options = {
    body: data.body || 'You have a new update.',
    icon: '/icon-192.png',
    badge: '/icon-96.png',
    tag: data.tag || 'maintmena-push',
    renotify: true,
    data: { url: data.url || '/app/buyer/home' },
    dir: data.dir || 'auto',
    vibrate: [100, 50, 100],
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification clicked ──────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing tab if open
        for (const client of clientList) {
          if ('focus' in client) {
            void client.focus();
            void client.navigate(targetUrl);
            return;
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      }),
  );
});
