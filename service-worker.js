const CACHE_NAME = 'guestflow-v23-15-8-static-v1';

const STATIC_ASSETS = [
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
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Permet à la page d'activer immédiatement une nouvelle version.
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET') return;

  // API, token et navigation : toujours le réseau.
  // Ainsi index.html ne reste jamais bloqué sur une ancienne version.
  if (
    req.mode === 'navigate' ||
    url.pathname.endsWith('/version.json') ||
    url.pathname.endsWith('/index.html') ||
    url.hostname.includes('script.google.com') ||
    url.searchParams.has('api') ||
    url.searchParams.has('token')
  ) {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
    );
    return;
  }

  // manifest + icônes : cache rapide, avec mise à jour réseau en arrière-plan.
  if (STATIC_ASSETS.some(asset => url.pathname.endsWith(asset.replace('./', '/')))) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        const cached = await cache.match(req);
        const networkPromise = fetch(req, { cache: 'no-store' })
          .then(resp => {
            if (resp && resp.ok) cache.put(req, resp.clone());
            return resp;
          })
          .catch(() => null);

        return cached || networkPromise;
      })
    );
    return;
  }

  // Tout le reste : réseau d'abord, sans conserver une ancienne page.
  event.respondWith(
    fetch(req, { cache: 'no-store' }).catch(() => caches.match(req))
  );
});
