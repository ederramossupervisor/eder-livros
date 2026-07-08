const Estatisticas = (() => {
  const graficos = {};

  async function init() {
    const page = document.getElementById('page-estatisticas');
    if (!page || !page.classList.contains('active')) return;

    console.log('📊 Carregando estatísticas...');
    try {
      const dados = await API.enviar({ acao: 'stats' });
      if (dados && !dados.erro) {
        preencherResumo(dados);
        criarInsights(dados.insights);
        criarGraficoFinalizadosMes(dados.finalizadosPorMes);
        criarGraficoPaginasDia(dados.paginasPorDia);
        criarGraficoGeneros(dados.generos);
        criarGraficoDiaSemana(dados.tempoPorDiaSemana);
        criarHeatmap(dados.heatmap);
        preencherTopAutores(dados.topAutores);
        preencherTopEditoras(dados.topEditoras);
      } else {
        Util.toast('Erro ao carregar estatísticas', 'danger');
      }
    } catch (e) {
      console.error('Erro stats:', e);
      Util.toast('Falha na conexão', 'danger');
    }
  }

  function preencherResumo(d) {
    document.getElementById('stat-total-livros').textContent = d.totalLivros;
    document.getElementById('stat-total-paginas').textContent = d.totalPaginas;
    document.getElementById('stat-total-horas').textContent = d.totalHoras;
    document.getElementById('stat-velocidade').textContent = d.velocidadeMedia;
  }

  function criarInsights(lista) {
    const ul = document.getElementById('insights-list');
    ul.innerHTML = '';
    lista.forEach(texto => {
      const li = document.createElement('li');
      li.className = 'list-group-item';
      li.innerHTML = `<i class="fas fa-check-circle text-success me-2"></i>${texto}`;
      ul.appendChild(li);
    });
  }

  function criarGraficoFinalizadosMes(dados) {
    const ctx = document.getElementById('grafico-finalizados-mes').getContext('2d');
    if (graficos.finalizadosMes) graficos.finalizadosMes.destroy();
    graficos.finalizadosMes = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: dados.labels,
        datasets: [{
          label: 'Livros finalizados',
          data: dados.valores,
          backgroundColor: 'rgba(26, 115, 232, 0.7)',
          borderRadius: 4
        }]
      },
      options: { responsive: true, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });
  }

  function criarGraficoPaginasDia(dados) {
    const ctx = document.getElementById('grafico-paginas-dia').getContext('2d');
    if (graficos.paginasDia) graficos.paginasDia.destroy();
    graficos.paginasDia = new Chart(ctx, {
      type: 'line',
      data: {
        labels: dados.labels,
        datasets: [{
          label: 'Páginas',
          data: dados.valores,
          borderColor: '#1a73e8',
          tension: 0.3,
          fill: true,
          backgroundColor: 'rgba(26,115,232,0.1)'
        }]
      },
      options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
  }

  function criarGraficoGeneros(generos) {
    const ctx = document.getElementById('grafico-generos').getContext('2d');
    if (graficos.generos) graficos.generos.destroy();
    graficos.generos = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: generos.map(g => g.genero),
        datasets: [{
          data: generos.map(g => g.count),
          backgroundColor: ['#1a73e8','#e8710a','#0d904f','#d93025','#fbbc04','#9c27b0']
        }]
      },
      options: { responsive: true }
    });
  }

  function criarGraficoDiaSemana(dados) {
    const ctx = document.getElementById('grafico-dia-semana').getContext('2d');
    if (graficos.diaSemana) graficos.diaSemana.destroy();
    graficos.diaSemana = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: dados.labels,
        datasets: [{
          label: 'Minutos',
          data: dados.valores,
          backgroundColor: 'rgba(251, 188, 4, 0.7)',
          borderRadius: 4
        }]
      },
      options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
  }

  function criarHeatmap(heatmapData) {
    const container = document.getElementById('heatmap-container');
    container.innerHTML = '';
    // Exibir os últimos 84 dias (12 semanas) para caber bem
    const diasExibir = heatmapData.slice(0, 84).reverse();
    // Valor máximo para cor
    const maxPag = Math.max.apply(null, diasExibir.map(d => d.paginas));
    diasExibir.forEach(dia => {
      const cell = document.createElement('div');
      cell.className = 'heatmap-cell';
      const intensidade = maxPag > 0 ? dia.paginas / maxPag : 0;
      cell.style.backgroundColor = getHeatColor(intensidade);
      cell.title = `${dia.data}: ${dia.paginas} páginas`;
      container.appendChild(cell);
    });
  }

  function getHeatColor(intensidade) {
    if (intensidade === 0) return '#ebedf0';
    if (intensidade < 0.25) return '#9be9a8';
    if (intensidade < 0.5) return '#40c463';
    if (intensidade < 0.75) return '#30a14e';
    return '#216e39';
  }

  function preencherTopAutores(autores) {
    const ul = document.getElementById('top-autores');
    ul.innerHTML = '';
    autores.forEach(a => {
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex justify-content-between align-items-center';
      li.innerHTML = `${a.nome} <span class="badge bg-primary rounded-pill">${a.livros}</span>`;
      ul.appendChild(li);
    });
    if (autores.length === 0) ul.innerHTML = '<li class="list-group-item text-muted">Nenhum dado</li>';
  }

  function preencherTopEditoras(editoras) {
    const ul = document.getElementById('top-editoras');
    ul.innerHTML = '';
    editoras.forEach(e => {
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex justify-content-between align-items-center';
      li.innerHTML = `${e.nome} <span class="badge bg-secondary rounded-pill">${e.livros}</span>`;
      ul.appendChild(li);
    });
    if (editoras.length === 0) ul.innerHTML = '<li class="list-group-item text-muted">Nenhum dado</li>';
  }

  return { init };
})();

// Inicialização segura
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Estatisticas.init());
} else {
  Estatisticas.init();
}