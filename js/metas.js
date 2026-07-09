const Metas = (() => {
  async function init() {
    const page = document.getElementById('page-metas');
    if (!page || !page.classList.contains('active')) return;

    console.log('🎯 Carregando metas...');
    configurarForm();
    await carregarMetas();
    await carregarConquistas();
    console.log('✅ Módulo Metas pronto.');
  }

  function configurarForm() {
    const form = document.getElementById('metas-form');
    // Ano atual padrão
    document.getElementById('meta-ano').value = new Date().getFullYear();

    form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const meta = {
      ano: Number(document.getElementById('meta-ano').value) || new Date().getFullYear(),
      metaLivros: Number(document.getElementById('meta-livros').value) || 0,
      metaPaginas: Number(document.getElementById('meta-paginas').value) || 0,
      metaMensal: Number(document.getElementById('meta-mensal').value) || 0,
      metaSemanal: Number(document.getElementById('meta-semanal').value) || 0,
      metaDiaria: Number(document.getElementById('meta-diaria').value) || 0
    };
  
    // Validação simples
    if (!meta.ano || meta.ano < 2020 || meta.ano > 2100) {
      Util.toast('Informe um ano válido.', 'warning');
      return;
    }
  
    try {
      const resp = await API.enviar({ acao: 'saveGoal', meta });
      if (resp && resp.status === 'ok') {
        Util.toast('Metas salvas!', 'success');
        carregarMetas(); // recarrega os dados
      } else {
        throw new Error(resp?.erro || 'Falha no servidor');
      }
    } catch (err) {
      Util.toast('Erro ao salvar metas: ' + err.message, 'danger');
    }
  });
  }

  async function carregarMetas() {
    try {
      const resp = await API.enviar({ acao: 'getGoals' });
      if (resp && resp.progresso) {
        // Preencher formulário
        document.getElementById('meta-livros').value = resp.meta.metaLivros;
        document.getElementById('meta-paginas').value = resp.meta.metaPaginas;
        document.getElementById('meta-mensal').value = resp.meta.metaMensal;
        document.getElementById('meta-semanal').value = resp.meta.metaSemanal;
        document.getElementById('meta-diaria').value = resp.meta.metaDiaria;

        // Progresso
        const progLivros = document.getElementById('prog-livros');
        progLivros.style.width = resp.progresso.percentualLivros + '%';
        progLivros.textContent = resp.progresso.percentualLivros + '%';
        document.getElementById('texto-prog-livros').textContent =
          `${resp.progresso.livrosFinalizados} de ${resp.meta.metaLivros} livros`;

        const progPaginas = document.getElementById('prog-paginas');
        progPaginas.style.width = resp.progresso.percentualPaginas + '%';
        progPaginas.textContent = resp.progresso.percentualPaginas + '%';
        document.getElementById('texto-prog-paginas').textContent =
          `${resp.progresso.paginasLidasAno.toLocaleString('pt-BR')} de ${resp.meta.metaPaginas.toLocaleString('pt-BR')} páginas`;

        document.getElementById('info-meta-mensal').textContent =
          `Faltam ${resp.progresso.paginasParaMetaMensal.toLocaleString('pt-BR')} páginas para bater a meta mensal. ` +
          (resp.progresso.paginasPorDiaNecessarias > 0
            ? `Leia ${resp.progresso.paginasPorDiaNecessarias} páginas por dia.`
            : 'Meta mensal já batida! 🎉');
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function carregarConquistas() {
    try {
      const resp = await API.enviar({ acao: 'listAchievements' });
      const grid = document.getElementById('conquistas-grid');
      grid.innerHTML = '';

      // Conquistas predefinidas com ícones
      const icones = {
        'Primeiro livro': '📖',
        'Leitor iniciante': '📚',
        'Leitor dedicado': '🏅',
        'Devorador de livros': '🔥',
        'Página 1000': '📄',
        'Página 5000': '📑',
        'Maratona de 7 dias': '🗓️',
        'Maratona de 30 dias': '📅',
        'Livro gigante': '🐘',
        'Favorito': '⭐',
        'Leitor global': '🌍'
      };

      // Conquistas já obtidas
      const nomesObtidos = (Array.isArray(resp) ? resp : []).map(c => c.Nome);

      Object.keys(icones).forEach(nome => {
        const obtida = nomesObtidos.includes(nome);
        const col = document.createElement('div');
        col.className = 'col-6 col-md-4 col-lg-3 col-xl-2';
        col.innerHTML = `
          <div class="conquista-card ${obtida ? 'conquistada' : ''}">
            <div class="conquista-badge mx-auto mb-2">${icones[nome]}</div>
            <strong>${nome}</strong>
            ${obtida ? '<span class="badge bg-success d-block mt-1">Conquistada</span>' : '<span class="badge bg-light text-muted d-block mt-1">Bloqueada</span>'}
          </div>`;
        grid.appendChild(col);
      });

      // Botão verificar novas
      document.getElementById('verificar-conquistas-btn').addEventListener('click', async () => {
        const novas = await API.enviar({ acao: 'checkAchievements' });
        if (Array.isArray(novas) && novas.length > 0) {
          Util.toast(`${novas.length} nova(s) conquista(s)! 🎉`, 'success');
          carregarConquistas();
        } else {
          Util.toast('Nenhuma conquista nova.', 'info');
        }
      });

    } catch (e) {
      console.error('Erro conquistas:', e);
    }
  }

  return { init };
})();

// Inicialização segura
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Metas.init());
} else {
  Metas.init();
}
