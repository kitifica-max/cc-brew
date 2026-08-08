// ponytail: minimal SW para PWA installability — sin cache offline
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));
