const Anotacoes = (() => {
  async function init() {
    const page = document.getElementById('page-anotacoes');
    if (!page || !page.classList.contains('active')) return;

    console.log('📝 Carregando Anotações e Citações...');
    await carregarLivrosDropdown();
    configurarForms();
    await listarAnotacoes();
    await listarCitacoes();
    console.log('✅ Módulo Anotações pronto.');
  }

  async function carregarLivrosDropdown() {
    try {
      const resp = await API.enviar({ acao: 'listBooks' });
      if (Array.isArray(resp)) {
        ['anot-livro', 'cit-livro', 'filtro-livro-anot'].forEach(id => {
          const select = document.getElementById(id);
          if (!select) return;
          select.innerHTML = '<option value="">Selecione...</option>';
          resp.forEach(livro => {
            const opt = document.createElement('option');
            opt.value = livro.ID;
            opt.textContent = livro.Título + ' - ' + livro.Autor;
            select.appendChild(opt);
          });
        });
      }
    } catch (e) {
      console.error('Erro ao carregar livros para dropdown', e);
    }
  }

  function configurarForms() {
    // Anotação
    document.getElementById('form-anotacao').addEventListener('submit', async (e) => {
      e.preventDefault();
      const anotacao = {
        livroID: document.getElementById('anot-livro').value,
        capitulo: document.getElementById('anot-capitulo').value,
        pagina: document.getElementById('anot-pagina').value,
        categoria: document.getElementById('anot-categoria').value,
        resumo: document.getElementById('anot-resumo').value,
        trecho: document.getElementById('anot-trecho').value,
        comentario: document.getElementById('anot-comentario').value
      };
      if (!anotacao.livroID) return Util.toast('Selecione um livro', 'warning');
      try {
        const resp = await API.enviar({ acao: 'addNote', anotacao });
        if (resp && resp.status === 'ok') {
          Util.toast('Anotação salva!', 'success');
          document.getElementById('form-anotacao').reset();
          listarAnotacoes();
        }
      } catch (err) {
        Util.toast('Erro ao salvar anotação', 'danger');
      }
    });

    // Citação
    document.getElementById('form-citacao').addEventListener('submit', async (e) => {
      e.preventDefault();
      const citacao = {
        livroID: document.getElementById('cit-livro').value,
        trecho: document.getElementById('cit-trecho').value,
        pagina: document.getElementById('cit-pagina').value,
        comentario: document.getElementById('cit-comentario').value
      };
      if (!citacao.livroID || !citacao.trecho) return Util.toast('Livro e trecho são obrigatórios', 'warning');
      try {
        const resp = await API.enviar({ acao: 'addQuote', citacao });
        if (resp && resp.status === 'ok') {
          Util.toast('Citação salva!', 'success');
          document.getElementById('form-citacao').reset();
          listarCitacoes();
        }
      } catch (err) {
        Util.toast('Erro ao salvar citação', 'danger');
      }
    });

    // Filtro de livro nas anotações
    document.getElementById('filtro-livro-anot').addEventListener('change', listarAnotacoes);
  }

  async function listarAnotacoes() {
    const filtro = document.getElementById('filtro-livro-anot')?.value || '';
    try {
      const resp = await API.enviar({ acao: 'listNotes', livroID: filtro });
      const container = document.getElementById('lista-anotacoes');
      container.innerHTML = '';
      if (Array.isArray(resp) && resp.length > 0) {
        resp.forEach(a => {
          const div = document.createElement('div');
          div.className = 'anotacao-card';
          div.innerHTML = `
            <div class="d-flex justify-content-between">
              <span class="badge bg-secondary">${a.Categoria || 'Geral'}</span>
              <small class="text-muted">${a.Capítulo ? 'Cap. ' + a.Capítulo : ''} ${a.Página ? 'Pág. ' + a.Página : ''}</small>
            </div>
            ${a.Resumo ? `<p class="mt-2"><strong>Resumo:</strong> ${a.Resumo}</p>` : ''}
            ${a.Trecho ? `<blockquote>${a.Trecho}</blockquote>` : ''}
            ${a.Comentario ? `<p><em>${a.Comentario}</em></p>` : ''}
          `;
          container.appendChild(div);
        });
      } else {
        container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-sticky-note fa-3x text-muted mb-3"></i>
          <p class="text-muted">Nenhuma anotação encontrada.</p>
        </div>`;
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function listarCitacoes() {
    try {
      const resp = await API.enviar({ acao: 'listQuotes' });
      const container = document.getElementById('lista-citacoes');
      container.innerHTML = '';
      if (Array.isArray(resp) && resp.length > 0) {
        resp.forEach(c => {
          const div = document.createElement('div');
          div.className = 'citacao-card';
          div.innerHTML = `
            <blockquote>${c.Trecho}</blockquote>
            <div class="d-flex justify-content-between">
              <small>Pág. ${c.Página || '-'}</small>
              <small class="text-muted">${c.Comentario || ''}</small>
            </div>
          `;
          container.appendChild(div);
        });
      } else {
        container.innerHTML = '<p class="text-muted">Nenhuma citação salva.</p>';
      }
    } catch (e) {
      console.error(e);
    }
  }

  return { init };
})();

// Inicialização segura
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Anotacoes.init());
} else {
  Anotacoes.init();
}
