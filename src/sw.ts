import { precacheAndRoute } from 'workbox-precaching';

// Workbox will be used via vite-plugin-pwa; this file is optional placeholder
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    (self as any).skipWaiting();
  }
});

// Push notification handler
self.addEventListener('push', (event: any) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '情侶來電';
  const options = {
    body: data.body || '你有一個來電',
    icon: data.icon || '/icons/icon-192.png',
    data: data
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event: any) {
  event.notification.close();
  event.waitUntil(
    (self as any).clients.matchAll({ type: 'window' }).then((clientList: any[]) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return (self as any).clients.openWindow('/');
    })
  );
});