const CACHE = 'runflex-v2';
const ASSETS = [
  '/strengthplanmarathone/manifest.json',
  '/strengthplanmarathone/icon.png',
];

// Install — cache static assets, take over immediately
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// Activate — clean up old caches, claim clients
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy:
// - Supabase API calls: always network, never cache
// - HTML pages (index / navigation): network-first so updates show immediately
// - Other static assets: cache-first for speed, fall back to network
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Never touch Supabase
  if (url.includes('supabase.co')) return;

  const isHTML = e.request.mode === 'navigate' ||
                 url.endsWith('/') ||
                 url.endsWith('index.html') ||
                 url.endsWith('/strengthplanmarathone');

  if (isHTML) {
    // Network-first for the app itself so new versions load right away
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first for static assets (icon, manifest)
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).then(res => {
        if (e.request.method === 'GET' && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
    )
  );
});
