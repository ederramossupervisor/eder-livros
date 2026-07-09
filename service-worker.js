// Eder Livros – Service Worker v16 (cache restrito, ignora APIs)
const CACHE_NAME = 'eder-livros-v16';

// Apenas recursos estáticos que compõem o shell do app
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

// Instalação: força ativação imediata
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

// Ativação: limpa caches antigos e assume controle de todos os clientes
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Interceptação de rede – cache apenas para assets conhecidos
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = request.url;

  // Se a requisição NÃO é para um dos nossos assets estáticos, ignore completamente
  // (deixe o navegador buscar normalmente, sem qualquer intereferência)
  if (!ASSETS.includes(url) && !url.endsWith('.woff2') && !url.endsWith('.woff') && !url.endsWith('.ttf')) {
    // Essa condição abrange fontes (que podem ser carregadas pelo Bootstrap/FA)
    // e qualquer outro recurso que não esteja explicitamente listado.
    return; // <-- não responde, o navegador fará a requisição normal
  }

  // Para os assets estáticos listados, utiliza cache-first com atualização em background
  event.respondWith(
    caches.match(request).then(cached => {
      const fetchPromise = fetch(request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => cached); // fallback offline

      return cached || fetchPromise;
    })
  );
});
