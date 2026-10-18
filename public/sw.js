const CACHE_NAME = 'byte-back-static-v1';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// 네트워크 요청과 인증·자료실 응답은 캐시하지 않습니다.
self.addEventListener('fetch', event => {
  // 의도적으로 캐시 응답을 가로채지 않습니다.
});
