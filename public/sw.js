const CACHE_NAME = "sen-trajet-v2";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
];

function offlineResponse(body, status) {
  return new Response(body, {
    status: status ?? 503,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

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
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  // Laisser le navigateur gérer WebSocket (Realtime Supabase, etc.)
  if (url.protocol === "wss:" || url.protocol === "ws:") return;
  const upgrade = request.headers.get("Upgrade");
  if (upgrade && upgrade.toLowerCase() === "websocket") return;

  // API calls and Supabase: network-first, toujours une Response valide
  if (
    url.pathname.startsWith("/api") ||
    url.hostname.includes("supabase")
  ) {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then(
          (cached) => cached ?? offlineResponse("Réseau indisponible.", 503)
        )
      )
    );
    return;
  }

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
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => safePut(cache, request, clone));
            return response;
          })
          .catch(() => offlineResponse("Ressource indisponible hors ligne.", 503));
      })
    );
    return;
  }

  // Pages: stale-while-revalidate — ne jamais résoudre avec undefined
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => safePut(cache, request, clone));
          return response;
        })
        .catch(() => cached);

      if (cached) {
        void networkFetch.catch(() => {});
        return Promise.resolve(cached);
      }

      return networkFetch.then((r) =>
        r instanceof Response
          ? r
          : offlineResponse("Réseau indisponible. Rechargez la page.", 503)
      );
    })
  );
});
