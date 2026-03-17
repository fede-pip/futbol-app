const CACHE_NAME = 'app8-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Instalar: cachear assets estáticos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activar: limpiar caches viejos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first para Firebase/API, cache-first para assets estáticos
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Siempre ir a la red para Firebase y requests de API
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('canva')
  ) {
    return; // dejar pasar sin interceptar
  }

  // Para assets estáticos: cache-first
  if (
    event.request.method === 'GET' &&
    (url.pathname.startsWith('/icons/') ||
     url.pathname.endsWith('.js') ||
     url.pathname.endsWith('.css') ||
     url.pathname === '/' ||
     url.pathname === '/index.html')
  ) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Para todo lo demás: network-first con fallback a cache
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
