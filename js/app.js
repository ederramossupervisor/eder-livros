// Controlador principal da aplicação — Eder Livros
document.addEventListener('DOMContentLoaded', () => {

  // Exibe a splash screen por um curto período e depois a remove suavemente
  setTimeout(() => {
    document.body.classList.add('app-loaded');
    const splash = document.getElementById('splash-screen');
    if (splash) {
      splash.addEventListener('transitionend', () => {
        if (splash.parentNode) splash.remove();
      });
    }
  }, 800);

  // Inicializa módulos básicos
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
});

// Gerencia a navegação entre páginas
function initNavegacao() {
  const navItems = document.querySelectorAll('.nav-link, .bottom-nav .nav-item');
  const pages = document.querySelectorAll('.page');

  function activatePage(pageName) {
    // Atualiza classes ativas nos links
    navItems.forEach(link => {
      link.classList.remove('active');
      if (link.dataset.page === pageName) {
        link.classList.add('active');
      }
    });

    // Mostra/oculta páginas
    pages.forEach(page => {
      page.classList.remove('active');
      if (page.id === `page-${pageName}`) {
        page.classList.add('active');
      }
    });

    // Inicializa módulos específicos conforme a página
    switch (pageName) {
      case 'dashboard':
        if (typeof Dashboard !== 'undefined' && Dashboard.init) {
          Dashboard.init();
        }
        break;
      case 'leitura':
        if (typeof Leitura !== 'undefined' && Leitura.init) {
          Leitura.init();
        }
        break;
      case 'adicionar':
        if (typeof Livros !== 'undefined' && Livros.init) {
          Livros.init();
        }
        break;
      case 'biblioteca':
        if (typeof Biblioteca !== 'undefined' && Biblioteca.init) {
          Biblioteca.init();
        }
        break;
      case 'estatisticas':
        if (typeof Estatisticas !== 'undefined' && Estatisticas.init) {
          Estatisticas.init();
        }
        break;
      case 'metas':
        if (typeof Metas !== 'undefined' && Metas.init) {
          Metas.init();
        }
        break;
      case 'anotacoes':
        if (typeof Anotacoes !== 'undefined' && Anotacoes.init) {
          Anotacoes.init();
        }
        break;
      case 'desejos':
        if (typeof DesejosEmprestimos !== 'undefined' && DesejosEmprestimos.init) {
          DesejosEmprestimos.init();
        }
        break;
      case 'exportar':
        if (typeof Exportar !== 'undefined' && Exportar.init) {
          Exportar.init();
        }
        break;
      case 'configuracoes':
        if (typeof Configuracoes !== 'undefined' && Configuracoes.init) {
          Configuracoes.init();
        }
        break;
      // Futuros módulos podem ser adicionados aqui
    }
  }

  navItems.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const pageName = link.dataset.page;
      if (pageName) activatePage(pageName);
    });
  });
}

// Modo escuro / claro
function initTema() {
  const toggle = document.getElementById('theme-toggle');
  const body = document.body;
  const saved = Util.getPreference('darkMode', false);

  if (saved) body.classList.add('dark-mode');
  atualizarBotaoTema(toggle);

  toggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    Util.setPreference('darkMode', body.classList.contains('dark-mode'));
    atualizarBotaoTema(toggle);
  });
}

function atualizarBotaoTema(btn) {
  const isDark = document.body.classList.contains('dark-mode');
  btn.innerHTML = isDark
    ? '<i class="fas fa-sun"></i> <span class="ms-1">Modo claro</span>'
    : '<i class="fas fa-moon"></i> <span class="ms-1">Modo escuro</span>';
}
