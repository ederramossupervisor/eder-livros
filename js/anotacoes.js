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

  // --- ABRIR MODAL DE COMPARTILHAMENTO (CORRIGIDO) ---
  function abrirModalCompartilhamento(trecho, livro, autor, urlCapa) {
    const modalElement = document.getElementById('modal-compartilhar-citacao');

    // Fecha qualquer instância anterior com segurança
    const existingModal = bootstrap.Modal.getInstance(modalElement);
    if (existingModal) {
      existingModal.hide();
      // Aguarda o término do hide antes de abrir novamente
      modalElement.addEventListener('hidden.bs.modal', () => {
        configurarEAbrirModal(trecho, livro, autor, urlCapa);
      }, { once: true });
    } else {
      configurarEAbrirModal(trecho, livro, autor, urlCapa);
    }
  }

  function configurarEAbrirModal(trecho, livro, autor, urlCapa) {
    // Preenche os campos de texto
    document.getElementById('citacao-texto').textContent = `"${trecho}"`;
    document.getElementById('citacao-livro').textContent = livro;
    document.getElementById('citacao-autor').textContent = autor;

    const cartao = document.getElementById('cartao-citacao');

    // --- CORES DE FUNDO ---
    const containerCores = document.getElementById('cores-predefinidas');
    if (containerCores) {
      const coresPredefinidas = [
        { nome: 'Escuro padrão', valor: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', corTexto: '#fff' },
        { nome: 'Roxo elegante', valor: 'linear-gradient(135deg, #4c1d95 0%, #1e1b4b 100%)', corTexto: '#fff' },
        { nome: 'Azul sereno', valor: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)', corTexto: '#fff' },
        { nome: 'Verde natureza', valor: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)', corTexto: '#fff' },
        { nome: 'Vinho', valor: 'linear-gradient(135deg, #4c0519 0%, #1f0808 100%)', corTexto: '#fff' },
        { nome: 'Claro limpo', valor: '#f8f9fa', corTexto: '#1e293b' },
        { nome: 'Sépia', valor: '#f5e6d3', corTexto: '#3e2723' },
        { nome: 'Preto', valor: '#000000', corTexto: '#ffffff' }
      ];
      containerCores.innerHTML = '';
      coresPredefinidas.forEach(tema => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-sm btn-outline-secondary';
        btn.style.background = tema.valor;
        btn.style.color = tema.corTexto;
        btn.style.border = '1px solid var(--border-color)';
        btn.textContent = tema.nome;
        btn.addEventListener('click', () => {
          cartao.style.background = tema.valor;
          cartao.style.color = tema.corTexto;
        });
        containerCores.appendChild(btn);
      });
    }

    // --- CAPA DO LIVRO ---
    const btnCapa = document.getElementById('btn-fundo-capa');
    if (btnCapa) {
      btnCapa.onclick = async () => {
        if (!urlCapa) {
          Util.toast('Este livro não possui capa cadastrada.', 'warning');
          return;
        }
        try {
          const resp = await API.enviar({ acao: 'proxyImage', url: urlCapa });
          if (resp && resp.dataUrl) {
            cartao.style.background = `url(${resp.dataUrl}) center/cover no-repeat`;
            cartao.style.color = '#fff';
          }
        } catch (e) {
          Util.toast('Falha ao carregar capa.', 'danger');
        }
      };
    }

    // --- GRADIENTE ALEATÓRIO ---
    const btnGradiente = document.getElementById('btn-fundo-gradiente');
    if (btnGradiente) {
      btnGradiente.onclick = () => {
        const cores = ['#1e293b', '#0f172a', '#4c1d95', '#1e3a5f', '#064e3b', '#4c0519', '#1e1b4b'];
        const c1 = cores[Math.floor(Math.random() * cores.length)];
        const c2 = cores[Math.floor(Math.random() * cores.length)];
        cartao.style.background = `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`;
        cartao.style.color = '#ffffff';
      };
    }

    // --- TAMANHO DA FONTE ---
    const rangeFonte = document.getElementById('range-tamanho-fonte');
    if (rangeFonte) {
      rangeFonte.oninput = (e) => {
        document.getElementById('citacao-texto').style.fontSize = (e.target.value / 16) + 'rem';
      };
    }

    // --- ALINHAMENTO ---
    const botoesAlign = document.querySelectorAll('#modal-compartilhar-citacao [data-align]');
    botoesAlign.forEach(btn => {
      btn.addEventListener('click', function() {
        botoesAlign.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        cartao.style.textAlign = this.dataset.align;
      });
    });
    // Ativar centralizado por padrão
    const btnCentro = document.querySelector('#modal-compartilhar-citacao [data-align="center"]');
    if (btnCentro) {
      btnCentro.classList.add('active');
      cartao.style.textAlign = 'center';
    }

    // --- FORMATO (FEED / STORIES) ---
    function definirFormato(formato) {
      const btnFeed = document.querySelector('#modal-compartilhar-citacao [data-format="feed"]');
      const btnStories = document.querySelector('#modal-compartilhar-citacao [data-format="stories"]');
      cartao.classList.remove('format-feed', 'format-stories');
      if (formato === 'stories') {
        cartao.classList.add('format-stories');
        btnStories.classList.add('active');
        btnFeed.classList.remove('active');
      } else {
        cartao.classList.add('format-feed');
        btnFeed.classList.add('active');
        btnStories.classList.remove('active');
      }
    }

    const btnFeed = document.querySelector('#modal-compartilhar-citacao [data-format="feed"]');
    const btnStories = document.querySelector('#modal-compartilhar-citacao [data-format="stories"]');
    if (btnFeed) btnFeed.onclick = () => definirFormato('feed');
    if (btnStories) btnStories.onclick = () => definirFormato('stories');

    // Iniciar com feed
    definirFormato('feed');

    // --- ABRIR O MODAL ---
    const modal = new bootstrap.Modal(modalElement);
    modal.show();

    // Força foco no botão de download após abertura completa (resolve o aria-hidden)
    modalElement.addEventListener('shown.bs.modal', () => {
      document.getElementById('btn-baixar-citacao')?.focus();
    }, { once: true });
  }

  // --- RENDERIZAR ANOTAÇÕES (POST-IT) ---
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

// Inicialização segura
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Anotacoes.init());
} else {
  Anotacoes.init();
}
