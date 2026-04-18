// Service Worker for MaintMENA
// Handles push notifications + careful offline caching.
//
// CACHE STRATEGY — important:
//   • Bump CACHE_VERSION on every deploy-shaping change to this file.
//     The activate handler deletes every cache whose name doesn't match
//     CACHE_NAME, so bumping the version purges old precache entries
//     (stale index.html, stale hashed chunks) in a single step.
//
//   • index.html + manifest.json are NETWORK-ONLY (never cached).
//     This is the single fix for "old UI shows up on a fresh deploy":
//     the HTML shell ALWAYS reflects the latest deploy's asset hashes,
//     so we can't load an old bundle via a stale shell.
//
//   • Hashed static assets (.js/.css/fonts/images) are cache-first,
//     which is safe because Vite gives them content-addressed URLs.
//
//   • Cross-origin (Supabase, Mapbox, FCM) is never touched by the SW.

// NOTE: Bump the integer suffix on EVERY deploy that changes caching
// behavior or needs to flush stale entries. The date suffix makes it
// easy to read in DevTools (Application → Cache Storage).
const CACHE_VERSION = 'v4-2026-04-18';
const CACHE_NAME = `maintmena-${CACHE_VERSION}`;
const APP_ICON =
  'https://storage.googleapis.com/gpt-engineer-file-uploads/58avFXkGlXebFRFWQGQlYqeB9VG2/uploads/1760781779745-MaintMENA_Icon_NB.png';

// ── Install: take over immediately ───────────────────────────────────────────
self.addEventListener('install', (event) => {
  // No precache — we don't want a stale /index.html pinned at install time.
  // skipWaiting so a newly-installed SW doesn't sit in 'waiting' forever
  // behind open tabs served by the old SW.
  self.skipWaiting();
});

// ── Activate: purge EVERY cache that isn't the current version ───────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      );
      // Also nuke any runtime-cached Response bodies in the active cache
      // that reference the old HTML shell URL — defensive cleanup for users
      // upgrading from a previous SW that cached '/' and '/index.html'.
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.delete('/');
        await cache.delete('/index.html');
        await cache.delete('/manifest.json');
      } catch {/* swallow */}
      await self.clients.claim();
    })(),
  );
});

// ── Client → SW messaging: allow page to force an immediate activation ──────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Fetch: network-only for the shell, cache-first for hashed assets ────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/@') || url.protocol === 'chrome-extension:') return;

  // SHELL: /, /index.html, /manifest.json, any navigation — network-only.
  // We do NOT cache these. That guarantees that every page load sees the
  // latest asset hashes and we can never boot an old bundle.
  const isShell =
    request.mode === 'navigate'
    || url.pathname === '/'
    || url.pathname === '/index.html'
    || url.pathname === '/manifest.json';

  if (isShell) {
    event.respondWith(
      fetch(request, { cache: 'no-store' }).catch(() =>
        // Only fall back to cache if the network fetch genuinely fails
        // (offline). A cached shell is better than a broken page, but
        // we won't cache it ourselves on success.
        caches.match('/index.html').then((cached) => cached || Response.error()),
      ),
    );
    return;
  }

  // HASHED STATIC: Vite content-hashes these, so cache-first is safe.
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
  // Other same-origin requests go straight to network.
});

// ── Push notifications ───────────────────────────────────────────────────────
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
    icon: data.icon || APP_ICON,
    badge: data.badge || APP_ICON,
    tag: data.tag || 'maintmena-push',
    renotify: true,
    data: { url: data.url || '/app/buyer/home' },
    dir: data.dir || 'auto',
    vibrate: [100, 50, 100],
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click handling ──────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            void client.focus();
            void client.navigate(targetUrl);
            return;
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      }),
  );
});
