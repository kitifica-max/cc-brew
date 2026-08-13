self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));

// ── Push notifications ────────────────────────────────────────────────────────
self.addEventListener('push', (e) => {
  const data = e.data?.json() ?? {};
  e.waitUntil(
    self.registration.showNotification(data.title ?? 'CC Controller', {
      body: data.body ?? 'Claude terminó — toca para ver la respuesta',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'claude-done',
      renotify: true,
      data: { url: self.location.origin },
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cls) => {
      const hit = cls.find(c => c.url.startsWith(self.location.origin) && 'focus' in c);
      return hit ? hit.focus() : clients.openWindow(self.location.origin);
    })
  );
});

// ── Keep-alive: responde fetch para que iOS no mate el SW ─────────────────────
self.addEventListener('fetch', () => {});
