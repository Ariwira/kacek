const CACHE_NAME = 'kacek-v2';

self.addEventListener('install', (event) => {
  // Pre-cache the trained data so first scan doesn't need network
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/tessdata/ind.traineddata']).catch(() => {
        // Non-fatal: if pre-cache fails, it'll be cached on first use
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  // Remove old caches
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Network-first for navigation (HTML pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for tessdata, Tesseract CDN assets, and static assets
  const isTessdata = url.pathname.endsWith('.traineddata');
  const isTesseractCDN =
    url.host.includes('cdn.jsdelivr.net') &&
    url.pathname.includes('tesseract');
  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.host.includes('fonts.googleapis') ||
    url.host.includes('fonts.gstatic');

  if (isTessdata || isTesseractCDN || isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => new Response('', { status: 408, statusText: 'Offline' }));
      })
    );
    return;
  }
});
