const Estatisticas = (() => {
  const graficos = {};

  async function init() {
    const page = document.getElementById('page-estatisticas');
    if (!page || !page.classList.contains('active')) return;

    console.log('📊 Carregando estatísticas...');
    try {
      const dados = await API.enviar({ acao: 'stats' });
      console.log('📈 Dados recebidos:', dados);
      if (dados && !dados.erro) {
        preencherResumo(dados);
        criarInsights(dados.insights);

        // Pequeno atraso para garantir que os canvas estejam visíveis após a ativação da página
        setTimeout(() => {
          try { criarGraficoFinalizadosMes(dados.finalizadosPorMes); } catch(e) { console.warn('Erro gráfico finalizados/mês', e); }
          try { criarGraficoPaginasDia(dados.paginasPorDia); } catch(e) { console.warn('Erro gráfico páginas/dia', e); }
          try { criarGraficoGeneros(dados.generos); } catch(e) { console.warn('Erro gráfico gêneros', e); }
          try { criarGraficoDiaSemana(dados.tempoPorDiaSemana); } catch(e) { console.warn('Erro gráfico dia semana', e); }
          try { criarHeatmap(dados.heatmap); } catch(e) { console.warn('Erro heatmap', e); }
        }, 100);

        preencherTopAutores(dados.topAutores);
        preencherTopEditoras(dados.topEditoras);
      } else {
        Util.toast('Erro ao carregar estatísticas', 'danger');
      }
    } catch (e) {
      console.error('Erro stats:', e);
      Util.toast('Falha na conexão', 'danger');
    }
    console.log('✅ Módulo Estatísticas pronto.');
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

  function criarGraficoFinalizadosMes(dados) {
    const canvas = document.getElementById('grafico-finalizados-mes');
    console.log('📊 Gráfico finalizados/mês:', dados.labels, dados.valores);
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
    console.log('📈 Gráfico páginas/dia:', dados.labels, dados.valores);
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
    console.log('🍩 Gráfico gêneros:', generos);
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
    console.log('📅 Gráfico dia semana:', dados.labels, dados.valores);
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

  function criarHeatmap(heatmapData) {
    const container = document.getElementById('heatmap-container');
    if (!container) return;
    container.innerHTML = '';
    const diasExibir = heatmapData.slice(0, 84).reverse();
    const maxPag = Math.max(...diasExibir.map(d => d.paginas), 1);
    diasExibir.forEach(dia => {
      const cell = document.createElement('div');
      cell.className = 'heatmap-cell';
      const intensidade = dia.paginas / maxPag;
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

  return { init };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Estatisticas.init());
} else {
  Estatisticas.init();
}
