// Service Worker - オフライン対応・PWA機能
const CACHE_NAME = 'ar-summon-v1.2.0'; // バージョン強制更新
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/assets/images/icon.svg',
  '/js/config.js',
  '/js/utils.js',
  '/js/camera.js',
  '/js/magicCircle.js',
  '/js/frog.js',
  '/js/egg.js',
  '/js/audio.js',
  '/js/threeDRenderer.js',
  '/js/main.js',
  // CDNライブラリはキャッシュしない（常に最新版を使用）
];

// インストール時
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[SW] Installation complete');
        return self.skipWaiting();
      })
  );
});

// アクティベーション時
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Activation complete');
      return self.clients.claim();
    })
  );
});

// フェッチ時（ネットワーク要求）
self.addEventListener('fetch', (event) => {
  // CDNリソースは常にネットワークから取得
  if (event.request.url.includes('cdnjs.cloudflare.com')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // CDN失敗時はアプリを無効にするのではなく、キャッシュから基本機能を提供
        return caches.match('/index.html');
      })
    );
    return;
  }

  // その他のリソース: キャッシュファースト戦略
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // キャッシュにあればそれを返す
        if (response) {
          console.log('[SW] Serving from cache:', event.request.url);
          return response;
        }

        // キャッシュになければネットワークから取得
        console.log('[SW] Fetching from network:', event.request.url);
        return fetch(event.request).then((response) => {
          // 有効なレスポンスかチェック
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // レスポンスをクローンしてキャッシュに保存
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        // ネットワークもキャッシュも失敗した場合
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      })
  );
});

// バックグラウンド同期（将来の機能拡張用）
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('[SW] Background sync triggered');
    // 将来: オフライン時の召喚データを同期
  }
});

// プッシュ通知（将来の機能拡張用）
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    console.log('[SW] Push received:', data);
    
    const options = {
      body: data.body || '新しい召喚物が利用可能です',
      icon: '/assets/images/icon-192.png',
      badge: '/assets/images/badge.png',
      data: data.url || '/'
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'AR召喚システム', options)
    );
  }
});

// 通知クリック時
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});