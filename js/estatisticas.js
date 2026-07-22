const Estatisticas = (() => {
  const graficos = {};

  async function init() {
    const page = document.getElementById('page-estatisticas');
    if (!page || !page.classList.contains('active')) return;

    console.log('📊 Carregando estatísticas...');
    try {
      const dados = await API.enviar({ acao: 'stats' });
      if (dados && !dados.erro) {
        // Salva no cache offline
        DB.salvarEstatisticas(dados).catch(e => console.warn('Cache stats falhou:', e));
        processarDados(dados);
      } else {
        throw new Error(dados?.erro || 'Dados inválidos');
      }
    } catch (e) {
      console.warn('Falha na API, tentando cache offline...');
      const cached = await DB.obterEstatisticas();
      if (cached) {
        processarDados(cached);
        Util.toast('Modo offline - dados do último acesso.', 'info');
      } else {
        Util.toast('Sem conexão e nenhum dado em cache.', 'danger');
      }
    }
  }

  function processarDados(dados) {
    preencherResumo(dados);
    criarInsights(dados.insights);

    // Prepara containers e cria gráficos
    setTimeout(() => {
      prepararContainers();
      try { criarGraficoFinalizadosMes(dados.finalizadosPorMes); } catch(e) { console.warn(e); }
      try { criarGraficoPaginasDia(dados.paginasPorDia); } catch(e) { console.warn(e); }
      try { criarGraficoGeneros(dados.generos); } catch(e) { console.warn(e); }
      try { criarGraficoDiaSemana(dados.tempoPorDiaSemana); } catch(e) { console.warn(e); }
      try { criarHeatmap(dados.heatmap); } catch(e) { console.warn(e); }
      if (dados.velocidadeMensal) {
        try { criarGraficoVelocidadeMensal(dados.velocidadeMensal); } catch(e) { console.warn(e); }
      }
    
      // Inicializa o Calendário de Leitura
      if (typeof CalendarioLeitura !== 'undefined' && CalendarioLeitura.init) {
        const hoje = new Date();
        CalendarioLeitura.init(hoje.getFullYear(), hoje.getMonth() + 1);
      }
    
      // Carrega a lista de locais de leitura
      carregarLocais();
      // Inicializa o mapa de locais
      if (typeof MapaLeitura !== 'undefined' && MapaLeitura.init) {
        MapaLeitura.init();
      }
    }, 100);
    preencherTopAutores(dados.topAutores);
    preencherTopEditoras(dados.topEditoras);

    // Inicializa o Calendário de Leitura (mês e ano atuais)
    if (typeof CalendarioLeitura !== 'undefined' && CalendarioLeitura.init) {
      const hoje = new Date();
      CalendarioLeitura.init(hoje.getFullYear(), hoje.getMonth() + 1);
    }

    console.log('✅ Módulo Estatísticas pronto (com calendário).');
  }

  function prepararContainers() {
    document.querySelectorAll('#page-estatisticas .card-body').forEach(cardBody => {
      if (cardBody.querySelector('canvas')) {
        cardBody.style.minHeight = '350px';
        cardBody.style.padding = '1rem';
      }
    });

    const ids = [
      'grafico-finalizados-mes',
      'grafico-paginas-dia',
      'grafico-generos',
      'grafico-dia-semana',
      'grafico-velocidade-mensal'
    ];
    ids.forEach(id => {
      const canvas = document.getElementById(id);
      if (canvas) {
        const parentWidth = canvas.parentElement.clientWidth || 400;
        canvas.setAttribute('width', parentWidth);
        canvas.setAttribute('height', '250');
        canvas.style.width = '100%';
        canvas.style.height = '250px';
      }
    });
  }

  function criarGraficoFinalizadosMes(dados) {
    const canvas = document.getElementById('grafico-finalizados-mes');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (graficos.finalizadosMes) graficos.finalizadosMes.destroy();
    graficos.finalizadosMes = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: dados.labels,
        datasets: [{
          label: 'Livros finalizados',
          data: dados.valores,
          backgroundColor: 'rgba(99, 102, 241, 0.7)',
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
      }
    });
  }

  function criarGraficoPaginasDia(dados) {
    const canvas = document.getElementById('grafico-paginas-dia');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (graficos.paginasDia) graficos.paginasDia.destroy();
    graficos.paginasDia = new Chart(ctx, {
      type: 'line',
      data: {
        labels: dados.labels,
        datasets: [{
          label: 'Páginas',
          data: dados.valores,
          borderColor: '#6366f1',
          tension: 0.3,
          fill: true,
          backgroundColor: 'rgba(99,102,241,0.1)'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  function criarGraficoGeneros(generos) {
    const canvas = document.getElementById('grafico-generos');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (graficos.generos) graficos.generos.destroy();
    if (!generos || generos.length === 0) return;
    graficos.generos = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: generos.map(g => g.genero),
        datasets: [{
          data: generos.map(g => g.count),
          backgroundColor: ['#6366f1','#f59e0b','#10b981','#ef4444','#3b82f6','#8b5cf6']
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  function criarGraficoDiaSemana(dados) {
    const canvas = document.getElementById('grafico-dia-semana');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
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
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  function criarGraficoVelocidadeMensal(dados) {
    const canvas = document.getElementById('grafico-velocidade-mensal');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (graficos.velocidadeMensal) graficos.velocidadeMensal.destroy();
    graficos.velocidadeMensal = new Chart(ctx, {
      type: 'line',
      data: {
        labels: dados.labels,
        datasets: [{
          label: 'Páginas/hora',
          data: dados.valores,
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          tension: 0.3,
          fill: true,
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Páginas por hora' }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                return context.parsed.y + ' pág/h';
              }
            }
          }
        }
      }
    });
  }

  function criarHeatmap(heatmapData) {
    const container = document.getElementById('heatmap-container');
    if (!container) return;
    container.innerHTML = '';

    const diasExibir = heatmapData.slice(0, 84).reverse();
    const maxPag = Math.max(...diasExibir.map(d => d.paginas), 1);

    function formatarDataBrasileira(iso) {
      const partes = iso.split('-');
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    diasExibir.forEach(dia => {
      const cell = document.createElement('div');
      cell.className = 'heatmap-cell';
      const intensidade = dia.paginas / maxPag;
      cell.style.backgroundColor = getHeatColor(intensidade);
      cell.title = `${formatarDataBrasileira(dia.data)}: ${dia.paginas} páginas`;
      container.appendChild(cell);
    });
  }

  function getHeatColor(intensidade) {
    if (intensidade === 0) return '#ebedf0';  // cinza claro (sem leitura)
    if (intensidade < 0.25) return '#fff9c4'; // amarelo claro
    if (intensidade < 0.5) return '#ffcc80';  // laranja claro
    if (intensidade < 0.75) return '#ff7043'; // laranja escuro
    return '#d32f2f';                         // vermelho intenso
  }
  function preencherTopAutores(autores) {
    const ul = document.getElementById('top-autores');
    if (!ul) return;
    ul.innerHTML = '';
    if (autores && autores.length) {
      autores.forEach(a => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.innerHTML = `${a.nome} <span class="badge bg-primary rounded-pill">${a.livros}</span>`;
        ul.appendChild(li);
      });
    } else {
      ul.innerHTML = '<li class="list-group-item text-muted">Nenhum dado</li>';
    }
  }

  function preencherTopEditoras(editoras) {
    const ul = document.getElementById('top-editoras');
    if (!ul) return;
    ul.innerHTML = '';
    if (editoras && editoras.length) {
      editoras.forEach(e => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.innerHTML = `${e.nome} <span class="badge bg-secondary rounded-pill">${e.livros}</span>`;
        ul.appendChild(li);
      });
    } else {
      ul.innerHTML = '<li class="list-group-item text-muted">Nenhum dado</li>';
    }
  }

  function preencherResumo(d) {
    setText('stat-total-livros', d.totalLivros);
    setText('stat-total-paginas', d.totalPaginas);
    setText('stat-total-horas', d.totalHoras);
    setText('stat-velocidade', d.velocidadeMedia);
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function criarInsights(lista) {
    const ul = document.getElementById('insights-list');
    if (!ul) return;
    ul.innerHTML = '';
    if (lista && lista.length) {
      lista.forEach(texto => {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.innerHTML = `<i class="fas fa-check-circle text-success me-2"></i>${texto}`;
        ul.appendChild(li);
      });
    } else {
      ul.innerHTML = '<li class="list-group-item text-muted">Nenhum insight disponível.</li>';
    }
  }

  return { init };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Estatisticas.init());
} else {
  Estatisticas.init();
}
