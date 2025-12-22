const CACHE_NAME = 'taskbot-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/api.js',
  '/auth-guard.js',
  '/nav-loader.js',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (e) => {
  // Для API запитів - завжди мережа
  if (e.request.url.includes('/api/')) {
    return; 
  }

  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});