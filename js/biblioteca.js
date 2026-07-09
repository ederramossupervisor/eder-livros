/**
 * Módulo Biblioteca - grade de livros com filtros e detalhes
 */
const Biblioteca = (() => {
  let livros = [];
  const grid = document.getElementById('biblioteca-grid');
  const searchInput = document.getElementById('biblioteca-search');
  const filtroStatus = document.getElementById('filtro-status');
  const filtroGenero = document.getElementById('filtro-genero');
  const ordenacao = document.getElementById('ordenacao');
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
        preencherFiltroGeneros();
        aplicarFiltros();
      } else if (resp && resp.erro) {
        Util.toast('Erro: ' + resp.erro, 'danger');
      }
    } catch (e) {
      Util.toast('Falha ao carregar livros', 'danger');
    }
  }

  function preencherFiltroGeneros() {
    const generos = [...new Set(livros.map(l => l.Gênero).filter(Boolean))].sort();
    generos.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g;
      opt.textContent = g;
      filtroGenero.appendChild(opt);
    });
  }

  function configurarEventos() {
    searchInput.addEventListener('input', aplicarFiltros);
    filtroStatus.addEventListener('change', aplicarFiltros);
    filtroGenero.addEventListener('change', aplicarFiltros);
    ordenacao.addEventListener('change', aplicarFiltros);
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

    if (filtroStatus.value) {
      filtrados = filtrados.filter(l => l.Status === filtroStatus.value);
    }

    if (filtroGenero.value) {
      filtrados = filtrados.filter(l => l.Gênero === filtroGenero.value);
    }

    const ordem = ordenacao.value;
    filtrados.sort((a, b) => {
      switch (ordem) {
        case 'titulo': return (a.Título || '').localeCompare(b.Título || '');
        case 'autor': return (a.Autor || '').localeCompare(b.Autor || '');
        case 'data': return new Date(b.DataCadastro) - new Date(a.DataCadastro);
        case 'paginas': return (Number(b.NúmeroPáginas) || 0) - (Number(a.NúmeroPáginas) || 0);
        default: return 0;
      }
    });

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
      const progresso = livro.NúmeroPáginas > 0 ? Math.round(((livro.PáginasLidas || 0) / livro.NúmeroPáginas) * 100) : 0;

      col.innerHTML = `
        <div class="livro-card h-100" data-id="${livro.ID}">
          <div class="capa-wrapper">
            ${livro.URLCapa ? `<img src="${livro.URLCapa}" alt="Capa" loading="lazy">` : '<i class="fas fa-book fa-3x position-absolute top-50 start-50 translate-middle text-muted"></i>'}
            <span class="badge badge-status bg-primary">${livro.Status}</span>
          </div>
          <div class="card-body">
            <div class="titulo" title="${livro.Título}">${livro.Título || 'Sem título'}</div>
            <div class="autor">${livro.Autor || 'Desconhecido'}</div>
            ${livro.Status === 'Lendo' || livro.Status === 'Finalizado' ? `
            <div class="progress mt-2">
              <div class="progress-bar bg-success" role="progressbar" style="width: ${progresso}%" aria-valuenow="${progresso}" aria-valuemin="0" aria-valuemax="100">${progresso}%</div>
            </div>` : ''}
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

    // Adicionar eventos aos botões após o modal ser inserido no DOM
    document.querySelector('.btn-editar-livro').addEventListener('click', () => {
  const modalInstance = bootstrap.Modal.getInstance(document.getElementById('livro-modal'));
  modalInstance.hide();

  // Verifica se o módulo Livros e a função editarLivro estão disponíveis
  if (typeof Livros !== 'undefined' && typeof Livros.editarLivro === 'function') {
    Livros.editarLivro(livro);
  } else {
    // Tenta inicializar o módulo Livros manualmente, se necessário
    if (typeof Livros !== 'undefined' && typeof Livros.init === 'function') {
      Livros.init();
      // Aguarda um pequeno tempo e tenta novamente
      setTimeout(() => {
        if (typeof Livros.editarLivro === 'function') {
          Livros.editarLivro(livro);
        } else {
          Util.toast('Módulo de edição não disponível. Recarregue a página.', 'danger');
        }
      }, 300);
    } else {
      Util.toast('Módulo de edição não disponível.', 'danger');
    }
  }
});

    document.querySelector('.btn-excluir-livro').addEventListener('click', async () => {
      if (confirm('Tem certeza que deseja excluir este livro e todos os seus registros?')) {
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

  return { init };
})();

// Inicialização segura
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', Biblioteca.init);
} else {
  Biblioteca.init();
}
