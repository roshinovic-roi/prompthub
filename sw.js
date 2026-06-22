// PromptHub Service Worker
const CACHE_NAME = 'prompthub-v1';
const APP_SHELL = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle same-origin GET requests. Everything else (Supabase, Anthropic
  // proxy, POST/PATCH/DELETE) must always go straight to the network untouched.
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Network-first for the app shell itself so users always get the latest
  // version when online; fall back to cache when offline.
  if (url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  // Cache-first for static assets (icons, manifest).
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});
