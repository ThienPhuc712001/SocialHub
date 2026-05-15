// Service Worker for Push Notifications
// This file should be placed in the public directory as sw.js

const CACHE_NAME = 'socialhub-v1'
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
]

// Install event - cache resources
self.addEventListener('install', (event: any) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache')
        return cache.addAll(urlsToCache)
      })
  )
  // Force the waiting service worker to become the active service worker
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event: any) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  // Take control of all clients
  self.clients.claim()
})

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event: any) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request)
      })
  )
})

// Push event - handle incoming push notifications
self.addEventListener('push', (event: any) => {
  console.log('Push received:', event)

  if (!event.data) {
    console.log('Push notification but no data')
    return
  }

  const data = event.data.json()
  console.log('Push data:', data)

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    image: data.image,
    tag: data.tag,
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
    data: data.data || {},
    silent: false,
    vibrate: [200, 100, 200]
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Notification click event - handle when user clicks on notification
self.addEventListener('notificationclick', (event: any) => {
  console.log('Notification click:', event)

  event.notification.close()

  const notificationData = event.notification.data
  let url = '/'

  // Determine URL based on notification type
  if (notificationData) {
    switch (notificationData.type) {
      case 'post':
        url = `/profile/${notificationData.postId}`
        break
      case 'message':
        url = `/messages`
        break
      case 'like':
      case 'comment':
        url = `/profile/${notificationData.postId}`
        break
      case 'follow':
        url = `/profile/${notificationData.followerId}`
        break
      default:
        url = '/'
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window/tab open with the target URL
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i]
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus()
          }
        }

        // If no suitable window is found, open a new one
        if (clients.openWindow) {
          return clients.openWindow(url)
        }
      })
  )
})

// Background sync for offline actions
self.addEventListener('sync', (event: any) => {
  console.log('Background sync:', event)

  if (event.tag === 'background-sync-posts') {
    event.waitUntil(syncPosts())
  }
})

async function syncPosts() {
  // This would sync any pending posts when connection is restored
  console.log('Syncing posts...')
  // Implementation would depend on your specific offline storage strategy
}