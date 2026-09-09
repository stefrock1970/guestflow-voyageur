// Guestflow V23.15.13 — Service Worker réseau uniquement.
// Objectif : conserver l'installation PWA sans conserver une ancienne interface.

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  const req = event.request;

  if (req.method !== 'GET') return;

  // Toujours demander le réseau. Aucun HTML/API/version n'est mis en cache.
  event.respondWith(
    fetch(req, { cache: 'no-store' })
  );
});
