importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCw-u1ghZgJfeXGjojHP1dHOfNu_SGrhc0",
  authDomain: "wolfpack-app-a6e70.firebaseapp.com",
  projectId: "wolfpack-app-a6e70",
  storageBucket: "wolfpack-app-a6e70.firebasestorage.app",
  messagingSenderId: "385988372173",
  appId: "1:385988372173:web:785904dd2cfdae28042b84"
});

const messaging = firebase.messaging();

// Handle background notifications
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || "WOLFPACK 🐺", {
    body: body || "Check in with your pack.",
    icon: "/garage.jpg",
    badge: "/garage.jpg",
    tag: "wolfpack-notif",
    data: { url: self.location.origin }
  });
});

// Tap notification → open app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow(event.notification.data?.url || '/');
    })
  );
});
