// Service worker — network-first, enables PWA install
// API routes and external URLs are never cached so data is always fresh

const CACHE = 'senhuang-shell-v1'

const PRECACHE = ['/']

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  // Remove old caches
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return

  const url = new URL(e.request.url)

  // Never intercept API calls — always need live data
  if (url.pathname.startsWith('/api/')) return
  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return

  // Network first: try network, fall back to cache
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(e.request, clone))
        }
        return res
      })
      .catch(() => caches.match(e.request))
  )
})
