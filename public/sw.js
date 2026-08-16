/*
 * Service worker for the JACKLAW client portal.
 *
 * Its only jobs are (a) making the portal installable as a phone app and
 * (b) showing something other than the browser's dinosaur when a client
 * opens the icon with no signal. It deliberately does NOT cache anything
 * that could leak case data: /api responses and every non-GET request go
 * straight to the network, untouched.
 *
 * Bump CACHE_VERSION whenever the offline page or the precache list
 * changes — old caches are dropped on activate.
 */

const CACHE_VERSION = 'v1'
const STATIC_CACHE = `jlp-static-${CACHE_VERSION}`
const PAGE_CACHE = `jlp-pages-${CACHE_VERSION}`
const OFFLINE_URL = '/offline.html'

const PRECACHE_URLS = [
  OFFLINE_URL,
  '/logo.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key.startsWith('jlp-') && key !== STATIC_CACHE && key !== PAGE_CACHE)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

/** Immutable build output and images — safe to serve from cache first. */
function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    /\.(?:png|svg|jpg|jpeg|webp|ico|woff2?)$/.test(url.pathname)
  )
}

self.addEventListener('fetch', event => {
  const { request } = event

  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Cross-origin (fonts, Supabase, anything else) is left entirely alone.
  if (url.origin !== self.location.origin) return

  // Case data and session checks must never come from a cache.
  if (url.pathname.startsWith('/api/')) return

  // Next's client-side navigation payloads vary by router state; caching
  // them by URL would serve the wrong tree back.
  if (url.searchParams.has('_rsc')) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request))
    return
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirstAsset(request))
  }
})

/**
 * Pages: always try the network so clients see current content, fall back
 * to the last good copy of that page, then to the offline notice.
 */
async function networkFirstPage(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(PAGE_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch (err) {
    const cached = await caches.match(request)
    if (cached) return cached
    const offline = await caches.match(OFFLINE_URL)
    if (offline) return offline
    throw err
  }
}

async function cacheFirstAsset(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(STATIC_CACHE)
    cache.put(request, response.clone())
  }
  return response
}

// Lets a newly deployed worker take over without waiting for every tab to close.
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})
