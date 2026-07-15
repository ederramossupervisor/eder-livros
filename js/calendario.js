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
      const response = await API.enviar({ acao: 'calendario', ano: anoAtual, mes: mesAtual });
      if (response && !response.erro) {
        renderizarCalendario(response.dias, response.citacoes);
      } else {
        grid.innerHTML = '<div class="col-12 text-center text-muted">Erro ao carregar.</div>';
      }
    } catch (e) {
      console.error('Erro calendário:', e);
      grid.innerHTML = '<div class="col-12 text-center text-muted">Falha na conexão.</div>';
    }
  }

  function renderizarCalendario(dias, citacoes) {
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
      const livros = dias[dateStr] || [];
      const temCitacao = citacoes && citacoes.includes(dateStr);

      const div = document.createElement('div');
      div.className = 'col calendario-dia text-center p-1';
      div.style.position = 'relative';

      if (livros.length > 0) {
        div.classList.add('com-leitura');
        const livro = livros[0];
        div.innerHTML = `
          <small class="d-block">${dia}</small>
          ${livro.urlCapa
            ? `<img src="${livro.urlCapa}" alt="${livro.titulo}" title="${livro.titulo}" style="width:100%; max-height:45px; object-fit:contain; border-radius:4px;">`
            : `<i class="fas fa-book text-primary" title="${livro.titulo}"></i>`}
        `;
      } else {
        div.innerHTML = `<small>${dia}</small>`;
      }

      // Ícone de citação sobreposto
      if (temCitacao) {
        const badge = document.createElement('span');
        badge.className = 'position-absolute top-0 end-0 badge rounded-pill bg-warning text-dark p-1';
        badge.style.fontSize = '0.6rem';
        badge.innerHTML = '<i class="fas fa-quote-right"></i>';
        badge.title = 'Contém citação';
        div.appendChild(badge);
      }

      grid.appendChild(div);
    }
  }

  return { init };
})();

// Inicialização segura – será chamada pelo módulo Estatisticas após carregar os gráficos
