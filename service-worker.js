const CACHE_NAME = 'cyberrunner-v2';
const PREVIOUS_CACHE = 'cyberrunner-v1';
const ASSETS = ['./', './index.html', './icon.png'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.delete(PREVIOUS_CACHE),
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request).then((response) => response || fetch(event.request))
    )
  );
});
