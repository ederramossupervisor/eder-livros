const Anotacoes = (() => {
  let todasAnotacoes = [];
  let livrosCache = [];

  async function init() {
    const page = document.getElementById('page-anotacoes');
    if (!page || !page.classList.contains('active')) return;

    console.log('📝 Carregando Anotações...');
    await carregarLivrosCache();
    await carregarTodasAnotacoes();
    configurarPesquisa();
    console.log('✅ Módulo Anotações pronto.');
  }

  async function carregarLivrosCache() {
    try {
      const resp = await API.enviar({ acao: 'listBooks' });
      if (Array.isArray(resp)) {
        livrosCache = resp;
      }
    } catch (e) {
      console.warn('Erro ao carregar livros para cache de anotações', e);
    }
  }

  async function carregarTodasAnotacoes() {
    try {
      const resp = await API.enviar({ acao: 'listNotes', livroID: '' });
      if (Array.isArray(resp)) {
        todasAnotacoes = resp;
        DB.salvarAnotacoes(resp).catch(e => console.warn('Cache anotações falhou:', e));
      }
    } catch (e) {
      console.warn('Falha na API, tentando cache offline...');
      const cached = await DB.obterAnotacoes();
      if (cached.length > 0) {
        todasAnotacoes = cached;
        Util.toast('Modo offline - dados do último acesso.', 'info');
      }
    }
    renderizarAnotacoes(todasAnotacoes);
  }

  function configurarPesquisa() {
    const searchInput = document.getElementById('anotacoes-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const termo = e.target.value.toLowerCase().trim();
        if (!termo) {
          renderizarAnotacoes(todasAnotacoes);
          return;
        }
        const filtradas = todasAnotacoes.filter(anot => {
          const livro = livrosCache.find(l => l.ID === anot.LivroID);
          const nomeLivro = livro ? livro.Título + ' ' + livro.Autor : '';
          const campos = [
            nomeLivro,
            anot.Capítulo || '',
            anot.Trecho || '',
            anot['Comentário'] || '',
            anot.Resumo || '',
            anot.Categoria || ''
          ];
          return campos.some(campo => String(campo || '').toLowerCase().includes(termo));
        });
        renderizarAnotacoes(filtradas);
      });
    }
  }

  function abrirModalCompartilhamento(trecho, livro, autor, urlCapa) {
    // Preenche o modal de citação
    document.getElementById('citacao-texto').textContent = `"${trecho}"`;
    document.getElementById('citacao-livro').textContent = livro;
    document.getElementById('citacao-autor').textContent = autor;

    // Configura botão de fundo com capa
    const btnCapa = document.getElementById('btn-fundo-capa');
    if (btnCapa) {
      btnCapa.onclick = async () => {
        if (!urlCapa) {
          Util.toast('Este livro não possui capa cadastrada.', 'warning');
          return;
        }
        const cartao = document.getElementById('cartao-citacao');
        const resp = await API.enviar({ acao: 'proxyImage', url: urlCapa });
        if (resp && resp.dataUrl) {
          cartao.style.background = `url(${resp.dataUrl}) center/cover no-repeat`;
          cartao.style.color = '#fff';
        }
      };
    }

    // Abre o modal (Bootstrap)
    const modal = new bootstrap.Modal(document.getElementById('modal-compartilhar-citacao'));
    modal.show();
  }

  function renderizarAnotacoes(lista) {
    const container = document.getElementById('lista-anotacoes');
    if (!container) return;
    container.innerHTML = '';

    if (lista.length === 0) {
      container.innerHTML = `
        <div class="empty-state text-center text-muted py-5">
          <i class="fas fa-sticky-note fa-3x mb-3"></i>
          <p>Nenhuma anotação encontrada.</p>
        </div>`;
      return;
    }

    lista.forEach(a => {
      const livro = livrosCache.find(l => l.ID === a.LivroID);
      const nomeLivro = livro ? livro.Título : 'Livro desconhecido';
      const nomeAutor = livro ? livro.Autor : 'Autor desconhecido';
      const urlCapa = livro ? (livro.URLCapa || livro.ImagemCapa || '') : '';
      const trecho = a.Trecho || a['Comentário'] || '';

      const div = document.createElement('div');
      div.className = 'anotacao-card d-flex flex-column';

      div.innerHTML = `
        <div class="cabecalho d-flex justify-content-between align-items-center mb-2">
          <span class="badge bg-secondary">${a.Categoria || 'Geral'}</span>
          <div class="d-flex align-items-center gap-1">
            ${trecho ? `
            <button class="btn btn-sm btn-link p-0 text-secondary compartilhar-anotacao" 
                    title="Compartilhar como citação" 
                    data-trecho="${trecho.replace(/"/g, '&quot;')}" 
                    data-livro="${nomeLivro}" 
                    data-autor="${nomeAutor}" 
                    data-capa="${urlCapa}">
              <i class="fas fa-camera"></i>
            </button>` : ''}
            <span class="data text-muted" style="font-size:0.7rem; white-space:nowrap;">
              ${a.Data ? new Date(a.Data).toLocaleDateString('pt-BR') : ''}
            </span>
          </div>
        </div>

        <div class="titulo-livro mb-2" style="font-size:0.85rem; font-weight:500; color:#333;">
          ${nomeLivro} – ${nomeAutor}
        </div>

        ${a.Capítulo ? `<p class="mb-1"><strong>Capítulo:</strong> ${a.Capítulo}</p>` : ''}
        ${a.Página ? `<p class="mb-1"><strong>Página:</strong> ${a.Página}</p>` : ''}
        ${a.Resumo ? `<p class="mb-1"><strong>Resumo:</strong> ${a.Resumo}</p>` : ''}
        ${a.Trecho ? `<blockquote class="blockquote mb-1">${a.Trecho}</blockquote>` : ''}
        ${a['Comentário'] ? `<p class="mb-0 fst-italic text-secondary">${a['Comentário']}</p>` : ''}
      `;

      container.appendChild(div);
    });

    // Eventos de compartilhar
    container.querySelectorAll('.compartilhar-anotacao').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const trecho = btn.dataset.trecho;
        const livro = btn.dataset.livro;
        const autor = btn.dataset.autor;
        const capa = btn.dataset.capa;
        abrirModalCompartilhamento(trecho, livro, autor, capa);
      });
    });
  }

  return { init };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Anotacoes.init());
} else {
  Anotacoes.init();
}
