const CACHE_NAME = 'cyberrunner-v1';
// Liste des fichiers à sauvegarder pour le mode hors-ligne
const ASSETS = [
  './',
  './index.html',
  './icon.png' // Ton icône
];

// Installation du Service Worker et mise en cache
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Interception des requêtes pour charger le jeu depuis le cache sans internet
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
