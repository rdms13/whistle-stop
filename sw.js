/* Whistle Stop service worker. Built by scripts/sw-plugin.mjs, which fills in VERSION and
 * PRECACHE. Cache first for everything the app ships; the page shell for navigations.
 *
 * Updates: a new build has a new VERSION, so the browser installs it alongside the old one.
 * It waits; it takes over when every window of the app has closed (the next launch), or
 * earlier when the page asks it to (the app does that while it is hidden in the background,
 * so a phone that never quits the app still picks up the new version). The old cache is
 * deleted once the new worker is active. */
const VERSION = "035aecad33b9";
const PRECACHE = ["./","assets/index-4hV1YTO-.js","assets/index-B7gpntcC.css","assets/worker-Bxtgldc7.js","icons/apple-touch-icon.png","icons/favicon-32.png","icons/favicon.svg","icons/icon-192.png","icons/icon-512.png","icons/icon-maskable-512.png","icons/icon.svg","index.html","manifest.webmanifest"];
const CACHE = `whistle-stop-${VERSION}`;
const scopeUrl = (path) => new URL(path, self.registration.scope).href;
// Some hosts send "Vary: Origin"; module scripts are requested with an Origin header and the
// precache requests without one, so Vary must not split them. Hashed names make query
// strings irrelevant too.
const MATCH = { ignoreVary: true, ignoreSearch: true };

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // cache: 'reload' skips the HTTP cache so a fresh build is never mixed with stale files.
    await cache.addAll(PRECACHE.map((p) => new Request(scopeUrl(p), { cache: 'reload' })));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('whistle-stop-') && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const shell = (await cache.match(scopeUrl('index.html'), MATCH)) || (await cache.match(scopeUrl('./'), MATCH));
      if (shell) return shell;
      return fetch(req);
    })());
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, MATCH);
    if (hit) return hit;
    const res = await fetch(req);
    if (res.ok && res.type === 'basic') cache.put(req, res.clone());
    return res;
  })());
});
