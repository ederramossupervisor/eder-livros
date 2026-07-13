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
      try {
        const resp = await API.enviar({ acao: 'saveGoal', meta });
        if (resp && resp.status === 'ok') {
          Util.toast('Metas salvas!', 'success');
          carregarMetas();
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
        document.getElementById('meta-livros').value = resp.meta.metaLivros || 0;
        document.getElementById('meta-paginas').value = resp.meta.metaPaginas || 0;
        document.getElementById('meta-mensal').value = resp.meta.metaMensal || 0;
        document.getElementById('meta-semanal').value = resp.meta.metaSemanal || 0;
        document.getElementById('meta-diaria').value = resp.meta.metaDiaria || 0;

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

      // Mapeamento de ícones (emojis) para cada conquista
      const icones = {
        'Primeiro livro': 'fa-book',
        'Leitor iniciante': 'fa-book-open',
        'Leitor dedicado': 'fa-award',
        'Devorador de livros': 'fa-fire',
        'Página 1000': 'fa-file-alt',
        'Página 5000': 'fa-copy',
        'Maratona de 7 dias': 'fa-calendar-check',
        'Maratona de 30 dias': 'fa-calendar-alt',
        'Livro gigante': 'fa-weight-hanging',
        'Favorito': 'fa-star',
        'Leitor global': 'fa-globe-americas',
        'Leitor noturno': 'fa-moon',
        'Colecionador de clássicos': 'fa-landmark',
        'Diversidade literária': 'fa-rainbow',
        'Anotador': 'fa-pen',
        'Viajante literário': 'fa-map-marked-alt',
        'Volta ao Mundo': 'fa-globe-americas'  // NOVO (pode usar ícone de globo)
      };
      // Descrições (tooltips) para cada conquista
      const descricoes = {
        'Primeiro livro': 'Cadastrar o primeiro livro na biblioteca.',
        'Leitor iniciante': 'Finalizar a leitura de 3 livros.',
        'Leitor dedicado': 'Finalizar a leitura de 10 livros.',
        'Devorador de livros': 'Finalizar a leitura de 50 livros.',
        'Página 1000': 'Acumular 1.000 páginas lidas.',
        'Página 5000': 'Acumular 5.000 páginas lidas.',
        'Maratona de 7 dias': 'Ler por 7 dias consecutivos.',
        'Maratona de 30 dias': 'Ler por 30 dias consecutivos.',
        'Livro gigante': 'Ler um livro com mais de 500 páginas.',
        'Favorito': 'Marcar um livro como favorito.',
        'Leitor global': 'Ler um livro em outro idioma (diferente de Português).',
        'Leitor noturno': 'Registrar uma sessão de leitura após as 23h.',
        'Colecionador de clássicos': 'Ler 5 livros do gênero Literatura Clássica ou Clássico.',
        'Diversidade literária': 'Ler livros de 10 gêneros diferentes.',
        'Anotador': 'Escrever 20 anotações de livros.',
        'Viajante literário': 'Ler livros em 3 idiomas diferentes.',
        'Volta ao Mundo': 'Ler livros de autores de 5 nacionalidades diferentes.'  // NOVA
      };
      const nomesObtidos = (Array.isArray(resp) ? resp : []).map(c => c.Nome);

      Object.keys(icones).forEach(nome => {
        const obtida = nomesObtidos.includes(nome);
        const descricao = descricoes[nome] || 'Conquista do sistema.';
        const col = document.createElement('div');
        col.className = 'col-6 col-md-4 col-lg-3 col-xl-2';
        col.innerHTML = `
          <div class="conquista-card ${obtida ? 'conquistada' : ''}" title="${descricao}" style="cursor: help;">
            <div class="conquista-badge mx-auto mb-2"><i class="fas ${icones[nome]} fa-2x"></i></div>
            <strong>${nome} <i class="fas fa-question-circle text-muted small"></i></strong>
            ${obtida ? '<span class="badge bg-success d-block mt-1">Conquistada</span>' : '<span class="badge bg-light text-muted d-block mt-1">Bloqueada</span>'}
          </div>`;
        grid.appendChild(col);
      });

      document.getElementById('verificar-conquistas-btn').onclick = async () => {
        const novas = await API.enviar({ acao: 'checkAchievements' });
        if (Array.isArray(novas) && novas.length > 0) {
          Util.toast(`${novas.length} nova(s) conquista(s)! 🎉`, 'success');
          carregarConquistas();
        } else {
          Util.toast('Nenhuma conquista nova.', 'info');
        }
      };
    } catch (e) {
      console.error('Erro conquistas:', e);
    }
  }

  return { init };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Metas.init());
} else {
  Metas.init();
}
