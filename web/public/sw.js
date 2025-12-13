// SONORA Push Notification Service Worker
// Custom sound and offline support

const CACHE_NAME = 'sonora-v3.8.6';

// Files to cache for offline (only files that definitely exist)
const urlsToCache = [
  '/sonora-logo.png',
  '/manifest.json',
];

// Install event - cache essential files with error handling
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Add files one by one so one failure doesn't break everything
        return Promise.allSettled(
          urlsToCache.map(url => cache.add(url).catch(() => console.warn('Failed to cache:', url)))
        );
      })
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('SW install error:', err))
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
      .catch(() => {
        // Offline fallback
        if (event.request.destination === 'document') {
          return caches.match('/');
        }
      })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  let data = {
    title: 'SONORA',
    body: 'New notification',
    icon: '/sonora-logo.png',
    badge: '/sonora-logo.png',
    tag: 'sonora-notification',
    requireInteraction: false,
    data: { url: '/' }
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/sonora-logo.png',
    badge: data.badge || '/sonora-logo.png',
    image: data.image,
    tag: data.tag || 'sonora-notification',
    requireInteraction: data.requireInteraction || false,
    data: data.data || { url: '/' },
    actions: data.actions || [],
    vibrate: [200, 100, 200],
    silent: false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
      .then(() => {
        // Play custom notification sound
        return playNotificationSound();
      })
  );
});

// Play custom notification sound
async function playNotificationSound() {
  try {
    const clients = await self.clients.matchAll({ type: 'window' });
    if (clients.length > 0) {
      // Send message to client to play sound
      clients[0].postMessage({
        type: 'PLAY_NOTIFICATION_SOUND',
        sound: NOTIFICATION_SOUND
      });
    }
  } catch (e) {
    console.warn('Could not play notification sound:', e);
  }
}

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if found
        for (const client of clientList) {
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            client.focus();
            client.postMessage({ type: 'NOTIFICATION_CLICKED', url });
            return;
          }
        }
        // Otherwise open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  // Analytics: track notification dismissed
  console.log('Notification dismissed:', event.notification.tag);
});

// Message event - handle client messages
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
