/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';
import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

declare let self: ServiceWorkerGlobalScope;

// Precache resources
precacheAndRoute((self as any).__WB_MANIFEST);

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

const firebaseConfig = {
  apiKey: "AIzaSyBKUSOSv4CbijaUbSvvZeCAIY29K_t4eFs",
  authDomain: "realtimealarm.firebaseapp.com",
  databaseURL: "https://realtimealarm-default-rtdb.firebaseio.com",
  projectId: "realtimealarm",
  storageBucket: "realtimealarm.firebasestorage.app",
  messagingSenderId: "502005117952",
  appId: "1:502005117952:web:0e90301fcd5f0b2da6d4e5",
  measurementId: "G-M3W6MQGKNF"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

onBackgroundMessage(messaging, (payload) => {
  console.log('[sw.ts] Received background message ', payload);
  const notificationTitle = payload.notification?.title || '情侶來電';
  const notificationOptions = {
    body: payload.notification?.body || '你有一個來電',
    icon: '/icons/pwa-192x192.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function(event: any) {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList: any[]) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return self.clients.openWindow('/');
    })
  );
});