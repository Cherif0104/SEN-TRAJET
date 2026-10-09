const CACHE = "sentrajet-live-v1";
const OFFLINE = "/offline";
const APP_SHELL = ["/", OFFLINE, "/login", "/signup", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const cachedResponse = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, cachedResponse));
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match(OFFLINE)))
    );
    return;
  }

  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const cachedResponse = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, cachedResponse));
          }
          return response;
        })
    )
  );
});
