// Cache name is tied to the app version and rewritten automatically by
// scripts/sync-sw-version.mjs (run as part of `npm run verify`), because
// relying on a human to bump it by hand demonstrably failed: it sat at
// 'minadent-v3' across 61 released versions. A stale cache in a PWA
// means users keep getting an old JS bundle after a deploy, which can
// leave the app failing to load entirely when the cached HTML and the
// new assets no longer match.
const CACHE_NAME = 'minadent-v1.227.0'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  'https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css',
]

/**
 * MOD-FIX-029: the font lives on a CDN, and the fetch handler below only
 * ever answered same-origin requests — so the font CSS pre-cached above
 * was cached and then never served, and the .woff2 files it points at
 * were never cached at all. Offline (and any time the CDN is blocked,
 * which for this clinic is routine) the whole app fell back to a system
 * font. Font files never change under a pinned version, so cache-first
 * is right for them: after one successful online load the typeface keeps
 * working with no network.
 */
const FONT_ORIGINS = ['https://cdn.jsdelivr.net', 'https://fonts.gstatic.com']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  )
  self.clients.claim()
})

// Tapping a reminder notification focuses an already-open tab if one
// exists, or opens a new one — standard PWA notification-click
// behavior so the notification actually leads somewhere useful.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow('/#/reminders')
    })
  )
})

// Network-first for same-origin requests: always try to fetch the latest
// version first, and only fall back to the cache when the network fails
// (i.e. genuinely offline). This is the opposite of cache-first — it
// guarantees that a new deploy is visible on the very next load instead
// of potentially being masked by an old cached bundle indefinitely.
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  if (FONT_ORIGINS.includes(url.origin)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        // An opaque (no-cors) response is still worth caching: the
        // browser can replay it for the same request even though this
        // script cannot read it.
        if (response) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      // Nothing cached and no network: let it fail quietly so the CSS
      // fallback stack takes over instead of the page erroring.
      }).catch(() => Response.error())),
    )
    return
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(() => caches.match(request))
    )
  }
})
