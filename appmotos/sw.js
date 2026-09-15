
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open('oficina-v1').then((cache) => cache.addAll(['./', './index.html', './css/styles.css', './js/app.js'])));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then((res) => res || fetch(e.request)));
});
