const Anotacoes = (() => {
  let recognition = null;
  let targetInput = null;
  let livrosCache = [];

  function initSpeech() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech Recognition não suportado neste navegador.');
      return;
    }
    recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.addEventListener('result', (e) => {
      const transcript = e.results[0][0].transcript;
      if (targetInput) {
        targetInput.value += (targetInput.value ? ' ' : '') + transcript;
        targetInput.dispatchEvent(new Event('input'));
      }
    });

    recognition.addEventListener('end', () => {
      const btn = document.querySelector('.btn-recording');
      if (btn) {
        btn.classList.remove('btn-recording', 'btn-danger');
        btn.innerHTML = '<i class="fas fa-microphone"></i>';
      }
      targetInput = null;
    });

    recognition.addEventListener('error', () => {
      const btn = document.querySelector('.btn-recording');
      if (btn) {
        btn.classList.remove('btn-recording', 'btn-danger');
        btn.innerHTML = '<i class="fas fa-microphone"></i>';
      }
      targetInput = null;
    });
  }

  function toggleVoice(inputElement, buttonElement) {
    if (!recognition) {
      Util.toast('Reconhecimento de voz não suportado.', 'warning');
      return;
    }
    if (targetInput === inputElement) {
      recognition.stop();
      return;
    }
    if (targetInput) recognition.stop();
    targetInput = inputElement;
    buttonElement.classList.add('btn-recording', 'btn-danger');
    buttonElement.innerHTML = '<i class="fas fa-stop"></i>';
    recognition.start();
  }

  function setupVoiceButton(buttonId, inputId) {
    const btn = document.getElementById(buttonId);
    const input = document.getElementById(inputId);
    if (btn && input) {
      btn.addEventListener('click', () => toggleVoice(input, btn));
    }
  }

  async function init() {
    const page = document.getElementById('page-anotacoes');
    if (!page || !page.classList.contains('active')) return;

    console.log('📝 Carregando Anotações...');
    initSpeech();
    await carregarLivrosDropdown();
    configurarForms();
    await listarAnotacoes();
    console.log('✅ Módulo Anotações pronto (com compartilhamento).');
  }

  async function carregarLivrosDropdown() {
    try {
      const resp = await API.enviar({ acao: 'listBooks' });
      if (Array.isArray(resp)) {
        livrosCache = resp;
        ['anot-livro', 'filtro-livro-anot'].forEach(id => {
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
    document.getElementById('form-anotacao').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!navigator.onLine) {
        Util.toast('Você está offline. Conecte-se para salvar anotações.', 'warning');
        return;
      }
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

    setupVoiceButton('btn-voz-anot-trecho', 'anot-trecho');
    setupVoiceButton('btn-voz-anot-comentario', 'anot-comentario');

    document.getElementById('filtro-livro-anot').addEventListener('change', listarAnotacoes);
  }

  async function listarAnotacoes() {
    const filtro = document.getElementById('filtro-livro-anot')?.value || '';
    let anotacoes = [];

    try {
      const resp = await API.enviar({ acao: 'listNotes', livroID: filtro });
      if (Array.isArray(resp)) {
        anotacoes = resp;
        DB.salvarAnotacoes(resp).catch(e => console.warn('Cache anotações falhou:', e));
      }
    } catch (e) {
      console.warn('Falha na API, tentando cache offline...');
      anotacoes = await DB.obterAnotacoes(filtro);
      if (anotacoes.length > 0) {
        Util.toast('Modo offline - dados do último acesso.', 'info');
      }
    }

    const container = document.getElementById('lista-anotacoes');
    container.innerHTML = '';

    if (anotacoes.length > 0) {
      anotacoes.forEach(a => {
        const livro = livrosCache.find(l => l.ID === a.LivroID);
        const nomeLivro = livro ? livro.Título : 'Livro desconhecido';
        const nomeAutor = livro ? livro.Autor : 'Autor desconhecido';

        const div = document.createElement('div');
        div.className = 'anotacao-card';
        div.innerHTML = `
          <div class="d-flex justify-content-between">
            <span class="badge bg-secondary">${a.Categoria || 'Geral'}</span>
            <small class="text-muted">${a.Capítulo ? 'Cap. ' + a.Capítulo : ''} ${a.Página ? 'Pág. ' + a.Página : ''}</small>
          </div>
          ${a.Resumo ? `<p class="mt-2"><strong>Resumo:</strong> ${a.Resumo}</p>` : ''}
          ${a.Trecho ? `<blockquote>${a.Trecho}</blockquote>` : ''}
          ${a['Comentário'] ? `<p><em>${a['Comentário']}</em></p>` : ''}
          <div class="text-end mt-2">
            ${(a.Trecho || a['Comentário']) ? `
            <button class="btn btn-sm btn-outline-primary btn-compartilhar-anotacao"
                    data-trecho="${(a.Trecho || a['Comentário']).replace(/"/g, '&quot;')}"
                    data-livro="${nomeLivro}"
                    data-autor="${nomeAutor}"
                    data-capa="${livro?.URLCapa || livro?.ImagemCapa || ''}">
              <i class="fas fa-camera"></i> Compartilhar
            </button>` : ''}
          </div>
        `;
        container.appendChild(div);
      });

      document.querySelectorAll('.btn-compartilhar-anotacao').forEach(btn => {
        btn.addEventListener('click', () => {
          abrirModalCompartilhamento(
            btn.dataset.trecho,
            btn.dataset.livro,
            btn.dataset.autor,
            btn.dataset.capa
          );
        });
      });
    } else {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-sticky-note fa-3x text-muted mb-3"></i>
          <p class="text-muted">Nenhuma anotação encontrada.</p>
        </div>`;
    }
  }

  function abrirModalCompartilhamento(trecho, livro, autor, urlCapa) {
    document.getElementById('citacao-texto').textContent = `"${trecho}"`;
    document.getElementById('citacao-livro').textContent = livro;
    document.getElementById('citacao-autor').textContent = autor;

    const cartao = document.getElementById('cartao-citacao');

    // --- CORES DE FUNDO ---
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

    const containerCores = document.getElementById('cores-predefinidas');
    if (containerCores) {
      containerCores.innerHTML = '';
      coresPredefinidas.forEach(tema => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-sm btn-outline-secondary';
        btn.style.background = tema.valor.startsWith('linear') ? 'var(--bg-secondary)' : tema.valor;
        btn.style.color = tema.valor.startsWith('linear') ? 'var(--text-primary)' : tema.corTexto;
        btn.style.border = '1px solid var(--border-color)';
        btn.textContent = tema.nome;
        btn.addEventListener('click', () => {
          limparFundo(cartao);
          cartao.style.background = tema.valor;
          cartao.style.color = tema.corTexto;
        });
        containerCores.appendChild(btn);
      });
    }

    // --- CAPA DO LIVRO (proxy) ---
document.getElementById('btn-fundo-capa').onclick = async () => {
  if (!urlCapa) {
    Util.toast('Este livro não possui capa cadastrada.', 'warning');
    return;
  }

  const btn = document.getElementById('btn-fundo-capa');
  const textoOriginal = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Carregando...';

  // Mostra um overlay de carregamento sobre o cartão
  const loadingOverlay = document.createElement('div');
  loadingOverlay.id = 'loading-capa-overlay';
  loadingOverlay.style.cssText = 'position: absolute; inset: 0; background: rgba(0,0,0,0.5); z-index: 5; display: flex; align-items: center; justify-content: center;';
  loadingOverlay.innerHTML = '<div class="spinner-border text-light" role="status"></div>';
  cartao.style.position = 'relative';
  cartao.appendChild(loadingOverlay);

  try {
    const resp = await API.enviar({ acao: 'proxyImage', url: urlCapa });
    if (resp && resp.dataUrl) {
      limparFundo(cartao);

      const img = document.createElement('img');
      img.id = 'img-fundo-capa';
      img.src = resp.dataUrl;
      img.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0;';

      const overlay = document.createElement('div');
      overlay.id = 'overlay-fundo';
      overlay.style.cssText = 'position: absolute; inset: 0; background: rgba(0,0,0,0.6); z-index: 1;';

      cartao.style.background = '';
      cartao.style.backgroundImage = '';
      cartao.insertBefore(img, cartao.firstChild);
      cartao.insertBefore(overlay, cartao.children[1]);
      cartao.style.color = '#ffffff';
    } else {
      throw new Error('Proxy não retornou dados');
    }
  } catch (err) {
    console.error('Erro ao carregar capa:', err);
    Util.toast('Não foi possível carregar a capa.', 'danger');
  } finally {
    // Remove o overlay e restaura o botão
    const loadOverlay = document.getElementById('loading-capa-overlay');
    if (loadOverlay) loadOverlay.remove();
    btn.disabled = false;
    btn.innerHTML = textoOriginal;
  }
};
    // --- GRADIENTE ALEATÓRIO ---
    document.getElementById('btn-fundo-gradiente').onclick = () => {
      limparFundo(cartao);
      const cores = ['#1e293b', '#0f172a', '#4c1d95', '#1e3a5f', '#064e3b', '#4c0519', '#1e1b4b'];
      const c1 = cores[Math.floor(Math.random() * cores.length)];
      const c2 = cores[Math.floor(Math.random() * cores.length)];
      cartao.style.background = `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`;
      cartao.style.color = '#ffffff';
    };

    // --- TAMANHO DA FONTE ---
    document.getElementById('range-tamanho-fonte').addEventListener('input', (e) => {
      document.getElementById('citacao-texto').style.fontSize = e.target.value / 16 + 'rem';
    });

    // --- ALINHAMENTO ---
    document.querySelectorAll('[data-align]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-align]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        cartao.style.textAlign = btn.dataset.align;
      });
    });

    // --- FORMATO (FEED/STORIES) ---
    document.querySelector('[data-format="feed"]').addEventListener('click', function() {
      this.classList.add('active');
      document.querySelector('[data-format="stories"]').classList.remove('active');
      cartao.classList.add('format-feed');
      cartao.classList.remove('format-stories');
    });
    document.querySelector('[data-format="stories"]').addEventListener('click', function() {
      this.classList.add('active');
      document.querySelector('[data-format="feed"]').classList.remove('active');
      cartao.classList.add('format-stories');
      cartao.classList.remove('format-feed');
    });
    cartao.classList.add('format-feed'); // padrão

// --- BAIXAR IMAGEM ---
document.getElementById('btn-baixar-citacao').onclick = async () => {
  const btnDownload = document.getElementById('btn-baixar-citacao');
  const textoOriginal = btnDownload.innerHTML;

  btnDownload.disabled = true;
  btnDownload.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Gerando imagem...';

  const loadingOverlay = document.createElement('div');
  loadingOverlay.id = 'loading-download-overlay';
  loadingOverlay.style.cssText = 'position: absolute; inset: 0; background: rgba(0,0,0,0.5); z-index: 10; display: flex; align-items: center; justify-content: center; border-radius: inherit;';
  loadingOverlay.innerHTML = '<div class="text-center text-white"><div class="spinner-border mb-2" role="status"></div><br>Processando...</div>';
  cartao.style.position = 'relative';
  cartao.appendChild(loadingOverlay);

  // Dimensões-alvo (mesmas de antes)
  let targetWidth, targetHeight;
  if (cartao.classList.contains('format-feed')) {
    targetWidth = 400; targetHeight = 400;
  } else if (cartao.classList.contains('format-stories')) {
    targetWidth = 360; targetHeight = 640;
  } else {
    targetWidth = cartao.scrollWidth; targetHeight = cartao.scrollHeight;
  }

  // Clona o cartão pra um contêiner isolado — a captura deixa de depender
  // do scroll do modal, que era o que cortava a imagem no celular
  const clone = cartao.cloneNode(true);
  const textoClone = clone.querySelector('#citacao-texto');
  clone.removeAttribute('id');
  clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
  clone.querySelectorAll('img').forEach(img => { if (!img.crossOrigin) img.crossOrigin = 'anonymous'; });

  clone.style.position = 'fixed';
  clone.style.top = '0';
  clone.style.left = '-9999px';
  clone.style.margin = '0';
  clone.style.maxWidth = 'none';
  clone.style.maxHeight = 'none';
  clone.style.overflow = 'visible';
  clone.style.width = targetWidth + 'px';
  clone.style.height = targetHeight + 'px';
  document.body.appendChild(clone);

  // Encolhe a fonte da citação até tudo caber — nome do livro e logo nunca ficam pra fora
  let fontSize = parseFloat(getComputedStyle(document.getElementById('citacao-texto')).fontSize);
  while (clone.scrollHeight > targetHeight && fontSize > 10) {
    fontSize -= 1;
    if (textoClone) textoClone.style.fontSize = fontSize + 'px';
  }

  try {
    console.log('🖼️ Iniciando download da citação...');
    console.log('⏳ Aguardando html2canvas...');
    const canvas = await html2canvas(clone, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      allowTaint: true,
      width: targetWidth,
      height: targetHeight,
      logging: false,
      imageTimeout: 15000,
      onclone: function(clonedDoc) {
        clonedDoc.querySelectorAll('img').forEach(img => {
          if (!img.crossOrigin) img.crossOrigin = 'anonymous';
        });
      }
    });

    console.log('✅ Canvas criado:', canvas.width, 'x', canvas.height);

    canvas.toBlob(function(blob) {
      if (!blob) {
        Util.toast('Erro ao gerar imagem.', 'danger');
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `citacao-${livro.replace(/\s+/g, '-').toLowerCase()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (navigator.share && canvas) {
        const file = new File([blob], 'citacao.png', { type: 'image/png' });
        navigator.share({ files: [file], title: 'Citação do Eder Livros' }).catch(e => {});
      }

      Util.toast('Imagem baixada!', 'success');
    }, 'image/png');

  } catch (err) {
    console.error('❌ Erro ao gerar imagem:', err);
    Util.toast('Falha ao gerar imagem: ' + err.message, 'danger');
  } finally {
    clone.remove();
    const finalOverlay = document.getElementById('loading-download-overlay');
    if (finalOverlay) finalOverlay.remove();
    btnDownload.disabled = false;
    btnDownload.innerHTML = textoOriginal;
  }
};
    const modal = new bootstrap.Modal(document.getElementById('modal-compartilhar-citacao'));
    modal.show();
  }

  function limparFundo(cartao) {
    const img = document.getElementById('img-fundo-capa');
    if (img) img.remove();
    const overlay = document.getElementById('overlay-fundo');
    if (overlay) overlay.remove();
    cartao.style.background = '';
    cartao.style.backgroundImage = '';
    cartao.style.boxShadow = '';
    cartao.style.position = '';
  }

  return { init };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Anotacoes.init());
} else {
  Anotacoes.init();
}
