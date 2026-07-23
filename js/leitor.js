const Leitor = (() => {
  // Estado do Leitor
  let tipoArquivo = null; // 'epub' | 'pdf' | 'docx'
  let book = null;        // Instância EPUB
  let rendition = null;   // Instância Rendition EPUB
  let pdfDoc = null;      // Instância PDF.js
  let pdfNumPage = 1;     // Página atual do PDF
  
  // Informações do arquivo/livro aberto
  let currentBookInfo = { id: null, title: '', author: '', bookData: null }; 
  
  // Estado do Cronômetro
  let cronometroAtivo = false;
  let inicioCronometro = null;
  let tempoAcumulado = 0;
  let animFrameId = null;
  let horaInicioSessao = null;
  let paginaInicialCronometro = 1;

  // Variáveis de Controle
  let timeoutSincronizacao = null;
  let modalAssociacaoInstancia = null;

  // Configurações
  let config = {
    fonte: 'Georgia, serif',
    tamanho: 18,
    espacamento: 1.5,
    margem: 5,
    tema: 'claro',
    modoRolagem: 'paginado'
  };

  let _resizeTentativas = 0;

  // Cache do DOM
  const els = {
    container: document.getElementById('leitor-container'),
    titulo: document.getElementById('leitor-titulo-livro'),
    cronometro: document.getElementById('leitor-cronometro'),
    btnIniciar: document.getElementById('btn-leitor-iniciar'),
    btnPausar: document.getElementById('btn-leitor-pausar'),
    btnRetomar: document.getElementById('btn-leitor-retomar'),
    btnFinalizar: document.getElementById('btn-leitor-finalizar'),
    progressoTexto: document.getElementById('leitor-progresso-texto'),
    barraProgresso: document.getElementById('leitor-barra-progresso'),
    paginaAtual: document.getElementById('leitor-pagina-atual'),
    totalPaginas: document.getElementById('leitor-total-paginas'),
    btnVoltar: document.getElementById('btn-voltar-biblioteca')
  };

  // ========== INICIALIZAÇÃO E DEPENDÊNCIAS ==========
  async function init() {
    const page = document.getElementById('page-leitor');
    if (!page || !page.classList.contains('active')) return;

    console.log('📖 Leitor Multiformato Inicializado.');
    
    const modalEl = document.getElementById('modalAssociarEpub');
    if (modalEl && typeof bootstrap !== 'undefined') {
      modalAssociacaoInstancia = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    }

    configurarEventos();
    aplicarConfigVisual();

    if (!tipoArquivo) {
      const recuperou = await carregarUltimoLivro();
      if (!recuperou) mostrarTelaInicial();
    }
  }

  // Carrega scripts externos sob demanda (EPUB, PDF, DOCX)
  function carregarScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function garantirDependencias(extensao) {
    try {
      if (extensao === 'epub') {
        if (typeof ePub === 'undefined') {
          await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/epub.js/0.3.93/epub.min.js');
        }
        return typeof ePub !== 'undefined';
      } 
      
      if (extensao === 'pdf') {
        if (typeof pdfjsLib === 'undefined') {
          await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
          if (window['pdfjs-dist/build/pdf']) {
            window.pdfjsLib = window['pdfjs-dist/build/pdf'];
          }
          if (window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          }
        }
        return typeof pdfjsLib !== 'undefined';
      } 
      
      if (extensao === 'docx') {
        if (typeof mammoth === 'undefined') {
          await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js');
        }
        return typeof mammoth !== 'undefined';
      }
    } catch (e) {
      console.error(`Falha ao carregar biblioteca para ${extensao}:`, e);
      return false;
    }
    return false;
  }

  function configurarEventos() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('#btn-abrir-epub') || e.target.closest('#btn-trocar-epub')) {
        abrirArquivo();
      }
    });

    if (!tipoArquivo) mostrarTelaInicial();

    // Cronômetro
    els.btnIniciar?.addEventListener('click', iniciarCronometro);
    els.btnPausar?.addEventListener('click', pausarCronometro);
    els.btnRetomar?.addEventListener('click', retomarCronometro);
    els.btnFinalizar?.addEventListener('click', finalizarSessao);

    // Modais e Offcanvas
    document.getElementById('btn-ajustes-leitor')?.addEventListener('click', () => {
      const modalEl = document.getElementById('modal-config-leitor');
      if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.show();
      }
    });

    document.getElementById('modal-config-leitor')?.addEventListener('hidden.bs.modal', () => {
      lerConfiguracoes();
      aplicarConfigVisual();
    });

    document.getElementById('btn-indice')?.addEventListener('click', () => {
      if (tipoArquivo !== 'epub') {
        Util.toast('Índice interativo disponível apenas para arquivos EPUB.', 'info');
        return;
      }
      const offcanvasEl = document.getElementById('offcanvasIndice');
      if (offcanvasEl) {
        const offcanvas = bootstrap.Offcanvas.getInstance(offcanvasEl) || new bootstrap.Offcanvas(offcanvasEl);
        carregarIndice();
        offcanvas.show();
      }
    });

    els.btnVoltar?.addEventListener('click', () => {
      document.querySelector('.nav-link[data-page="biblioteca"]')?.click();
    });

    // Teclas de Atalho (Navegação)
    document.addEventListener('keydown', (e) => {
      if (!document.getElementById('page-leitor')?.classList.contains('active')) return;
      if (e.key === 'ArrowRight') proximaPagina();
      if (e.key === 'ArrowLeft') paginaAnterior();
    });
  }

  function mostrarTelaInicial() {
    if (!els.container) return;
    els.container.innerHTML = `
      <div class="d-flex flex-column align-items-center justify-content-center h-100 text-muted">
        <i class="fas fa-file-invoice fa-4x mb-3"></i>
        <h5>Nenhum documento aberto</h5>
        <p>Selecione um arquivo <strong>.EPUB</strong>, <strong>.PDF</strong> ou <strong>.DOCX</strong>.</p>
        <button class="btn btn-primary" id="btn-abrir-epub"><i class="fas fa-folder-open me-2"></i>Abrir Documento</button>
      </div>`;
    if (els.titulo) els.titulo.textContent = 'Nenhum livro';
    if (els.totalPaginas) els.totalPaginas.textContent = '0';
  }

  function abrirArquivo() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.epub,.pdf,.docx';
    input.style.display = 'none';
    document.body.appendChild(input);
    
    input.click();
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      document.body.removeChild(input);
      carregarArquivo(file);
    });
  }

  function destruirLeitorAtual() {
    if (rendition) { try { rendition.destroy(); } catch(e){} rendition = null; }
    if (book) { try { book.destroy(); } catch(e){} book = null; }
    pdfDoc = null;
    tipoArquivo = null;
    currentBookInfo = { id: null, title: '', author: '', bookData: null };
  }

  async function carregarArquivo(file, cfiSalvo = null) {
    const ext = file.name.split('.').pop().toLowerCase();
    
    const disponivel = await garantirDependencias(ext);
    if (!disponivel) {
      Util.toast(`Não foi possível carregar o leitor para o formato .${ext.toUpperCase()}`, 'danger');
      return;
    }

    destruirLeitorAtual();
    tipoArquivo = ext;

    if (els.container) {
      els.container.innerHTML = '<div class="d-flex justify-content-center py-5"><div class="spinner-border text-primary"></div></div>';
    }

    currentBookInfo.title = file.name.replace(/\.(epub|pdf|docx)$/i, '');
    currentBookInfo.author = 'Autor desconhecido';
    if (els.titulo) els.titulo.textContent = currentBookInfo.title;

    if (ext === 'epub') await processarEPUB(file, cfiSalvo);
    else if (ext === 'pdf') await processarPDF(file);
    else if (ext === 'docx') await processarDOCX(file);

    await associarLivro(currentBookInfo.title, currentBookInfo.author);
    criarZonasClique();
  }

  // ========== PROCESSADORES POR FORMATO ==========

  // 1. EPUB
  async function processarEPUB(file, cfiSalvo) {
    book = ePub(file);
    await book.ready;
    if (els.container) els.container.innerHTML = '';

    rendition = book.renderTo(els.container, {
      width: '100%',
      height: '100%',
      spread: 'none',
      flow: 'paginated',
      manager: 'default'
    });

    criarTemasRendition();
    const metadata = book.packaging?.metadata || book.metadata;
    if (metadata?.title) currentBookInfo.title = metadata.title;
    if (metadata?.creator) currentBookInfo.author = metadata.creator;
    if (els.titulo) els.titulo.textContent = currentBookInfo.title;

    await book.locations.generate(1024);
    if (els.totalPaginas) els.totalPaginas.textContent = book.locations.length();

    aplicarConfigVisual();
    await rendition.display(cfiSalvo || undefined);

    rendition.on('relocated', (location) => {
      atualizarProgresso(location);
      DB.salvarPosicaoLeitor(location.start.cfi).catch(console.warn);
      sincronizarProgresso(location);
    });
  }

  // 2. PDF
  async function processarPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    if (els.totalPaginas) els.totalPaginas.textContent = pdfDoc.numPages;
    await renderizarPaginaPDF(1);
  }

  async function renderizarPaginaPDF(num) {
    if (!pdfDoc || num < 1 || num > pdfDoc.numPages) return;
    pdfNumPage = num;

    const page = await pdfDoc.getPage(num);
    if (!els.container) return;

    els.container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'd-flex justify-content-center align-items-center w-100 h-100 overflow-auto';

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    wrapper.appendChild(canvas);
    els.container.appendChild(wrapper);

    const viewport = page.getViewport({ scale: 1.3 });
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    canvas.style.maxWidth = '100%';
    canvas.style.height = 'auto';

    await page.render({ canvasContext: ctx, viewport }).promise;

    if (els.paginaAtual) els.paginaAtual.textContent = pdfNumPage;
    const pct = Math.round((pdfNumPage / pdfDoc.numPages) * 100);
    if (els.progressoTexto) els.progressoTexto.textContent = `${pct}%`;
    if (els.barraProgresso) els.barraProgresso.style.width = `${pct}%`;
  }

  // 3. DOCX
  async function processarDOCX(file) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    
    if (!els.container) return;
    els.container.innerHTML = `
      <div class="docx-wrapper p-4 overflow-auto h-100" style="max-width: 850px; margin: 0 auto; color: inherit;">
        ${result.value}
      </div>`;

    // Estimativa de páginas (~2000 caracteres por página)
    const texto = els.container.textContent || '';
    const totalEstimado = Math.max(1, Math.ceil(texto.length / 2000));

    if (els.paginaAtual) els.paginaAtual.textContent = 1;
    if (els.totalPaginas) els.totalPaginas.textContent = totalEstimado;

    // Atualiza página aproximada ao rolar
    const wrapper = els.container.querySelector('.docx-wrapper');
    wrapper?.addEventListener('scroll', () => {
      const pct = wrapper.scrollTop / (wrapper.scrollHeight - wrapper.clientHeight || 1);
      const pag = Math.min(totalEstimado, Math.max(1, Math.round(pct * (totalEstimado - 1)) + 1));
      if (els.paginaAtual) els.paginaAtual.textContent = pag;
      if (els.progressoTexto) els.progressoTexto.textContent = `${Math.round(pct * 100)}%`;
      if (els.barraProgresso) els.barraProgresso.style.width = `${Math.round(pct * 100)}%`;
    });
  }

  // ========== CONTROLE UNIFICADO DE NAVEGAÇÃO ==========
  function proximaPagina() {
    if (tipoArquivo === 'epub' && rendition) rendition.next();
    else if (tipoArquivo === 'pdf' && pdfNumPage < pdfDoc?.numPages) renderizarPaginaPDF(pdfNumPage + 1);
    else if (tipoArquivo === 'docx') {
      const w = els.container?.querySelector('.docx-wrapper');
      if (w) w.scrollTop += w.clientHeight * 0.8;
    }
  }

  function paginaAnterior() {
    if (tipoArquivo === 'epub' && rendition) rendition.prev();
    else if (tipoArquivo === 'pdf' && pdfNumPage > 1) renderizarPaginaPDF(pdfNumPage - 1);
    else if (tipoArquivo === 'docx') {
      const w = els.container?.querySelector('.docx-wrapper');
      if (w) w.scrollTop -= w.clientHeight * 0.8;
    }
  }

  // ========== ASSOCIAÇÃO À BIBLIOTECA ==========
  async function associarLivro(title, author) {
    try {
      const resp = await API.enviar({ acao: 'listAllBooks' });
      if (Array.isArray(resp)) {
        const encontrado = resp.find(l => 
          (l.Título || l.titulo || '').toLowerCase().includes(title.toLowerCase())
        );
        if (encontrado) {
          efetivarVinculo(encontrado);
        } else {
          currentBookInfo.id = null;
          currentBookInfo.bookData = null;
          if (modalAssociacaoInstancia) {
            const titleEl = document.getElementById('epubMetaTitle');
            const authorEl = document.getElementById('epubMetaAuthor');
            if (titleEl) titleEl.innerText = title;
            if (authorEl) authorEl.innerText = author;

            preencherModalAssociacao(resp, title, author);
            modalAssociacaoInstancia.show();
          }
        }
      }
    } catch (e) {
      console.warn('Off-line ou erro ao associar:', e);
    }
  }

  function preencherModalAssociacao(livros, title, author) {
    const lista = document.getElementById('listaLivrosParaVincular');
    if (lista) {
      lista.innerHTML = '';
      livros.forEach(livro => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
        btn.innerHTML = `<div><strong>${livro.Título || livro.titulo}</strong><br><small class="text-muted">${livro.Autor || livro.autor}</small></div>`;
        btn.onclick = () => {
          efetivarVinculo(livro);
          modalAssociacaoInstancia?.hide();
        };
        lista.appendChild(btn);
      });
    }

    const btnCriar = document.getElementById('btnCriarNovoLivroEpub');
    if (btnCriar) {
      const novoBtn = btnCriar.cloneNode(true);
      btnCriar.parentNode.replaceChild(novoBtn, btnCriar);

      novoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        modalAssociacaoInstancia?.hide();

        preencherFormularioAdicionarLivro({
          titulo: title,
          autor: author,
          totalPaginas: parseInt(els.totalPaginas?.textContent || '0') || 0,
          formato: (tipoArquivo || 'EPUB').toUpperCase(),
          status: 'Lendo'
        });

        const navAdicionar = document.querySelector('[data-page="adicionar"]') || document.querySelector('[data-page="adicionar-livro"]');
        navAdicionar?.click();
        Util.toast('Dados importados! Conclua o cadastro na biblioteca.', 'info');
      });
    }
  }

  function preencherFormularioAdicionarLivro(dados) {
    const inT = document.getElementById('titulo') || document.getElementById('add-titulo');
    const inA = document.getElementById('autor') || document.getElementById('add-autor');
    const inP = document.getElementById('paginas') || document.getElementById('add-paginas');
    const inF = document.getElementById('formato') || document.getElementById('add-formato');
    const inS = document.getElementById('status') || document.getElementById('add-status');

    if (inT) inT.value = dados.titulo;
    if (inA) inA.value = dados.autor;
    if (inP) inP.value = dados.totalPaginas;
    if (inF) inF.value = dados.formato;
    if (inS) inS.value = dados.status;
  }

  function efetivarVinculo(livro) {
    currentBookInfo.id = livro.ID || livro.id;
    currentBookInfo.bookData = livro;
  }

  // ========== CRONÔMETRO E SESSÃO ==========
  function atualizarDisplayCronometro() {
    if (!cronometroAtivo) return;
    const agora = Date.now();
    const totalMs = tempoAcumulado + (inicioCronometro ? agora - inicioCronometro : 0);
    const totalSeg = Math.floor(totalMs / 1000);
    const mins = Math.floor(totalSeg / 60);
    const secs = totalSeg % 60;
    if (els.cronometro) els.cronometro.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    animFrameId = requestAnimationFrame(atualizarDisplayCronometro);
  }

  function iniciarCronometro() {
    if (cronometroAtivo) return;
    inicioCronometro = Date.now();
    cronometroAtivo = true;

    horaInicioSessao = new Date().toTimeString().slice(0, 5);
    paginaInicialCronometro = parseInt(els.paginaAtual?.textContent || '1') || 1;

    els.btnIniciar?.classList.add('d-none');
    els.btnPausar?.classList.remove('d-none');
    els.btnRetomar?.classList.add('d-none');
    els.btnFinalizar?.classList.remove('d-none');
    
    atualizarDisplayCronometro();
    iniciarAudioFantasma();
  }

  function pausarCronometro() {
    if (!cronometroAtivo) return;
    cronometroAtivo = false;
    if (animFrameId) cancelAnimationFrame(animFrameId);
    tempoAcumulado += Date.now() - inicioCronometro;
    inicioCronometro = null;

    els.btnPausar?.classList.add('d-none');
    els.btnRetomar?.classList.remove('d-none');
    pararAudioFantasma();
  }

  function retomarCronometro() {
    if (cronometroAtivo) return;
    inicioCronometro = Date.now();
    cronometroAtivo = true;
    els.btnRetomar?.classList.add('d-none');
    els.btnPausar?.classList.remove('d-none');
    atualizarDisplayCronometro();
    iniciarAudioFantasma();
  }

  function finalizarSessao() {
    if (cronometroAtivo) {
      cronometroAtivo = false;
      if (animFrameId) cancelAnimationFrame(animFrameId);
      tempoAcumulado += Date.now() - inicioCronometro;
      inicioCronometro = null;
    }

    els.btnIniciar?.classList.remove('d-none');
    els.btnPausar?.classList.add('d-none');
    els.btnRetomar?.classList.add('d-none');
    els.btnFinalizar?.classList.add('d-none');
    pararAudioFantasma();

    const agora = new Date();
    const horaFimSessao = agora.toTimeString().slice(0, 5);
    const minutosLidos = tempoAcumulado > 0 ? Math.max(1, Math.round(tempoAcumulado / 60000)) : 0;
    const paginaAtual = parseInt(els.paginaAtual?.textContent || '1') || 1;

    tempoAcumulado = 0;
    if (els.cronometro) els.cronometro.textContent = '00:00';

    if (minutosLidos === 0) {
      Util.toast('Sessão muito curta para ser registrada.', 'warning');
      return;
    }

    preencherFormularioSessao({
      data: agora.toISOString().split('T')[0],
      horaInicio: horaInicioSessao || horaFimSessao,
      horaFim: horaFimSessao,
      paginaInicial: paginaInicialCronometro,
      paginaFinal: paginaAtual
    });
  }

  function preencherFormularioSessao(dados) {
    const form = document.getElementById('session-form');
    if (!form) return;

    const inD = document.getElementById('data-sessao');
    const inHI = document.getElementById('hora-inicio');
    const inHF = document.getElementById('hora-fim');
    const inPI = document.getElementById('pagina-inicial');
    const inPF = document.getElementById('pagina-final');
    const inL = document.getElementById('local-sessao');

    if (inD) inD.value = dados.data;
    if (inHI) inHI.value = dados.horaInicio;
    if (inHF) inHF.value = dados.horaFim;
    if (inPI) inPI.value = dados.paginaInicial;
    if (inPF) inPF.value = dados.paginaFinal;
    if (inL && !inL.value) inL.value = `Leitor ${tipoArquivo ? tipoArquivo.toUpperCase() : ''}`;

    [inHI, inHF, inPI, inPF].forEach(el => {
      if (el) {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    const navSessao = document.querySelector('[data-page="sessao"]') || document.querySelector('[data-page="sessoes"]');
    navSessao?.click();

    Util.toast('Sessão encerrada! Revise e registre sua leitura.', 'success');
  }

  // ========== AUXILIARES E ÁUDIO FANTASMA ==========
  function iniciarAudioFantasma() {
    const audio = document.getElementById('audio-fantasma');
    if (audio) { audio.loop = true; audio.play().catch(() => {}); }
  }

  function pararAudioFantasma() {
    const audio = document.getElementById('audio-fantasma');
    if (audio) audio.pause();
  }

  function criarZonasClique() {
    document.getElementById('zona-clique-esquerda')?.remove();
    document.getElementById('zona-clique-direita')?.remove();
    if (!els.container) return;

    const zE = document.createElement('div');
    zE.id = 'zona-clique-esquerda';
    zE.className = 'zona-clique zona-esquerda';

    const zD = document.createElement('div');
    zD.id = 'zona-clique-direita';
    zD.className = 'zona-clique zona-direita';

    els.container.appendChild(zE);
    els.container.appendChild(zD);

    zE.addEventListener('click', paginaAnterior);
    zD.addEventListener('click', proximaPagina);
  }

  function aplicarConfigVisual() {
    if (!els.container) return;
    els.container.classList.remove('tema-claro', 'tema-sepia', 'tema-escuro');
    els.container.classList.add(`tema-${config.tema}`);

    if (tipoArquivo === 'epub' && rendition) {
      rendition.themes.select(config.tema);
      rendition.themes.font(config.fonte);
      rendition.themes.fontSize(config.tamanho + 'px');
      rendition.themes.override('line-height', config.espacamento);
      rendition.themes.override('padding', `0 ${config.margem}%`);
    }
  }

  function lerConfiguracoes() {
    const f = document.getElementById('leitor-fonte');
    const t = document.getElementById('leitor-tamanho-fonte');
    const tm = document.getElementById('leitor-tema');
    if (f) config.fonte = f.value;
    if (t) config.tamanho = parseInt(t.value);
    if (tm) config.tema = tm.value;
  }

  function atualizarProgresso(location) {
    if (!book) return;
    const porcento = Math.round((location.start.percentage || 0) * 100);
    if (els.progressoTexto) els.progressoTexto.textContent = `${porcento}%`;
    if (els.barraProgresso) els.barraProgresso.style.width = `${porcento}%`;
    if (els.paginaAtual) els.paginaAtual.textContent = location.start.index + 1;
  }

  function sincronizarProgresso(location) {
    if (!currentBookInfo.id || !currentBookInfo.bookData) return;
    const porcentagem = location.start.percentage || 0;
    const totPaginas = currentBookInfo.bookData.TotalPaginas || 0;
    let paginasLidas = totPaginas ? Math.round(porcentagem * totPaginas) : Math.round(porcentagem * 100);

    if (currentBookInfo.bookData.PaginasLidas !== undefined) currentBookInfo.bookData.PaginasLidas = paginasLidas;
    
    clearTimeout(timeoutSincronizacao);
    timeoutSincronizacao = setTimeout(() => {
      API.enviar({ acao: 'updateBook', data: currentBookInfo.bookData }).catch(console.warn);
    }, 2500);
  }

  async function carregarUltimoLivro() {
    try {
      const reg = await DB.obterEstadoLeitor();
      if (reg && reg.arquivo) {
        await carregarArquivo(reg.arquivo, reg.cfi);
        return true;
      }
    } catch (e) {}
    return false;
  }

  function carregarIndice() {
    const ul = document.getElementById('lista-indice');
    if (!ul || !book) return;
    ul.innerHTML = '';
    book.loaded.navigation.then(nav => {
      nav.toc.forEach(item => {
        const li = document.createElement('li');
        li.className = 'py-1 ps-2';
        li.style.cursor = 'pointer';
        li.textContent = item.label;
        li.addEventListener('click', () => {
          rendition.display(item.href);
          const offcanvasEl = document.getElementById('offcanvasIndice');
          if (offcanvasEl) bootstrap.Offcanvas.getInstance(offcanvasEl)?.hide();
        });
        ul.appendChild(li);
      });
    });
  }

  function criarTemasRendition() {
    if (!rendition) return;
    rendition.themes.register('claro',  { body: { color: '#1e293b', background: '#ffffff' } });
    rendition.themes.register('sepia',  { body: { color: '#3e2723', background: '#f5e6d3' } });
    rendition.themes.register('escuro', { body: { color: '#e2e8f0', background: '#1e293b' } });
  }

  window.addEventListener('page-activated', (e) => {
    if (e.detail === 'leitor') init();
  });

  if (document.getElementById('page-leitor')?.classList.contains('active')) {
    init();
  }

  return { init };
})();
