/* ═══════════════════════════════════════════════════════════
   SERVICE WORKER — The Cinephile's Vault PWA
   Strategy: Stale-While-Revalidate for local assets.
   No manual version bumping needed — the SW auto-refreshes
   the cache on every activation by re-fetching all static
   assets from the network (bypassing browser cache).
   ═══════════════════════════════════════════════════════════ */

const CACHE_NAME = 'cinevault-static';
const STATIC_ASSETS = [
  './',
  './index.html',
  './movies.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './favicon.png',
  './site_logo.png'
];

// ─── Install: Pre-cache core shell ─────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Pre-caching app shell');
      // Use { cache: 'no-store' } so we always get fresh copies on install
      return Promise.all(
        STATIC_ASSETS.map(url =>
          fetch(url, { cache: 'no-store' })
            .then(response => {
              if (response && response.status === 200) {
                return cache.put(url, response);
              }
            })
            .catch(err => console.warn('[SW] Failed to cache on install:', url, err))
        )
      );
    })
  );
  // Activate immediately instead of waiting for old tabs to close
  self.skipWaiting();
});

// ─── Activate: Re-fetch all static assets to pick up any ───
// ─── changes pushed to GitHub — no version bump needed.  ───
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Refreshing cache for all static assets');
      return Promise.all(
        STATIC_ASSETS.map(url =>
          fetch(url, { cache: 'no-store' })
            .then(response => {
              if (response && response.status === 200) {
                console.log('[SW] Updated cache for:', url);
                return cache.put(url, response);
              }
            })
            .catch(err => console.warn('[SW] Could not refresh (offline?):', url, err))
        )
      );
    }).then(() => self.clients.claim())
  );
});

// ─── Fetch: Stale-While-Revalidate for local assets ────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // ── Strategy 1: Stale-While-Revalidate for local/static assets ──
  // Serve from cache immediately for speed, then fetch fresh copy
  // in the background and update cache for the NEXT visit.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(request).then(cached => {
          // Fetch a fresh copy in the background regardless
          const networkFetch = fetch(request, { cache: 'no-store' })
            .then(response => {
              if (response && response.status === 200) {
                cache.put(request, response.clone());
              }
              return response;
            })
            .catch(() => null);

          // Return cached version instantly if available, otherwise wait for network
          return cached || networkFetch.then(resp => resp || caches.match('./index.html'));
        })
      )
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
