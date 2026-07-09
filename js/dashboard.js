/**
 * Módulo Dashboard – cards dinâmicos, gráfico e navegação entre livros atuais
 */
const Dashboard = (() => {
  let chartInstance = null;
  // Estado da navegação de livros "Lendo"
  let currentLivroIndex = 0;
  let livrosLendoList = [];
  let livroAtualID = null;
  let containerCard = null;

  async function init() {
    const dashPage = document.getElementById('page-dashboard');
    if (!dashPage || !dashPage.classList.contains('active')) return;

    console.log('📊 Carregando dashboard...');
    try {
      const dados = await API.enviar({ acao: 'dashboard' });
      if (dados && !dados.erro) {
        preencherCards(dados);
        criarGrafico(dados.paginasUltimos7Dias);
      } else {
        Util.toast('Erro ao carregar dashboard', 'danger');
      }
    } catch (e) {
      console.error('Erro dashboard:', e);
      Util.toast('Falha na conexão', 'danger');
    }
  }

  /* ========== PREENCHER CARDS ========== */
  function preencherCards(d) {
    // Atualiza lista de livros lendo e índice
    livrosLendoList = d.livrosLendo || [];
    containerCard = document.getElementById('livro-atual-card');
    if (!containerCard) return;

    // Determina índice do livro atual
    if (d.livroAtual && livrosLendoList.length > 0) {
      const idx = livrosLendoList.findIndex(l => l.ID === d.livroAtual.ID);
      currentLivroIndex = idx >= 0 ? idx : 0;
    } else {
      currentLivroIndex = 0;
    }
    livroAtualID = d.livroAtual ? d.livroAtual.ID : null;

    // Renderiza o livro atual
    renderizarLivroAtual();

    // Cria controles de navegação se houver mais de um livro lendo
    criarControlesNavegacao();

    // Adiciona suporte a swipe
    adicionarSwipe();

    // Atualiza os demais cards (números, meta)
    document.getElementById('card-livros-mes').textContent = d.livrosFinalizadosMes;
    document.getElementById('card-livros-ano').textContent = d.livrosFinalizadosAno;
    document.getElementById('card-paginas-hoje').textContent = d.paginasHoje;
    document.getElementById('card-paginas-semana').textContent = d.paginasSemana;
    document.getElementById('card-horas').textContent = d.horasTotal;
    document.getElementById('card-sequencia').textContent = d.sequenciaAtual + ' dias';

    document.getElementById('meta-texto').textContent = `${d.livrosFinalizadosAno} de ${d.metaLivros} livros (${d.percentualMeta}%)`;
    const barra = document.getElementById('barra-meta');
    barra.style.width = d.percentualMeta + '%';
    barra.textContent = d.percentualMeta + '%';
    barra.setAttribute('aria-valuenow', d.percentualMeta);
  }

  /* ========== RENDERIZA O LIVRO ATUAL NO CARD ========== */
  function renderizarLivroAtual() {
    if (!containerCard) return;
    const livro = livrosLendoList.length > 0 ? livrosLendoList[currentLivroIndex] : null;
    const tituloEl = document.getElementById('livro-atual-titulo');
    const progressoEl = document.getElementById('livro-atual-progresso');
    const capaEl = document.getElementById('livro-atual-capa');

    if (livro) {
      const progresso = livro.totalPag > 0 ? Math.round((livro.pagLidas / livro.totalPag) * 100) : 0;
      if (tituloEl) tituloEl.textContent = livro.titulo;
      if (progressoEl) progressoEl.textContent = `${livro.pagLidas || 0} de ${livro.totalPag} páginas (${progresso}%)`;
      if (capaEl) {
        capaEl.innerHTML = livro.urlCapa ? `<img src="${livro.urlCapa}" alt="Capa" class="img-fluid rounded" style="max-height:70px;">` : '';
      }
      // Atualiza indicador de posição se existir
      const indicador = document.getElementById('livro-atual-indicador');
      if (indicador) {
        indicador.textContent = `${currentLivroIndex + 1}/${livrosLendoList.length}`;
      }
    } else {
      if (tituloEl) tituloEl.textContent = 'Nenhum livro em andamento';
      if (progressoEl) progressoEl.textContent = '';
      if (capaEl) capaEl.innerHTML = '';
    }
  }

  /* ========== CONTROLES DE NAVEGAÇÃO (SETAS E INDICADOR) ========== */
  function criarControlesNavegacao() {
    // Remove controles antigos
    const oldLeft = document.getElementById('livro-atual-seta-left');
    if (oldLeft) oldLeft.remove();
    const oldRight = document.getElementById('livro-atual-seta-right');
    if (oldRight) oldRight.remove();
    const oldInd = document.getElementById('livro-atual-indicador');
    if (oldInd) oldInd.remove();

    if (livrosLendoList.length <= 1) return;

    // Botão esquerdo
    const btnLeft = document.createElement('button');
    btnLeft.id = 'livro-atual-seta-left';
    btnLeft.className = 'btn btn-link text-secondary position-absolute start-0 top-50 translate-middle-y px-2';
    btnLeft.innerHTML = '<i class="fas fa-chevron-left"></i>';
    btnLeft.style.opacity = '0.6';
    btnLeft.style.fontSize = '1.2rem';
    btnLeft.addEventListener('click', (e) => {
      e.stopPropagation();
      mudarLivro(-1);
    });

    // Botão direito
    const btnRight = document.createElement('button');
    btnRight.id = 'livro-atual-seta-right';
    btnRight.className = 'btn btn-link text-secondary position-absolute end-0 top-50 translate-middle-y px-2';
    btnRight.innerHTML = '<i class="fas fa-chevron-right"></i>';
    btnRight.style.opacity = '0.6';
    btnRight.style.fontSize = '1.2rem';
    btnRight.addEventListener('click', (e) => {
      e.stopPropagation();
      mudarLivro(1);
    });

    // Indicador de posição (ex.: 2/3)
    const indicador = document.createElement('small');
    indicador.id = 'livro-atual-indicador';
    indicador.className = 'text-muted ms-2';
    indicador.textContent = `${currentLivroIndex + 1}/${livrosLendoList.length}`;

    // Adiciona os elementos ao container (que deve ter position: relative)
    containerCard.style.position = 'relative';
    containerCard.appendChild(btnLeft);
    containerCard.appendChild(btnRight);

    // Insere o indicador após o título
    const tituloEl = document.getElementById('livro-atual-titulo');
    if (tituloEl) {
      tituloEl.parentNode.appendChild(indicador);
    }
  }

  /* ========== MUDAR DE LIVRO ========== */
  async function mudarLivro(delta) {
    if (livrosLendoList.length === 0) return;
    currentLivroIndex = (currentLivroIndex + delta + livrosLendoList.length) % livrosLendoList.length;
    const novoLivro = livrosLendoList[currentLivroIndex];
    if (novoLivro && novoLivro.ID !== livroAtualID) {
      // Atualiza localmente primeiro (resposta rápida)
      renderizarLivroAtual();
      livroAtualID = novoLivro.ID;
      // Salva no backend
      await API.enviar({ acao: 'setLivroAtual', livroID: novoLivro.ID });
    }
  }

  /* ========== SUPORTE A SWIPE NO CARD ========== */
  function adicionarSwipe() {
    if (!containerCard) return;
    let touchStartX = 0;
    containerCard.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    containerCard.addEventListener('touchend', (e) => {
      if (touchStartX === 0) return;
      const diff = e.changedTouches[0].screenX - touchStartX;
      if (Math.abs(diff) > 50) { // threshold 50px
        mudarLivro(diff > 0 ? -1 : 1);
      }
      touchStartX = 0;
    });
  }

  /* ========== GRÁFICO (mantido igual) ========== */
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
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 10 } }
        }
      }
    });
  }

  return { init };
})();

// Inicialização condicional (chamada por app.js quando a página é ativada)
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
