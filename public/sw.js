// Service Worker pour Oh Sheet! PWA
// Stratégie: Cache First pour assets, Network First pour API, Offline First pour données

const CACHE_NAME = 'oh-sheet-v1';
const OFFLINE_CACHE = 'oh-sheet-offline-v1';
const API_CACHE = 'oh-sheet-api-v1';

// Ressources à mettre en cache immédiatement
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // Next.js génère des noms de chunks dynamiques, on les gèrera différemment
];

// Stratégies de cache par pattern d'URL
const CACHE_STRATEGIES = {
  // Assets statiques: Cache First
  static: /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/,

  // Pages: Network First avec fallback
  pages: /^\/(?:dashboard|games|admin|auth)/,

  // API: Network First avec cache court
  api: /^\/api\//,

  // Santé: Network Only (pas de cache)
  health: /^\/api\/health/
};

// Installation du SW
self.addEventListener('install', event => {
  console.log('🔧 Service Worker: Installing...');

  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      try {
        // Cache des assets de base
        await cache.addAll(STATIC_ASSETS);
        console.log('✅ Service Worker: Static assets cached');
      } catch (error) {
        console.error('❌ Service Worker: Error caching static assets:', error);
      }

      // Force l'activation immédiate
      await self.skipWaiting();
    })()
  );
});

// Activation du SW
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker: Activating...');

  event.waitUntil(
    (async () => {
      // Nettoie les anciens caches
      const cacheNames = await caches.keys();
      const oldCaches = cacheNames.filter(name =>
        name.startsWith('oh-sheet-') &&
        ![CACHE_NAME, OFFLINE_CACHE, API_CACHE].includes(name)
      );

      await Promise.all(
        oldCaches.map(name => caches.delete(name))
      );

      // Prend le contrôle de tous les clients
      await self.clients.claim();
      console.log('✅ Service Worker: Activated and controlling clients');
    })()
  );
});

// Gestion des requêtes
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore les requêtes non-HTTP
  if (!url.protocol.startsWith('http')) return;

  // Ignore les requêtes vers d'autres domaines
  if (url.origin !== self.location.origin) return;

  // Détermine la stratégie en fonction de l'URL
  if (CACHE_STRATEGIES.health.test(url.pathname)) {
    // Health check: Network Only
    event.respondWith(fetch(request));
    return;
  }

  if (CACHE_STRATEGIES.api.test(url.pathname)) {
    // API: Network First avec cache court
    event.respondWith(handleApiRequest(request));
    return;
  }

  if (CACHE_STRATEGIES.static.test(url.pathname)) {
    // Assets statiques: Cache First
    event.respondWith(handleStaticRequest(request));
    return;
  }

  if (CACHE_STRATEGIES.pages.test(url.pathname) || url.pathname === '/') {
    // Pages: Network First avec fallback offline
    event.respondWith(handlePageRequest(request));
    return;
  }

  // Par défaut: Network First
  event.respondWith(handleDefaultRequest(request));
});

// Stratégie pour les requêtes API
async function handleApiRequest(request) {
  const cacheName = API_CACHE;

  try {
    // Essaie le réseau d'abord
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache seulement les GET et pour une durée limitée
      if (request.method === 'GET') {
        const cache = await caches.open(cacheName);
        const responseClone = networkResponse.clone();

        // Ajoute un header d'expiration (5 minutes)
        const headers = new Headers(responseClone.headers);
        headers.set('sw-cached-at', Date.now().toString());
        headers.set('sw-cache-ttl', (5 * 60 * 1000).toString()); // 5 min

        const cachedResponse = new Response(responseClone.body, {
          status: responseClone.status,
          statusText: responseClone.statusText,
          headers
        });

        cache.put(request, cachedResponse);
      }

      return networkResponse;
    }

    throw new Error(`Network response not ok: ${networkResponse.status}`);

  } catch (error) {
    console.log('🔄 API request failed, trying cache:', request.url);

    // Fallback vers le cache
    const cachedResponse = await getCachedResponse(request, cacheName);
    if (cachedResponse) {
      // Vérifie si le cache n'est pas expiré
      const cachedAt = cachedResponse.headers.get('sw-cached-at');
      const ttl = cachedResponse.headers.get('sw-cache-ttl');

      if (cachedAt && ttl) {
        const age = Date.now() - parseInt(cachedAt);
        if (age < parseInt(ttl)) {
          console.log('✅ Serving from API cache:', request.url);
          return cachedResponse;
        }
      }
    }

    // Pas de cache valide, retourne une réponse offline
    return createOfflineResponse(request);
  }
}

// Stratégie pour les assets statiques
async function handleStaticRequest(request) {
  // Cache First
  const cachedResponse = await getCachedResponse(request, CACHE_NAME);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('❌ Static asset unavailable:', request.url);
    return new Response('Asset unavailable offline', { status: 404 });
  }
}

// Stratégie pour les pages
async function handlePageRequest(request) {
  try {
    // Network First
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Cache la page
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    throw new Error(`Network response not ok: ${networkResponse.status}`);

  } catch (error) {
    console.log('🔄 Page request failed, trying cache:', request.url);

    // Fallback vers le cache
    const cachedResponse = await getCachedResponse(request, CACHE_NAME);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Fallback vers la page offline
    return createOfflinePage(request);
  }
}

// Stratégie par défaut
async function handleDefaultRequest(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    const cachedResponse = await getCachedResponse(request, CACHE_NAME);
    return cachedResponse || createOfflineResponse(request);
  }
}

// Utilitaires
async function getCachedResponse(request, cacheName) {
  const cache = await caches.open(cacheName);
  return await cache.match(request);
}

function createOfflineResponse(request) {
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/')) {
    return new Response(
      JSON.stringify({
        error: 'Offline mode',
        message: 'Cette action nécessite une connexion internet',
        offline: true
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  return new Response('Service unavailable offline', { status: 503 });
}

function createOfflinePage(request) {
  const offlineHtml = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mode hors ligne - Oh Sheet!</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
      color: white;
      margin: 0;
      padding: 2rem;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    .container {
      max-width: 400px;
      padding: 2rem;
      background: rgba(255,255,255,0.1);
      border-radius: 1rem;
      backdrop-filter: blur(10px);
    }
    h1 { margin-bottom: 1rem; color: #60a5fa; }
    p { margin-bottom: 1rem; opacity: 0.9; }
    button {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      cursor: pointer;
      font-size: 1rem;
    }
    button:hover { background: #2563eb; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📵 Mode hors ligne</h1>
    <p>Cette page n'est pas disponible hors ligne.</p>
    <p>Vérifiez votre connexion internet et réessayez.</p>
    <button onclick="window.location.reload()">Réessayer</button>
    <br><br>
    <button onclick="window.location.href='/'">Retour à l'accueil</button>
  </div>
</body>
</html>`;

  return new Response(offlineHtml, {
    status: 200,
    headers: { 'Content-Type': 'text/html' }
  });
}

// Gestion des messages depuis l'app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    const urls = event.data.urls;
    cacheUrls(urls);
  }
});

// Cache des URLs supplémentaires
async function cacheUrls(urls) {
  const cache = await caches.open(CACHE_NAME);
  try {
    await cache.addAll(urls);
    console.log('✅ Additional URLs cached:', urls);
  } catch (error) {
    console.error('❌ Error caching additional URLs:', error);
  }
}