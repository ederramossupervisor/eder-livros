const CACHE_NAME = 'eder-livros-v12'; // ← versão incrementada
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/variables.css',
  './css/layout.css',
  './css/livros.css',
  './css/leitura.css',
  './css/dashboard.css',
  './css/biblioteca.css',
  './css/estatisticas.css',
  './css/metas.css',
  './css/anotacoes.css',
  './css/desejos.css',
  './css/exportar.css',
  './css/configuracoes.css',
  './js/util.js',
  './js/api.js',
  './js/auth.js',
  './js/livros.js',
  './js/leitura.js',
  './js/dashboard.js',
  './js/biblioteca.js',
  './js/estatisticas.js',
  './js/metas.js',
  './js/anotacoes.js',
  './js/desejos.js',
  './js/exportar.js',
  './js/configuracoes.js',
  './js/app.js',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

// Instalação
self.addEventListener('install', event => {
  self.skipWaiting(); // Ativa imediatamente
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

// Ativação
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim(); // Assume controle das páginas abertas
});

// Fetch
self.addEventListener('fetch', event => {
  // Não interceptar requisições ao Google Apps Script
  if (event.request.url.includes('script.google.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
