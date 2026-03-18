// Service Worker for Web Push Notifications
// This file must be in the public/ directory and will be served from '/sw.js'

const CACHE_NAME = 'timetable-cache-v2';
const OFFLINE_URL = '/offline.html';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  OFFLINE_URL,
  '/icon-192.png',
  '/manifest.webmanifest'
];

// Track recently shown notifications to avoid duplicates
const recentKeys = new Map(); // key -> timestamp
function shouldSuppress(key, windowMs = 5000) {
  try {
    const now = Date.now();
    // prune
    for (const [k, ts] of Array.from(recentKeys.entries())) {
      if (now - ts > windowMs) recentKeys.delete(k);
    }
    if (recentKeys.has(key)) return true;
    recentKeys.set(key, now);
  } catch {}
  return false;
}

// Simple in-SW IndexedDB for queuing write requests when offline
const dbName = 'timetable-sw-db';
const storeName = 'request-queue';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function enqueueRequest(record) {
  return openDb().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).add(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  }));
}

function getQueuedRequests() {
  return openDb().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  }));
}

function clearRequest(id) {
  return openDb().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  }));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : undefined)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Same-origin navigations: App Shell with offline fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/index.html').then((res) => res || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // Cache-first for same-origin static assets (no HTML fallback for JS/CSS to avoid MIME errors)
  if (url.origin === self.location.origin && (url.pathname.endsWith('.css') || url.pathname.endsWith('.js') || url.pathname.endsWith('.png') || url.pathname.endsWith('.jpg') || url.pathname.endsWith('.svg') || url.pathname.endsWith('.webmanifest'))) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((resp) => {
        const respClone = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, respClone));
        return resp;
      }).catch(() => caches.match(req).then((fallback) => fallback || new Response('', { status: 504 }))))
    );
    return;
  }

  // Backend API runtime strategy
  const isApi = /\/api\//.test(url.pathname) || url.hostname.includes('onrender.com');
  if (isApi) {
    // Network-first for GET, queue writes when offline
    if (req.method === 'GET') {
      event.respondWith(
        fetch(req)
          .then((resp) => {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
            return resp;
          })
          .catch(() => caches.match(req).then((fallback) => fallback || new Response('', { status: 504 })))
      );
    } else {
      event.respondWith(
        fetch(req.clone()).catch(async () => {
          // Attempt to queue the request for background sync
          const body = req.method === 'GET' ? null : await req.clone().text().catch(() => null);
          const headers = {};
          for (const [k, v] of req.headers.entries()) headers[k] = v;
          await enqueueRequest({ url: req.url, method: req.method, headers, body });
          if (self.registration && 'sync' in self.registration) {
            try { await self.registration.sync.register('api-sync'); } catch (e) {}
          }
          return new Response(JSON.stringify({ queued: true, offline: true }), { status: 202, headers: { 'Content-Type': 'application/json' } });
        })
      );
    }
    return;
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'api-sync') {
    event.waitUntil(
      (async () => {
        const items = await getQueuedRequests();
        for (const item of items) {
          try {
            const resp = await fetch(item.url, { method: item.method, headers: item.headers, body: item.body });
            if (resp && resp.ok) {
              await clearRequest(item.id);
            }
          } catch (e) {
            // Keep in queue
          }
        }
      })()
    );
  }
});

self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push event received:', event);
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      // Fallback for plain text push messages
      console.warn('[Service Worker] Push event data was not JSON:', e);
      data = {
        title: 'Timetable Notification',
        body: event.data.text()
      };
    }
  }
  // If body is a Promise (from text()), resolve it
  Promise.resolve(data.body).then(function(body) {
    const title = data.title || 'Timetable Notification';
    const options = {
      body: body || '',
      icon: data.icon || '/icon-192.png',
      badge: data.badge || '/badge-72.png',
      data: data.data || {},
      actions: data.actions || [],
      requireInteraction: true,
      // use a stable tag to prevent multiple toasts for same announcement
      tag: (data.tag || data.dedupeKey || `${title}|${typeof body === 'string' ? body : ''}`)
    };
    // suppress duplicates within a short window
    const key = options.tag;
    if (shouldSuppress(key)) {
      return; // do not show another identical notification immediately
    }
    console.log('[Service Worker] Showing notification:', title, options);
    const showPromise = self.registration.showNotification(title, options);
    // Also broadcast to all clients so UI can update its in-app list immediately
    const broadcastPromise = clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      const payload = {
        id: Date.now(),
        type: (data.type || 'announcement'),
        title: title,
        message: typeof body === 'string' ? body : '',
        timestamp: new Date().toISOString(),
        isRead: false
      };
      clientList.forEach(function(client) {
        try { client.postMessage({ type: 'notification', payload, source: 'sw' }); } catch (e) {}
      });
    });
    event.waitUntil(Promise.all([showPromise, broadcastPromise]));
  });
});

self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification click:', event);
  event.notification.close();
  const urlToOpen = event.notification.data && event.notification.data.url;
  if (urlToOpen) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  }
});
