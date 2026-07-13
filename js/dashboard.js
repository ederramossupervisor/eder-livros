/**
 * Módulo Dashboard – cards dinâmicos, gráfico, navegação entre livros atuais,
 * animação de contagem e skeleton loading.
 */
const Dashboard = (() => {
  let chartInstance = null;
  let currentLivroIndex = 0;
  let livrosLendoList = [];
  let livroAtualID = null;
  let containerCard = null;
  // Elementos que receberão skeleton
  const skeletonIds = [
    'card-livros-mes', 'card-livros-ano', 'card-paginas-hoje',
    'card-paginas-semana', 'card-horas', 'card-sequencia',
    'livro-atual-titulo', 'livro-atual-progresso'
  ];

  async function init() {
    const dashPage = document.getElementById('page-dashboard');
    if (!dashPage || !dashPage.classList.contains('active')) return;

    mostrarSkeletons();
    console.log('📊 Carregando dashboard...');
    try {
      const hojeLocal = new Date();
      const dataLocalISO = hojeLocal.getFullYear() + '-' +
        String(hojeLocal.getMonth() + 1).padStart(2,'0') + '-' +
        String(hojeLocal.getDate()).padStart(2,'0');
      const dados = await API.enviar({ acao: 'dashboard', dataAtual: dataLocalISO });
      if (dados && !dados.erro) {
        ocultarSkeletons();
        preencherCards(dados);
        criarGrafico(dados.paginasUltimos7Dias);
      } else {
        ocultarSkeletons();
        Util.toast('Erro ao carregar dashboard', 'danger');
      }
    } catch (e) {
      ocultarSkeletons();
      console.error('Erro dashboard:', e);
      Util.toast('Falha na conexão', 'danger');
    }
  }

  function mostrarSkeletons() {
    skeletonIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add('skeleton-placeholder');
        // Para títulos, mantém um texto fantasma
        if (id === 'livro-atual-titulo') el.textContent = 'Carregando...';
        if (id === 'livro-atual-progresso') el.textContent = '';
        // Para números, zera
        if (id.startsWith('card-')) el.textContent = '...';
      }
    });
    // Adiciona skeleton também na capa
    const capa = document.getElementById('livro-atual-capa');
    if (capa) capa.innerHTML = '<div class="skeleton-placeholder" style="width:50px;height:70px;border-radius:4px;"></div>';
  }

  function ocultarSkeletons() {
    skeletonIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('skeleton-placeholder');
    });
    const capa = document.getElementById('livro-atual-capa');
    if (capa) capa.innerHTML = '';
  }

  function preencherCards(d) {
  containerCard = document.getElementById('livro-atual-card');
  if (!containerCard) return;

  livrosLendoList = d.livrosLendo || [];
  if (d.livroAtual && livrosLendoList.length > 0) {
    currentLivroIndex = livrosLendoList.findIndex(l => l.ID === d.livroAtual.ID);
    if (currentLivroIndex < 0) currentLivroIndex = 0;
  } else {
    currentLivroIndex = 0;
  }
  livroAtualID = d.livroAtual ? d.livroAtual.ID : null;

  renderizarLivroAtual();
  criarControlesNavegacao();
  adicionarSwipe();

  // Animação de contagem para os números
  animarContador('card-livros-mes', d.livrosFinalizadosMes);
  animarContador('card-livros-ano', d.livrosFinalizadosAno);
  animarContador('card-paginas-hoje', d.paginasHoje);
  animarContador('card-paginas-semana', d.paginasSemana);
  animarContador('card-horas', d.horasTotal);
  animarContador('card-sequencia', d.sequenciaAtual);

  // Meta (sem animação complexa, apenas texto)
  document.getElementById('meta-texto').textContent =
    `${d.livrosFinalizadosAno} de ${d.metaLivros} livros (${d.percentualMeta}%)`;
  const barra = document.getElementById('barra-meta');
  barra.style.width = d.percentualMeta + '%';
  barra.textContent = d.percentualMeta + '%';
  barra.setAttribute('aria-valuenow', d.percentualMeta);
}
  function animarContador(id, valorFinal) {
    const el = document.getElementById(id);
    if (!el) return;
    const valorInicial = 0;
    const duracao = 800; // ms
    const inicio = performance.now();
    const passo = (agora) => {
      const decorrido = agora - inicio;
      const progresso = Math.min(decorrido / duracao, 1);
      const valorAtual = Math.round(valorInicial + (valorFinal - valorInicial) * progresso);
      el.textContent = id === 'card-horas' ? valorAtual : valorAtual + (id === 'card-sequencia' ? ' dias' : '');
      if (progresso < 1) {
        requestAnimationFrame(passo);
      } else {
        el.textContent = id === 'card-horas' ? valorFinal : valorFinal + (id === 'card-sequencia' ? ' dias' : '');
      }
    };
    requestAnimationFrame(passo);
  }

  function renderizarLivroAtual() {
  if (!containerCard) return;
  const livro = livrosLendoList.length > 0 ? livrosLendoList[currentLivroIndex] : null;
  const tituloEl = document.getElementById('livro-atual-titulo');
  const progressoEl = document.getElementById('livro-atual-progresso');
  const capaEl = document.getElementById('livro-atual-capa');
  const previsaoEl = document.getElementById('livro-atual-previsao');

  if (livro) {
    const progresso = livro.totalPag > 0 ? Math.round((livro.pagLidas / livro.totalPag) * 100) : 0;
    if (tituloEl) tituloEl.textContent = livro.titulo;
    if (progressoEl) progressoEl.textContent = `${livro.pagLidas || 0} de ${livro.totalPag} páginas (${progresso}%)`;
    if (capaEl) {
      capaEl.innerHTML = livro.urlCapa
        ? `<img src="${livro.urlCapa}" alt="Capa" class="img-fluid rounded" style="max-height:70px;">`
        : '';
    }
    // Exibe previsão se disponível
    if (previsaoEl) {
      if (livro.dataTerminoEstimada) {
        previsaoEl.textContent = `Previsão de término: ${livro.dataTerminoEstimada} (${livro.diasEstimados} dias)`;
        previsaoEl.classList.remove('d-none');
      } else {
        previsaoEl.classList.add('d-none');
      }
    }
    const indicador = document.getElementById('livro-atual-indicador');
    if (indicador) indicador.textContent = `${currentLivroIndex + 1}/${livrosLendoList.length}`;
  } else {
    if (tituloEl) tituloEl.textContent = 'Nenhum livro em andamento';
    if (progressoEl) progressoEl.textContent = '';
    if (capaEl) capaEl.innerHTML = '';
    if (previsaoEl) previsaoEl.classList.add('d-none');
  }
}


  function criarControlesNavegacao() {
    const oldLeft = document.getElementById('livro-atual-seta-left');
    if (oldLeft) oldLeft.remove();
    const oldRight = document.getElementById('livro-atual-seta-right');
    if (oldRight) oldRight.remove();
    const oldInd = document.getElementById('livro-atual-indicador');
    if (oldInd) oldInd.remove();

    if (livrosLendoList.length <= 1) return;

    const btnLeft = document.createElement('button');
    btnLeft.id = 'livro-atual-seta-left';
    btnLeft.className = 'btn btn-link text-secondary position-absolute start-0 top-50 translate-middle-y px-2';
    btnLeft.innerHTML = '<i class="fas fa-chevron-left"></i>';
    btnLeft.style.opacity = '0.6';
    btnLeft.style.fontSize = '1.2rem';
    btnLeft.addEventListener('click', (e) => { e.stopPropagation(); mudarLivro(-1); });

    const btnRight = document.createElement('button');
    btnRight.id = 'livro-atual-seta-right';
    btnRight.className = 'btn btn-link text-secondary position-absolute end-0 top-50 translate-middle-y px-2';
    btnRight.innerHTML = '<i class="fas fa-chevron-right"></i>';
    btnRight.style.opacity = '0.6';
    btnRight.style.fontSize = '1.2rem';
    btnRight.addEventListener('click', (e) => { e.stopPropagation(); mudarLivro(1); });

    const indicador = document.createElement('small');
    indicador.id = 'livro-atual-indicador';
    indicador.className = 'text-muted ms-2';
    indicador.textContent = `${currentLivroIndex + 1}/${livrosLendoList.length}`;

    containerCard.style.position = 'relative';
    containerCard.appendChild(btnLeft);
    containerCard.appendChild(btnRight);

    const tituloEl = document.getElementById('livro-atual-titulo');
    if (tituloEl) tituloEl.parentNode.appendChild(indicador);
  }

  async function mudarLivro(delta) {
    if (livrosLendoList.length === 0) return;
    currentLivroIndex = (currentLivroIndex + delta + livrosLendoList.length) % livrosLendoList.length;
    const novoLivro = livrosLendoList[currentLivroIndex];
    if (novoLivro && novoLivro.ID !== livroAtualID) {
      renderizarLivroAtual();
      livroAtualID = novoLivro.ID;
      await API.enviar({ acao: 'setLivroAtual', livroID: novoLivro.ID });
    }
  }

  function adicionarSwipe() {
    if (!containerCard) return;
    let touchStartX = 0;
    containerCard.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    containerCard.addEventListener('touchend', (e) => {
      if (touchStartX === 0) return;
      const diff = e.changedTouches[0].screenX - touchStartX;
      if (Math.abs(diff) > 50) mudarLivro(diff > 0 ? -1 : 1);
      touchStartX = 0;
    });
  }

  function criarGrafico(dados) {
    if (chartInstance) chartInstance.destroy();
    const ctx = document.getElementById('grafico-semanal')?.getContext('2d');
    if (!ctx) return;
    chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: dados.map(item => item.dia),
        datasets: [{
          label: 'Páginas lidas',
          data: dados.map(item => item.paginas),
          backgroundColor: 'rgba(99, 102, 241, 0.7)',
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true, ticks: { stepSize: 10 } } }
      }
    });
  }

  return { init };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('page-dashboard')?.classList.contains('active')) {
      Dashboard.init();
    }
  });
} else {
  if (document.getElementById('page-dashboard')?.classList.contains('active')) {
    Dashboard.init();
  }
}
