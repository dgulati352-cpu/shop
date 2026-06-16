const CACHE_NAME = 'quickshop-cache-v29';
const urlsToCache = [
  '/',
  '/index.html?v=1.1.28',
  '/styles.css?v=1.1.28',
  '/app.js?v=1.1.28',
  '/manifest.json',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  // Only handle GET requests and skip Firebase Auth / browser extension requests
  if (event.request.method !== 'GET' || 
      event.request.url.includes('/__/auth/') || 
      event.request.url.includes('identitytoolkit') ||
      !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Network First strategy
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // If we got a valid response, cache it and return
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache if network is unavailable
        return caches.match(event.request);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    clients.claim().then(() => {
      return caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      });
    })
  );
});
