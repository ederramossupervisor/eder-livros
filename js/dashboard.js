/**
 * Módulo Dashboard – carrega dados agregados e preenche cards + gráfico
 */
const Dashboard = (() => {
  let chartInstance = null;

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

function preencherCards(d) {
  // Remove qualquer dropdown existente antes de criar um novo
  const oldSelect = document.getElementById('livro-atual-select');
  if (oldSelect) oldSelect.remove();

  // Livro atual
  if (d.livroAtual) {
    const progresso = d.livroAtual.totalPag > 0 ? Math.round((d.livroAtual.pagLidas / d.livroAtual.totalPag) * 100) : 0;
    document.getElementById('livro-atual-titulo').textContent = d.livroAtual.titulo;
    document.getElementById('livro-atual-progresso').textContent = `${d.livroAtual.pagLidas || 0} de ${d.livroAtual.totalPag} páginas (${progresso}%)`;
    if (d.livroAtual.urlCapa) {
      document.getElementById('livro-atual-capa').innerHTML = `<img src="${d.livroAtual.urlCapa}" alt="Capa">`;
    } else {
      document.getElementById('livro-atual-capa').innerHTML = '';
    }

    // Se houver mais de um livro sendo lido, adiciona seletor
    if (d.livrosLendo && d.livrosLendo.length > 1) {
      const select = document.createElement('select');
      select.id = 'livro-atual-select';
      select.className = 'form-select form-select-sm ms-3';
      select.style.maxWidth = '250px';

      d.livrosLendo.forEach(livro => {
        const option = document.createElement('option');
        option.value = livro.ID;
        option.textContent = livro.titulo;
        if (livro.ID === d.livroAtual.ID) option.selected = true;
        select.appendChild(option);
      });

      // Adiciona o listener uma única vez
      select.addEventListener('change', async (e) => {
        const novoID = e.target.value;
        await API.enviar({ acao: 'setLivroAtual', livroID: novoID });
        Dashboard.init();
      });

      const tituloContainer = document.getElementById('livro-atual-titulo').parentNode;
      tituloContainer.appendChild(select);
    }
  } else {
    document.getElementById('livro-atual-titulo').textContent = 'Nenhum livro em andamento';
    document.getElementById('livro-atual-progresso').textContent = '';
    document.getElementById('livro-atual-capa').innerHTML = '';
  }

  // Cards de números
  document.getElementById('card-livros-mes').textContent = d.livrosFinalizadosMes;
  document.getElementById('card-livros-ano').textContent = d.livrosFinalizadosAno;
  document.getElementById('card-paginas-hoje').textContent = d.paginasHoje;
  document.getElementById('card-paginas-semana').textContent = d.paginasSemana;
  document.getElementById('card-horas').textContent = d.horasTotal;
  document.getElementById('card-sequencia').textContent = d.sequenciaAtual + ' dias';

  // Meta
  document.getElementById('meta-texto').textContent = `${d.livrosFinalizadosAno} de ${d.metaLivros} livros (${d.percentualMeta}%)`;
  var barra = document.getElementById('barra-meta');
  barra.style.width = d.percentualMeta + '%';
  barra.textContent = d.percentualMeta + '%';
  barra.setAttribute('aria-valuenow', d.percentualMeta);
}
  function criarGrafico(dados) {
    if (chartInstance) chartInstance.destroy();
    const ctx = document.getElementById('grafico-semanal').getContext('2d');
    chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: dados.map(item => item.dia),
        datasets: [{
          label: 'Páginas lidas',
          data: dados.map(item => item.paginas),
          backgroundColor: 'rgba(26, 115, 232, 0.7)',
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

  // Carrega o dashboard quando a página correspondente é exibida
  // Usamos um listener no evento de navegação (app.js) ou MutationObserver.
  // Por simplicidade, vamos disparar de app.js após trocar para a página.
  return { init };
})();

// Será chamado pelo app.js quando a página dashboard for ativada
