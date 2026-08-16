const CACHE_NAME = 'app-academica-v2';

self.addEventListener('install', event => {
    self.skipWaiting(); // Obliga al celular a usar esta nueva versión de inmediato
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(['/', '/index.html', '/style.css', '/app.js', '/manifest.json']);
        })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    // Borra la memoria de la versión 1.0
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});