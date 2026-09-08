const CACHE_NAME = 'guestflow-v23-15-1-shell-v1';
const STATIC_ASSETS = [
  './',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET') return;

  // Ne jamais mettre en cache les appels Apps Script / API / JSONP.
  if (url.hostname.includes('script.google.com') ||
      url.searchParams.has('api') ||
      url.searchParams.has('token')) {
    event.respondWith(fetch(req));
    return;
  }

  // Navigation : réseau d'abord, cache de secours.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('./'))
    );
    return;
  }

  // Ressources statiques : cache d'abord.
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(resp => {
      const copy = resp.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
      return resp;
    }))
  );
});
