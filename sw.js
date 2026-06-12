// Bump CACHE when you change cached assets. HTML is network-first so edits show up
// immediately when online even if you forget to bump this; static assets are cache-first.
const CACHE = "chargers-v3";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  const isNav = req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html");

  if (isNav) {
    // Network-first for the page: always fresh online, fall back to cache offline.
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put("./index.html", copy)).catch(() => {}); }
        return res;
      }).catch(() => caches.match(req).then(hit => hit || caches.match("./index.html")))
    );
    return;
  }

  // Cache-first for static assets; only cache clean same-origin 200s.
  e.respondWith(
    caches.match(req).then(hit =>
      hit || fetch(req).then(res => {
        if (res && res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => hit)
    )
  );
});
