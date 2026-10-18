self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

// 인증 정보와 자료실 응답을 캐시하지 않습니다.
// 네트워크 요청을 가로채지 않습니다.
