/* Guestflow — service-worker.js
   V2026-09-13 : injection contrôlée du pont DATAtourisme.
*/
const CACHE_NAME = 'guestflow-v2026-09-13-tourisme';

self.addEventListener('install', event => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  event.respondWith(
    fetch(request, {cache:'no-store'}).then(async response => {
      if (!response || !response.ok) return response;

      const accept = request.headers.get('accept') || '';
      const isHtml = request.mode === 'navigate' || accept.includes('text/html');
      if (!isHtml) return response;

      const type = response.headers.get('content-type') || '';
      if (!type.includes('text/html')) return response;

      let html = await response.text();

      if (!html.includes('tourisme-live.js')) {
        const tag = '<script src="./tourisme-live.js?v=20260913"></script>';
        html = html.replace(/<\/body>/i, tag + '</body>');
      }

      const headers = new Headers(response.headers);
      headers.delete('content-length');
      headers.delete('content-encoding');
      headers.set('content-type','text/html; charset=utf-8');

      const modified = new Response(html, {
        status: response.status,
        statusText: response.statusText,
        headers
      });

      const copy = modified.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(()=>{});

      return modified;
    }).catch(() => caches.match(request))
  );
});
