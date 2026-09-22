// Cache hors ligne pour la version web (PWA)
const C = 'stacksnap-v2', FILES = ['./', 'index.html', 'i18n.js', 'game.js', 'manifest.json', 'icon-512.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(C).then(c => c.addAll(FILES))));
self.addEventListener('fetch', e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));
