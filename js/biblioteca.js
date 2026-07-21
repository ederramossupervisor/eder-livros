const Biblioteca = (() => {
  let livros = [];
  const grid = document.getElementById('biblioteca-grid');
  const searchInput = document.getElementById('biblioteca-search');
  const contador = document.getElementById('biblioteca-contador');

  async function init() {
    if (!grid) return;
    await carregarLivros();
    configurarEventos();
    console.log('✅ Módulo Biblioteca pronto.');
  }

  async function carregarLivros() {
    try {
      const resp = await API.enviar({ acao: 'listAllBooks' });
      if (Array.isArray(resp)) {
        livros = resp;
        DB.salvarLivros(resp).catch(e => console.warn('Cache livros falhou:', e));
        aplicarFiltros();
      } else if (resp && resp.erro) {
        throw new Error(resp.erro);
      }
    } catch (e) {
      console.warn('Falha na API, tentando cache offline...');
      const cached = await DB.obterLivros();
      if (cached && cached.length > 0) {
        livros = cached;
        aplicarFiltros();
        Util.toast('Modo offline - dados do último acesso.', 'info');
      } else {
        Util.toast('Sem conexão e nenhum dado em cache.', 'danger');
      }
    }
  }

  function configurarEventos() {
    searchInput.addEventListener('input', aplicarFiltros);
  }

  function aplicarFiltros() {
    let filtrados = [...livros];

    const termo = searchInput.value.toLowerCase();
    if (termo) {
      filtrados = filtrados.filter(l =>
        (l.Título || '').toLowerCase().includes(termo) ||
        (l.Autor || '').toLowerCase().includes(termo) ||
        (l.Tags || '').toLowerCase().includes(termo)
      );
    }

    // Ordenação padrão: por título
    filtrados.sort((a, b) => (a.Título || '').localeCompare(b.Título || ''));

    contador.textContent = `${filtrados.length} livro(s) encontrado(s)`;
    renderizarGrade(filtrados);
  }

  function renderizarGrade(livrosFiltrados) {
    grid.innerHTML = '';
    if (livrosFiltrados.length === 0) {
      grid.innerHTML = '<div class="col-12 text-center text-muted py-5">Nenhum livro encontrado</div>';
      return;
    }

    livrosFiltrados.forEach(livro => {
      const col = document.createElement('div');
      col.className = 'col-6 col-md-4 col-lg-3 col-xl-2';

      col.innerHTML = `
        <div class="livro-card h-100" data-id="${livro.ID}">
          <div class="capa-wrapper">
            ${livro.URLCapa ? `<img src="${livro.URLCapa}" alt="Capa" loading="lazy">` : '<i class="fas fa-book fa-3x position-absolute top-50 start-50 translate-middle text-muted"></i>'}
            <span class="badge badge-status bg-primary">${livro.Status}</span>
          </div>
          <div class="card-body">
            <div class="titulo" title="${livro.Título}">${livro.Título || 'Sem título'}</div>
            <div class="autor">${livro.Autor || 'Desconhecido'}</div>
          </div>
        </div>`;
      grid.appendChild(col);
    });

    grid.querySelectorAll('.livro-card').forEach(card => {
      card.addEventListener('click', () => abrirModal(card.dataset.id));
    });
  }

  function abrirModal(id) {
    const livro = livros.find(l => l.ID === id);
    if (!livro) return;

    document.getElementById('modal-titulo').textContent = livro.Título || 'Detalhes';
    const progresso = livro.NúmeroPáginas > 0 ? Math.round(((livro.PáginasLidas || 0) / livro.NúmeroPáginas) * 100) : 0;

    document.getElementById('modal-conteudo').innerHTML = `
      <div class="row">
        <div class="col-md-4 text-center mb-3">
          ${livro.URLCapa ? `<img src="${livro.URLCapa}" alt="Capa" class="capa-detalhe img-fluid shadow">` : '<i class="fas fa-book fa-5x text-muted"></i>'}
        </div>
        <div class="col-md-8">
          <h4>${livro.Título}</h4>
          <p class="text-muted">${livro.Autor || 'Autor desconhecido'}</p>
          <table class="table table-sm">
            <tr><td><strong>Status</strong></td><td><span class="badge bg-primary">${livro.Status}</span></td></tr>
            <tr><td><strong>Editora</strong></td><td>${livro.Editora || '-'}</td></tr>
            <tr><td><strong>Ano</strong></td><td>${livro.Ano || '-'}</td></tr>
            <tr><td><strong>Páginas</strong></td><td>${livro.NúmeroPáginas || '-'}</td></tr>
            <tr><td><strong>Páginas lidas</strong></td><td>${livro.PáginasLidas || 0} (${progresso}%)</td></tr>
            <tr><td><strong>Formato</strong></td><td>${livro.Formato || '-'}</td></tr>
            <tr><td><strong>Início</strong></td><td>${formatarData(livro.DataInício)}</td></tr>
            <tr><td><strong>Término</strong></td><td>${formatarData(livro.DataTérmino)}</td></tr>
            <tr><td><strong>Gênero</strong></td><td>${livro.Gênero || '-'}</td></tr>
            <tr><td><strong>Tags</strong></td><td>${livro.Tags || '-'}</td></tr>
            <tr><td><strong>ISBN</strong></td><td>${livro.ISBN || '-'}</td></tr>
            <tr><td><strong>Cadastro</strong></td><td>${Util.formatDate(livro.DataCadastro)}</td></tr>
          </table>
          ${livro.Observacoes ? `<p><strong>Observações:</strong> ${livro.Observacoes}</p>` : ''}
          <div class="mt-3 d-flex gap-2">
            <button class="btn btn-outline-primary btn-editar-livro" data-id="${livro.ID}">Editar</button>
            <button class="btn btn-outline-danger btn-excluir-livro" data-id="${livro.ID}">Excluir</button>
          </div>
        </div>
      </div>`;

    const modal = new bootstrap.Modal(document.getElementById('livro-modal'));
    modal.show();

    document.querySelector('.btn-editar-livro').addEventListener('click', () => {
      modal.hide();
      if (typeof Livros !== 'undefined' && Livros.editarLivro) {
        Livros.editarLivro(livro);
      }
    });

    document.querySelector('.btn-excluir-livro').addEventListener('click', async () => {
      if (confirm('Tem certeza que deseja excluir este livro e todos os seus registros?')) {
        if (!navigator.onLine) {
          Util.toast('Você está offline. Conecte-se para excluir.', 'warning');
          return;
        }
        try {
          await API.enviar({ acao: 'deleteBook', id: livro.ID });
          modal.hide();
          await carregarLivros();
          Util.toast('Livro excluído', 'info');
        } catch (e) {
          Util.toast('Erro ao excluir: ' + e.message, 'danger');
        }
      }
    });
  }

  function formatarData(dataISO) {
    if (!dataISO) return '-';
    try {
      const data = new Date(dataISO);
      const dia = data.getUTCDate().toString().padStart(2, '0');
      const mes = (data.getUTCMonth() + 1).toString().padStart(2, '0');
      const ano = data.getUTCFullYear();
      return `${dia}/${mes}/${ano}`;
    } catch (e) {
      return dataISO;
    }
  }

  return { init };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', Biblioteca.init);
} else {
  Biblioteca.init();
}
