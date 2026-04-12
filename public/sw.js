const CACHE_NAME = "sen-trajet-v1";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  // Ne pas intercepter les requêtes non http(s) (ex. chrome-extension://)
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // API calls and Supabase: network-first
  if (
    url.pathname.startsWith("/api") ||
    url.hostname.includes("supabase")
  ) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Ne mettre en cache que les requêtes http/https (pas chrome-extension, etc.)
  const isCacheableRequest =
    url.protocol === "http:" || url.protocol === "https:";

  function safePut(cache, req, response) {
    if (!isCacheableRequest) return Promise.resolve();
    return cache.put(req, response);
  }

  // Static assets: cache-first
  if (
    url.pathname.startsWith("/_next/static") ||
    url.pathname.startsWith("/icons") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".svg")
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => safePut(cache, request, clone));
            return response;
          })
      )
    );
    return;
  }

  // Pages: stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => safePut(cache, request, clone));
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
