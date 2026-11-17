/* Static files only. No API responses, food prices, identity, orders or payments. */
const CONFIG = { version:'unbuilt', precache:['/offline.html'], assets:[] }; // BUILD_CONFIG
const PREFIX = 'japz-grill-shell-';
const CACHE = PREFIX + CONFIG.version;
const allowed = new Set(CONFIG.assets);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CONFIG.precache)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => (key.startsWith(PREFIX) || key.startsWith('japz-food-shell-')) && key !== CACHE).map(key => caches.delete(key)))));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || request.method !== 'GET') return;
  // Explicit bypass also prevents HTTP cache reuse for same-origin APIs.
  if (url.pathname.startsWith('/api/')) { event.respondWith(fetch(request, { cache:'no-store' })); return; }
  const ordering = /^\/(japz|order)(\/|$)/.test(url.pathname);
  if (request.mode === 'navigate' && ordering) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request, { cache:'no-store' });
        // A static host with an incomplete SPA rewrite can still reopen an
        // already-installed storefront. Unknown routes are handled by React.
        if (response.status === 404) return await caches.match('/index.html', { cacheName:CACHE }) || response;
        return response;
      } catch {
        return await caches.match('/offline.html', { cacheName:CACHE }) || new Response('You are offline. Reconnect to load today’s menu.', { status:503, headers:{ 'Content-Type':'text/plain' } });
      }
    })());
    return;
  }
  if (url.search || !allowed.has(url.pathname) || request.headers.has('Authorization')) return;
  event.respondWith((async () => {
    const cached = await caches.match(request, { cacheName:CACHE });
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      const cache = await caches.open(CACHE); await cache.put(request, response.clone());
    }
    return response;
  })());
});
