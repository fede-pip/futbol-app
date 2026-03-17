// Service Worker — App8
// Estrategia: network-first siempre, sin cachear assets con hash
// Esto evita que nuevos deploys rompan la PWA instalada

const CACHE_NAME = 'app8-shell-v1';
const SHELL = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', event => {
  self.skipWaiting(); // activar inmediatamente
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL))
      .catch(() => {}) // nunca fallar en install
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      // Limpiar caches viejos
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
      ),
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo manejar GET del mismo origen
  if (req.method !== 'GET' || url.hostname !== self.location.hostname) return;

  // Para assets con hash en el nombre (JS/CSS de Vite) — network-first, sin cachear
  // Esto evita que un deploy nuevo quede bloqueado por caché viejo
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }

  // Para navegación (HTML) — siempre ir a la red, fallback a index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Para íconos y manifest — cache-first (no cambian con los deploys)
  if (url.pathname.startsWith('/icons/') || url.pathname === '/manifest.json') {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req))
    );
    return;
  }

  // Todo lo demás — network-first
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});
