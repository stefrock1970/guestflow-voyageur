// Guestflow PWA Lab — service worker STABLE.
// Il ne gère aucune version d'interface et ne provoque aucun rechargement.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  event.respondWith(fetch(req, { cache: "no-store" }));
});
