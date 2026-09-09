// Guestflow PWA Lab — build C
const SW_BUILD = "C";

self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Pour toute navigation dans le labo, on demande index.html
  // avec un paramètre unique lié au build du SW + timestamp.
  if (req.mode === "navigate" && url.pathname.includes("/pwa-lab/")) {
    const fresh = new URL("./index.html", self.registration.scope);
    fresh.searchParams.set("swbuild", SW_BUILD);
    fresh.searchParams.set("_ts", Date.now().toString());

    event.respondWith(fetch(fresh.toString(), {cache:"no-store"}));
    return;
  }

  event.respondWith(fetch(req, {cache:"no-store"}));
});
