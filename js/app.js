// Controlador principal da aplicação
document.addEventListener('DOMContentLoaded', () => {
  const splash = document.getElementById('splash-screen');

  // Só adiciona a classe que inicia a transição de saída após 5 segundos
  setTimeout(() => {
    document.body.classList.add('app-loaded');
  }, 4000);

  // Remove o elemento do DOM depois que a transição terminar (5s + 0.5s)
  setTimeout(() => {
    if (splash) splash.remove();
  }, 4500);

  // Inicializa módulos básicos (independente da splash)
  Auth.init();
  initNavegacao();
  initTema();

  // Carrega a página inicial ativa (dashboard)
  const activePage = document.querySelector('.page.active');
  if (activePage && activePage.id === 'page-dashboard') {
    if (typeof Dashboard !== 'undefined' && Dashboard.init) {
      Dashboard.init();
    }
  }

  // Atalhos de página (ex.: ?page=leitura)
  const urlParams = new URLSearchParams(window.location.search);
  const shortcutPage = urlParams.get('page');
  if (shortcutPage) {
    setTimeout(() => activatePageGlobal(shortcutPage), 400);
  }
});

// Função pública para ativar uma página (usada por atalhos e navegação)
function activatePageGlobal(pageName) {
  // Atualiza links ativos
  const navItems = document.querySelectorAll('.nav-link, .bottom-nav .nav-item');
  navItems.forEach(link => {
    link.classList.remove('active');
    if (link.dataset.page === pageName) {
      link.classList.add('active');
    }
  });

  // Mostra/oculta páginas
  const pages = document.querySelectorAll('.page');
  pages.forEach(page => {
    page.classList.remove('active');
    if (page.id === `page-${pageName}`) {
      page.classList.add('active');
    }
  });

  // Inicializa módulos específicos
  switch (pageName) {
    case 'dashboard':
      if (typeof Dashboard !== 'undefined' && Dashboard.init) Dashboard.init();
      break;
    case 'leitura':
      if (typeof Leitura !== 'undefined' && Leitura.init) Leitura.init();
      break;
    case 'adicionar':
      if (typeof Livros !== 'undefined' && Livros.init) Livros.init();
      break;
    case 'biblioteca':
      if (typeof Biblioteca !== 'undefined' && Biblioteca.init) Biblioteca.init();
      break;
    case 'estatisticas':
      if (typeof Estatisticas !== 'undefined' && Estatisticas.init) Estatisticas.init();
      break;
    case 'metas':
      if (typeof Metas !== 'undefined' && Metas.init) Metas.init();
      break;
    case 'anotacoes':
      if (typeof Anotacoes !== 'undefined' && Anotacoes.init) Anotacoes.init();
      break;
    case 'desejos':
      if (typeof DesejosEmprestimos !== 'undefined' && DesejosEmprestimos.init) DesejosEmprestimos.init();
      break;
    case 'exportar':
      if (typeof Exportar !== 'undefined' && Exportar.init) Exportar.init();
      break;
    case 'configuracoes':
      if (typeof Configuracoes !== 'undefined' && Configuracoes.init) Configuracoes.init();
      break;
  }

  // Fecha o offcanvas mobile se estiver aberto
  try {
    const offcanvasEl = document.getElementById('mobileMenu');
    if (offcanvasEl) {
      const offcanvas = bootstrap.Offcanvas.getInstance(offcanvasEl);
      if (offcanvas) offcanvas.hide();
    }
  } catch (e) { /* ignora */ }

  // ÍCONES NOS TÍTULOS DAS PÁGINAS (USANDO FONT AWESOME)
  const iconesPaginas = {
    dashboard: 'fa-chart-pie',
    biblioteca: 'fa-books',
    adicionar: 'fa-plus-circle',
    leitura: 'fa-clock',
    estatisticas: 'fa-chart-bar',
    metas: 'fa-bullseye',
    anotacoes: 'fa-sticky-note',
    desejos: 'fa-heart',
    exportar: 'fa-download',
    configuracoes: 'fa-cog'
  };

  const h1 = document.querySelector(`#page-${pageName} h1`);
  if (h1 && iconesPaginas[pageName]) {
    if (!h1.querySelector('.fa')) {
      h1.innerHTML = `<i class="fas ${iconesPaginas[pageName]} me-2"></i>${h1.textContent}`;
    }
  }
}   // ← Faltava esta chave! Ela fecha a função activatePageGlobal

// Gerencia a navegação entre páginas
function initNavegacao() {
  const navItems = document.querySelectorAll('.nav-link, .bottom-nav .nav-item');

  navItems.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const pageName = link.dataset.page;
      if (pageName) activatePageGlobal(pageName);
    });
  });
}

// Modo escuro / claro
function initTema() {
  const body = document.body;
  const toggleDesktop = document.getElementById('theme-toggle');
  const toggleMobileOffcanvas = document.getElementById('theme-toggle-mobile');
  const toggleMobileTop = document.getElementById('theme-toggle-mobile-top');

  const saved = Util.getPreference('darkMode', false);
  if (saved) body.classList.add('dark-mode');

  function atualizarBotao(btn) {
    if (!btn) return;
    const isDark = body.classList.contains('dark-mode');
    btn.innerHTML = isDark
      ? '<i class="fas fa-sun"></i> <span class="ms-1">Modo claro</span>'
      : '<i class="fas fa-moon"></i> <span class="ms-1">Modo escuro</span>';
  }

  function atualizarTodos() {
    [toggleDesktop, toggleMobileOffcanvas, toggleMobileTop].forEach(atualizarBotao);
  }

  atualizarTodos();

  [toggleDesktop, toggleMobileOffcanvas, toggleMobileTop].forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        Util.setPreference('darkMode', body.classList.contains('dark-mode'));
        atualizarTodos();
      });
    }
  });
}
