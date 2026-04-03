// Service Worker — Coach Running IA PWA
const CACHE_NAME = 'coach-running-v1';

// Pages à mettre en cache pour le mode offline
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
];

// Install : pré-cacher les ressources essentielles
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate : nettoyer les anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch : stratégie Network First avec fallback cache
// Les appels API passent toujours par le réseau
// Les assets statiques utilisent le cache en fallback
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API calls : toujours réseau, jamais cache
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Firestore / Google APIs : toujours réseau
  if (url.hostname.includes('googleapis.com') || url.hostname.includes('firebaseio.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Mettre en cache les réponses réussies (GET uniquement)
        if (response.ok && event.request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback sur le cache si réseau indisponible
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // Pour les navigations, retourner la page d'accueil (SPA)
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});
