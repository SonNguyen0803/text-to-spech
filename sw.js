/**
 * Service Worker cho VocalFlow AI v2.10.0
 * Chiến lược Network-First: Luôn tải mã nguồn mới nhất từ máy chủ
 */

const CACHE_NAME = 'vocalflow-cache-v2-10-0';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Network-First: Ưu tiên mạng, chỉ fallback khi offline hoàn toàn
self.addEventListener('fetch', (e) => {
  if (e.request.url.includes('/api/')) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        return networkResponse;
      })
      .catch(() => {
        return caches.match(e.request).then((cached) => {
          return cached || caches.match('./index.html');
        });
      })
  );
});
