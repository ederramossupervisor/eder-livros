/**
 * Módulo de Calendário de Leitura – integrado às Estatísticas
 */
const CalendarioLeitura = (() => {
  let anoAtual, mesAtual;

  async function init(ano, mes) {
    const grid = document.getElementById('calendario-grid');
    if (!grid) return;

    anoAtual = ano || new Date().getFullYear();
    mesAtual = mes || new Date().getMonth() + 1;

    document.getElementById('calendario-mes-anterior').addEventListener('click', () => mudarMes(-1));
    document.getElementById('calendario-mes-proximo').addEventListener('click', () => mudarMes(1));

    await carregarCalendario();
  }

  async function mudarMes(delta) {
    mesAtual += delta;
    if (mesAtual > 12) { mesAtual = 1; anoAtual++; }
    if (mesAtual < 1) { mesAtual = 12; anoAtual--; }
    await carregarCalendario();
  }

  async function carregarCalendario() {
    const grid = document.getElementById('calendario-grid');
    const titulo = document.getElementById('calendario-mes-ano');
    if (!grid || !titulo) return;

    titulo.textContent = `${new Date(anoAtual, mesAtual - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`;

    grid.innerHTML = '<div class="col text-center text-muted">Carregando...</div>';

    try {
      const dados = await API.enviar({ acao: 'calendario', ano: anoAtual, mes: mesAtual });
      if (dados && !dados.erro) {
        renderizarCalendario(dados);
      } else {
        grid.innerHTML = '<div class="col-12 text-center text-muted">Erro ao carregar.</div>';
      }
    } catch (e) {
      console.error('Erro calendário:', e);
      grid.innerHTML = '<div class="col-12 text-center text-muted">Falha na conexão.</div>';
    }
  }

  function renderizarCalendario(dados) {
    const grid = document.getElementById('calendario-grid');
    grid.innerHTML = '';

    const primeiroDia = new Date(anoAtual, mesAtual - 1, 1).getDay(); // 0=Dom
    const ultimoDia = new Date(anoAtual, mesAtual, 0).getDate();

    // Dias vazios antes do primeiro dia
    for (let i = 0; i < primeiroDia; i++) {
      const div = document.createElement('div');
      div.className = 'col text-center p-1';
      grid.appendChild(div);
    }

    // Dias do mês
    for (let dia = 1; dia <= ultimoDia; dia++) {
      const dateStr = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      const livros = dados[dateStr] || [];

      // Dentro do for (dia = 1; dia <= ultimoDia; dia++):
      const div = document.createElement('div');
      div.className = 'col calendario-dia text-center p-1';
      if (livros.length > 0) {
        div.classList.add('com-leitura');
        const livro = livros[0];
        div.innerHTML = `
          <small class="d-block">${dia}</small>
          ${livro.urlCapa
            ? `<img src="${livro.urlCapa}" alt="${livro.titulo}" title="${livro.titulo}">`
            : `<i class="fas fa-book text-primary" title="${livro.titulo}"></i>`}
        `;
      } else {
        div.innerHTML = `<small>${dia}</small>`;
      }
      grid.appendChild(div);
    }
  }

  return { init };
})();

// Inicialização segura – será chamada pelo módulo Estatisticas após carregar os gráficos
