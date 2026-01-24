const CACHE_NAME = "rtt-static-v1";
const PRECACHE_URLS = ["/", "/index.html", "/vite.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) return caches.delete(key);
            return null;
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.method !== "GET") return;

  const url = new URL(req.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  // Avoid interfering with Vite dev server and module/HMR requests.
  // Even though SW isn't registered in DEV anymore, this also protects
  // users who still have an older SW controlling the page.
  const p = url.pathname;
  if (
    p.startsWith("/src/") ||
    p.startsWith("/@vite/") ||
    p.startsWith("/@react-refresh") ||
    p.startsWith("/node_modules/") ||
    p.startsWith("/@fs/")
  ) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseToCache);
          });

          return response;
        })
        .catch(() => {
          if (req.mode === "navigate") {
            return caches.match("/index.html");
          }

          // For non-navigation requests, return a safe fallback response
          // instead of undefined (which can break module loading).
          return new Response("", {
            status: 504,
            headers: { "Content-Type": "text/plain" },
          });
        });
    })
  );
});
