const CACHE_NAME = 'benaion-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/api.js',
  '/js/auth.js',
  '/js/utils.js'
];

// Instalação: Salva arquivos essenciais no cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Ativação: Limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});

// Estratégia de busca: Tenta rede, se falhar, usa o cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Escutar notificações Push
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Benaion Delivery', body: 'Nova atualização!' };
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: 'https://via.placeholder.com/192x192.png?text=Benaion',
      badge: 'https://via.placeholder.com/192x192.png?text=Benaion'
    })
  );
});

