importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCw-u1ghZgJfeXGjojHP1dHOfNu_SGrhc0",
  authDomain: "wolfpack-app-a6e70.firebaseapp.com",
  projectId: "wolfpack-app-a6e70",
  storageBucket: "wolfpack-app-a6e70.firebasestorage.app",
  messagingSenderId: "385988372173",
  appId: "1:385988372173:web:785904dd2cfdae28042b84"
});

const messaging = firebase.messaging();

// Handle background push notifications
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || 'WOLFPACK 🐺', {
    body: body || 'New activity in the pack!',
    icon: icon || '/icon.png',
    badge: '/icon.png',
    vibrate: [200, 100, 200],
    data: payload.data,
    actions: [{ action: 'open', title: 'Open App' }]
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
