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
      const resp = await API.enviar({ acao: 'listNotes', livroID: '' }); // vazio = todas
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
          // Busca nos campos relevantes
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

    const div = document.createElement('div');
    div.className = 'anotacao-card d-flex flex-column';

    div.innerHTML = `
      <!-- Cabeçalho: badge + livro na esquerda, data na direita -->
      <div class="cabecalho d-flex justify-content-between align-items-start mb-2">
        <div class="info d-flex align-items-center flex-wrap me-2" style="min-width:0;">
          <span class="badge bg-secondary me-2">${a.Categoria || 'Geral'}</span>
          <span class="titulo-livro text-truncate" style="max-width: 150px;" title="${nomeLivro} – ${nomeAutor}">
            ${nomeLivro} – ${nomeAutor}
          </span>
        </div>
        <span class="data text-muted flex-shrink-0" style="font-size:0.7rem;">
          ${a.Data ? new Date(a.Data).toLocaleDateString('pt-BR') : ''}
        </span>
      </div>

      <!-- Conteúdo da anotação -->
      ${a.Capítulo ? `<p class="mb-1"><strong>Capítulo:</strong> ${a.Capítulo}</p>` : ''}
      ${a.Página ? `<p class="mb-1"><strong>Página:</strong> ${a.Página}</p>` : ''}
      ${a.Resumo ? `<p class="mb-1"><strong>Resumo:</strong> ${a.Resumo}</p>` : ''}
      ${a.Trecho ? `<blockquote class="blockquote mb-1">${a.Trecho}</blockquote>` : ''}
      ${a['Comentário'] ? `<p class="mb-0 fst-italic text-secondary">${a['Comentário']}</p>` : ''}
    `;

    container.appendChild(div);
  });
}
  return { init };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Anotacoes.init());
} else {
  Anotacoes.init();
}
