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
        metaSemanal: 0, // não usado explicitamente, mas mantido
        metaDiaria: 0,
        metaHorasDiaria: Number(document.getElementById('meta-horas-diaria').value) || 0,
        metaHorasSemanal: Number(document.getElementById('meta-horas-semanal').value) || 0,
        metaHorasMensal: Number(document.getElementById('meta-horas-mensal').value) || 0,
        metaHorasAnual: Number(document.getElementById('meta-horas-anual').value) || 0,
        metaSequenciaDias: Number(document.getElementById('meta-sequencia').value) || 0,
        metaGeneros: Number(document.getElementById('meta-generos').value) || 0,
        metaLivrosMes: Number(document.getElementById('meta-livros-mes').value) || 0,
        metaAvaliacoes: Number(document.getElementById('meta-avaliacoes').value) || 0,
        metaAnotacoes: Number(document.getElementById('meta-anotacoes').value) || 0,
        metaLivrosGrandes: Number(document.getElementById('meta-livros-grandes').value) || 0,
        metaPersonalizada: document.getElementById('meta-personalizada').value || ''
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
        preencherFormulario(resp.meta);
        exibirProgresso(resp.meta, resp.progresso);
      }
    } catch (e) {
      console.error(e);
    }
  }

  function preencherFormulario(meta) {
    document.getElementById('meta-ano').value = meta.ano || new Date().getFullYear();
    document.getElementById('meta-livros').value = meta.metaLivros || 0;
    document.getElementById('meta-paginas').value = meta.metaPaginas || 0;
    document.getElementById('meta-mensal').value = meta.metaMensal || 0;
    document.getElementById('meta-horas-diaria').value = meta.metaHorasDiaria || 0;
    document.getElementById('meta-horas-semanal').value = meta.metaHorasSemanal || 0;
    document.getElementById('meta-horas-mensal').value = meta.metaHorasMensal || 0;
    document.getElementById('meta-horas-anual').value = meta.metaHorasAnual || 0;
    document.getElementById('meta-sequencia').value = meta.metaSequenciaDias || 0;
    document.getElementById('meta-generos').value = meta.metaGeneros || 0;
    document.getElementById('meta-livros-mes').value = meta.metaLivrosMes || 0;
    document.getElementById('meta-avaliacoes').value = meta.metaAvaliacoes || 0;
    document.getElementById('meta-anotacoes').value = meta.metaAnotacoes || 0;
    document.getElementById('meta-livros-grandes').value = meta.metaLivrosGrandes || 0;
    document.getElementById('meta-personalizada').value = meta.metaPersonalizada || '';
  }

  function exibirProgresso(meta, prog) {
    const container = document.getElementById('progresso-container');
    container.innerHTML = '';

    // Array de cards
    const cards = [
      { titulo: 'Livros', atual: prog.livrosFinalizados, meta: meta.metaLivros, percentual: prog.percentualLivros, icone: '📚' },
      { titulo: 'Páginas', atual: prog.paginasLidasAno.toLocaleString('pt-BR'), meta: meta.metaPaginas, percentual: prog.percentualPaginas, icone: '📄' },
      { titulo: 'Horas hoje', atual: prog.horasHoje + 'h', meta: meta.metaHorasDiaria + 'h', percentual: prog.percentualHorasDiaria, icone: '⏱️' },
      { titulo: 'Horas semana', atual: prog.horasSemana + 'h', meta: meta.metaHorasSemanal + 'h', percentual: prog.percentualHorasSemanal, icone: '📅' },
      { titulo: 'Horas mês', atual: prog.horasMes + 'h', meta: meta.metaHorasMensal + 'h', percentual: prog.percentualHorasMensal, icone: '🗓️' },
      { titulo: 'Horas ano', atual: prog.horasAno + 'h', meta: meta.metaHorasAnual + 'h', percentual: prog.percentualHorasAnual, icone: '📆' },
      { titulo: 'Sequência (maior)', atual: prog.maiorSequenciaAno + ' dias', meta: meta.metaSequenciaDias + ' dias', percentual: prog.percentualSequencia, icone: '🔥' },
      { titulo: 'Gêneros diferentes', atual: prog.generosUnicos, meta: meta.metaGeneros, percentual: prog.percentualGeneros, icone: '🎨' },
      { titulo: 'Média livros/mês', atual: prog.mediaLivrosMes, meta: meta.metaLivrosMes, percentual: prog.percentualLivrosMes, icone: '📊' },
      { titulo: 'Avaliações (%)', atual: prog.percentualAvaliados + '%', meta: meta.metaAvaliacoes + '%', percentual: prog.percentualMetaAvaliacoes, icone: '⭐' },
      { titulo: 'Anotações/Citações', atual: prog.totalAnotacoesCitacoes, meta: meta.metaAnotacoes, percentual: prog.percentualAnotacoes, icone: '📝' },
      { titulo: 'Livros grandes (+600)', atual: prog.livrosGrandes, meta: meta.metaLivrosGrandes, percentual: prog.percentualLivrosGrandes, icone: '🐘' }
    ];

    if (meta.metaPersonalizada) {
      cards.push({ titulo: 'Meta pessoal', atual: meta.metaPersonalizada, meta: '', percentual: 0, icone: '💡', personalizada: true });
    }

    cards.forEach(card => {
      const col = document.createElement('div');
      col.className = 'col-md-6 col-lg-4';
      col.innerHTML = `
        <div class="card h-100 shadow-sm">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <h6 class="card-title mb-0">${card.icone} ${card.titulo}</h6>
              ${!card.personalizada ? `<span class="badge bg-primary">${card.percentual}%</span>` : ''}
            </div>
            ${!card.personalizada ? `
            <div class="progress mb-2" style="height: 8px;">
              <div class="progress-bar ${card.percentual >= 100 ? 'bg-success' : ''}" role="progressbar" style="width: ${card.percentual}%" aria-valuenow="${card.percentual}" aria-valuemin="0" aria-valuemax="100"></div>
            </div>
            <small>${card.atual} de ${card.meta}</small>
            ` : `<p class="mb-0">${card.atual}</p>`}
          </div>
        </div>`;
      container.appendChild(col);
    });
  }

  async function carregarConquistas() {
  try {
    const resp = await API.enviar({ acao: 'listAchievements' });
    const grid = document.getElementById('conquistas-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // Ícones fixos para as conquistas
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

    // Reconectar botão "Verificar novas"
    const btnVerificar = document.getElementById('verificar-conquistas-btn');
    if (btnVerificar) {
      // Remove listeners antigos (se houver) e adiciona novo
      btnVerificar.replaceWith(btnVerificar.cloneNode(true));
      const novoBtn = document.getElementById('verificar-conquistas-btn');
      novoBtn.addEventListener('click', async () => {
        const novas = await API.enviar({ acao: 'checkAchievements' });
        if (Array.isArray(novas) && novas.length > 0) {
          Util.toast(`${novas.length} nova(s) conquista(s)! 🎉`, 'success');
          carregarConquistas(); // recarrega
        } else {
          Util.toast('Nenhuma conquista nova.', 'info');
        }
      });
    }
  } catch (e) {
    console.error('Erro ao carregar conquistas:', e);
  }
}
  return { init };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Metas.init());
} else {
  Metas.init();
}
