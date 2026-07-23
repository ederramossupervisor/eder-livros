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

  // Cache do DOM
  let els = {};

  function atualizarCacheEls() {
    els = {
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
  }

  // ========== ESTRUTURAÇÃO DO CONTAINER DE LEITURA ==========
  function prepararEstruturaContainer() {
    atualizarCacheEls();
    if (!els.container) return null;

    els.container.style.position = 'relative';
    els.container.innerHTML = `
      <div id="leitor-conteudo" style="width:100%; height:100%; overflow:hidden;"></div>
      <div id="zona-clique-esquerda" style="position:absolute; top:0; left:0; width:35%; height:100%; z-index:100; cursor:pointer;"></div>
      <div id="zona-clique-direita" style="position:absolute; top:0; right:0; width:35%; height:100%; z-index:100; cursor:pointer;"></div>
    `;

    const zE = document.getElementById('zona-clique-esquerda');
    const zD = document.getElementById('zona-clique-direita');

    if (zE) {
      zE.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        paginaAnterior();
      };
    }

    if (zD) {
      zD.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        proximaPagina();
      };
    }

    return document.getElementById('leitor-conteudo');
  }

  // ========== CONFIGURAÇÕES VISUAIS ==========
  function aplicarConfigVisual() {
    atualizarCacheEls();
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

  // ========== INICIALIZAÇÃO ==========
  async function init() {
    const page = document.getElementById('page-leitor');
    if (!page || !page.classList.contains('active')) return;

    atualizarCacheEls();
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
    // 1. Delegação Global de Clique para Seleção de Arquivo
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('#btn-abrir-epub, #btn-trocar-epub');
      if (btn) {
        e.preventDefault();
        const input = document.getElementById('input-leitor-arquivo');
        if (input) input.click();
      }
    });

    // 2. Evento do Input File
    const inputArquivo = document.getElementById('input-leitor-arquivo');
    if (inputArquivo) {
      inputArquivo.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          carregarArquivo(file);
          inputArquivo.value = '';
        }
      };
    }

    // 3. Eventos do Cronômetro
    document.getElementById('btn-leitor-iniciar')?.addEventListener('click', (e) => { e.preventDefault(); iniciarCronometro(); });
    document.getElementById('btn-leitor-pausar')?.addEventListener('click', (e) => { e.preventDefault(); pausarCronometro(); });
    document.getElementById('btn-leitor-retomar')?.addEventListener('click', (e) => { e.preventDefault(); retomarCronometro(); });
    document.getElementById('btn-leitor-finalizar')?.addEventListener('click', (e) => { e.preventDefault(); finalizarSessao(); });

    // 4. Prevenção de focar em aria-hidden nos modais
    ['modal-config-leitor', 'modalAssociarEpub'].forEach(modalId => {
      const mEl = document.getElementById(modalId);
      if (mEl) {
        mEl.addEventListener('hide.bs.modal', () => {
          if (document.activeElement && typeof document.activeElement.blur === 'function') {
            document.activeElement.blur();
          }
        });
        mEl.addEventListener('hidden.bs.modal', () => {
          lerConfiguracoes();
          aplicarConfigVisual();
        });
      }
    });

    // 5. Botão Índice
    document.getElementById('btn-indice')?.addEventListener('click', (e) => {
      if (tipoArquivo !== 'epub') {
        e.preventDefault();
        e.stopPropagation();
        if (typeof Util !== 'undefined' && Util.toast) {
          Util.toast('Índice interativo disponível apenas para arquivos EPUB.', 'info');
        }
        return;
      }
      carregarIndice();
    });

    // 6. Voltar para Biblioteca
    document.getElementById('btn-voltar-biblioteca')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelector('.nav-link[data-page="biblioteca"]')?.click();
    });

    // 7. Navegação por Teclado
    if (!window.leitorAtalhosTeclado) {
      document.addEventListener('keydown', (e) => {
        if (!document.getElementById('page-leitor')?.classList.contains('active')) return;
        if (e.key === 'ArrowRight') proximaPagina();
        if (e.key === 'ArrowLeft') paginaAnterior();
      });
      window.leitorAtalhosTeclado = true;
    }
  }

  function mostrarTelaInicial() {
    atualizarCacheEls();
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
      if (typeof Util !== 'undefined' && Util.toast) {
        Util.toast(`Não foi possível carregar o leitor para o formato .${ext.toUpperCase()}`, 'danger');
      }
      return;
    }

    destruirLeitorAtual();
    tipoArquivo = ext;
    atualizarCacheEls();

    if (els.container) {
      els.container.innerHTML = '<div class="d-flex justify-content-center py-5"><div class="spinner-border text-primary"></div></div>';
    }

    currentBookInfo.title = file.name.replace(/\.(epub|pdf|docx)$/i, '');
    currentBookInfo.author = 'Autor desconhecido';
    if (els.titulo) els.titulo.textContent = currentBookInfo.title;

    const conteinerConteudo = prepararEstruturaContainer();

    if (ext === 'epub') await processarEPUB(file, cfiSalvo, conteinerConteudo);
    else if (ext === 'pdf') await processarPDF(file, conteinerConteudo);
    else if (ext === 'docx') await processarDOCX(file, conteinerConteudo);

    await associarLivro(currentBookInfo.title, currentBookInfo.author);
  }

  // ========== PROCESSADORES POR FORMATO ==========

  async function processarEPUB(file, cfiSalvo, conteinerConteudo) {
    book = ePub(file);
    await book.ready;

    rendition = book.renderTo(conteinerConteudo, {
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

    let pontoInicial = cfiSalvo;
    if (!pontoInicial && book.spine && book.spine.spineItems && book.spine.spineItems.length > 0) {
      pontoInicial = book.spine.spineItems[0].href;
    }

    aplicarConfigVisual();
    await rendition.display(pontoInicial || undefined);

    setTimeout(() => {
      if (rendition) rendition.resize();
    }, 100);

    book.locations.generate(1024).then(() => {
      if (els.totalPaginas && book.locations) {
        els.totalPaginas.textContent = book.locations.length();
      }
    }).catch(console.warn);

    rendition.on('relocated', (location) => {
      atualizarProgresso(location);
      if (typeof DB !== 'undefined' && DB.salvarPosicaoLeitor) {
        DB.salvarPosicaoLeitor(location.start.cfi).catch(console.warn);
      }
      sincronizarProgresso(location);
    });
  }

  async function processarPDF(file, conteinerConteudo) {
    const arrayBuffer = await file.arrayBuffer();
    pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    if (els.totalPaginas) els.totalPaginas.textContent = pdfDoc.numPages;
    await renderizarPaginaPDF(1, conteinerConteudo);
  }

  async function renderizarPaginaPDF(num, conteinerConteudo) {
    if (!pdfDoc || num < 1 || num > pdfDoc.numPages) return;
    pdfNumPage = num;

    const conteinerTarget = conteinerConteudo || document.getElementById('leitor-conteudo');
    if (!conteinerTarget) return;

    conteinerTarget.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'd-flex justify-content-center align-items-center w-100 h-100 overflow-auto';

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    wrapper.appendChild(canvas);
    conteinerTarget.appendChild(wrapper);

    const page = await pdfDoc.getPage(num);

    // Ajusta o tamanho da renderização para caber no container sem distorção
    const widthDisponivel = conteinerTarget.clientWidth || window.innerWidth;
    const heightDisponivel = conteinerTarget.clientHeight || window.innerHeight;
    const vpOriginal = page.getViewport({ scale: 1.0 });

    const scaleX = (widthDisponivel - 30) / vpOriginal.width;
    const scaleY = (heightDisponivel - 30) / vpOriginal.height;
    const scaleFinal = Math.max(0.6, Math.min(scaleX, scaleY, 2.0));

    const viewport = page.getViewport({ scale: scaleFinal });
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: ctx, viewport }).promise;

    if (els.paginaAtual) els.paginaAtual.textContent = pdfNumPage;
    const pct = Math.round((pdfNumPage / pdfDoc.numPages) * 100);
    if (els.progressoTexto) els.progressoTexto.textContent = `${pct}%`;
    if (els.barraProgresso) els.barraProgresso.style.width = `${pct}%`;
  }

  async function processarDOCX(file, conteinerConteudo) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    
    const conteinerTarget = conteinerConteudo || document.getElementById('leitor-conteudo');
    if (!conteinerTarget) return;

    conteinerTarget.innerHTML = `
      <div class="docx-wrapper p-4 overflow-auto h-100" style="max-width: 850px; margin: 0 auto; color: inherit;">
        ${result.value}
      </div>`;

    const texto = conteinerTarget.textContent || '';
    const totalEstimado = Math.max(1, Math.ceil(texto.length / 2000));

    if (els.paginaAtual) els.paginaAtual.textContent = 1;
    if (els.totalPaginas) els.totalPaginas.textContent = totalEstimado;

    const wrapper = conteinerTarget.querySelector('.docx-wrapper');
    wrapper?.addEventListener('scroll', () => {
      const pct = wrapper.scrollTop / (wrapper.scrollHeight - wrapper.clientHeight || 1);
      const pag = Math.min(totalEstimado, Math.max(1, Math.round(pct * (totalEstimado - 1)) + 1));
      if (els.paginaAtual) els.paginaAtual.textContent = pag;
      if (els.progressoTexto) els.progressoTexto.textContent = `${Math.round(pct * 100)}%`;
      if (els.barraProgresso) els.barraProgresso.style.width = `${Math.round(pct * 100)}%`;
    });
  }

  // ========== NAVEGAÇÃO ==========
  function proximaPagina() {
    if (tipoArquivo === 'epub' && rendition) rendition.next();
    else if (tipoArquivo === 'pdf' && pdfNumPage < pdfDoc?.numPages) renderizarPaginaPDF(pdfNumPage + 1);
    else if (tipoArquivo === 'docx') {
      const w = document.querySelector('#leitor-conteudo .docx-wrapper');
      if (w) w.scrollTop += w.clientHeight * 0.8;
    }
  }

  function paginaAnterior() {
    if (tipoArquivo === 'epub' && rendition) rendition.prev();
    else if (tipoArquivo === 'pdf' && pdfNumPage > 1) renderizarPaginaPDF(pdfNumPage - 1);
    else if (tipoArquivo === 'docx') {
      const w = document.querySelector('#leitor-conteudo .docx-wrapper');
      if (w) w.scrollTop -= w.clientHeight * 0.8;
    }
  }

  // ========== ASSOCIAÇÃO À BIBLIOTECA ==========
  async function associarLivro(title, author) {
    if (typeof API === 'undefined') return;
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
          if (document.activeElement) document.activeElement.blur();
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
        if (document.activeElement) document.activeElement.blur();
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
        if (typeof Util !== 'undefined' && Util.toast) {
          Util.toast('Dados importados! Conclua o cadastro na biblioteca.', 'info');
        }
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
    atualizarCacheEls();
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
    atualizarCacheEls();
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
    atualizarCacheEls();
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
    atualizarCacheEls();
    inicioCronometro = Date.now();
    cronometroAtivo = true;

    els.btnRetomar?.classList.add('d-none');
    els.btnPausar?.classList.remove('d-none');
    atualizarDisplayCronometro();
    iniciarAudioFantasma();
  }

  function finalizarSessao() {
    atualizarCacheEls();
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
      if (typeof Util !== 'undefined' && Util.toast) {
        Util.toast('Sessão muito curta para ser registrada.', 'warning');
      }
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

    if (typeof Util !== 'undefined' && Util.toast) {
      Util.toast('Sessão encerrada! Revise e registre sua leitura.', 'success');
    }
  }

  // ========== AUXILIARES ==========
  function iniciarAudioFantasma() {
    const audio = document.getElementById('audio-fantasma');
    if (audio) { audio.loop = true; audio.play().catch(() => {}); }
  }

  function pararAudioFantasma() {
    const audio = document.getElementById('audio-fantasma');
    if (audio) audio.pause();
  }

  function atualizarProgresso(location) {
    if (!book) return;
    atualizarCacheEls();
    const porcento = Math.round((location.start.percentage || 0) * 100);
    if (els.progressoTexto) els.progressoTexto.textContent = `${porcento}%`;
    if (els.barraProgresso) els.barraProgresso.style.width = `${porcento}%`;
    if (els.paginaAtual) els.paginaAtual.textContent = location.start.index + 1;
  }

  function sincronizarProgresso(location) {
    if (!currentBookInfo.id || !currentBookInfo.bookData || typeof API === 'undefined') return;
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
    if (typeof DB === 'undefined' || !DB.obterEstadoLeitor) return false;
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
          if (offcanvasEl && typeof bootstrap !== 'undefined') {
            bootstrap.Offcanvas.getInstance(offcanvasEl)?.hide();
          }
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
