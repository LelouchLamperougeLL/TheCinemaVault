/* ═══════════════════════════════════════════════════════════
   SERVICE WORKER — The Cinephile's Vault PWA
   Strategy: Cache-first for static assets, network-first for
   external resources (TMDB images, Google Fonts).
   ═══════════════════════════════════════════════════════════ */

const CACHE_NAME = 'cinevault-v10';
const STATIC_ASSETS = [
  './',
  './index.html',
  './movies.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './favicon.png'
];

// ─── Install: Pre-cache core shell ─────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Pre-caching app shell');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Activate immediately instead of waiting for old tabs to close
  self.skipWaiting();
});

// ─── Activate: Clean up old caches ─────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          })
      )
    )
  );
  // Take control of all open clients immediately
  self.clients.claim();
});

// ─── Fetch: Serve from cache, fall back to network ─────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // ── Strategy 1: Cache-first for local/static assets ──
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          // Don't cache error responses
          if (!response || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        });
      }).catch(() => {
        // Offline fallback for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      })
    );
    return;
  }

  // ── Strategy 2: Network-first for external resources ──
  // (TMDB images, Google Fonts, YouTube thumbnails, etc.)
  event.respondWith(
    fetch(request).then(response => {
      if (!response || response.status !== 200 || response.type === 'opaque') {
        // For opaque responses (cross-origin), cache them as-is
        if (response && response.type === 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }
      const clone = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
      return response;
    }).catch(() => {
      // If network fails, try cache
      return caches.match(request);
    })
  );
});
