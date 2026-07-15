/**
 * Módulo de Anotações – unificado, com microfone e compartilhamento de citações
 */
const Anotacoes = (() => {
  let recognition = null;
  let targetInput = null;
  let livrosCache = []; // Cache com todos os livros (ID, Título, Autor)

  /* ========== RECONHECIMENTO DE VOZ ========== */
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

    recognition.addEventListener('error', (e) => {
      console.warn('Erro no reconhecimento de voz:', e.error);
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
      Util.toast('Reconhecimento de voz não suportado neste navegador.', 'warning');
      return;
    }
    if (targetInput === inputElement) {
      recognition.stop();
      return;
    }
    if (targetInput) {
      recognition.stop();
    }
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

  /* ========== INICIALIZAÇÃO ========== */
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

  /* ========== CARREGAR LIVROS (dropdown + cache) ========== */
  async function carregarLivrosDropdown() {
    try {
      const resp = await API.enviar({ acao: 'listBooks' });
      if (Array.isArray(resp)) {
        livrosCache = resp; // guarda para uso posterior
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

  /* ========== FORMULÁRIO DE ANOTAÇÃO + MICROFONES ========== */
  function configurarForms() {
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

    setupVoiceButton('btn-voz-anot-trecho', 'anot-trecho');
    setupVoiceButton('btn-voz-anot-comentario', 'anot-comentario');

    document.getElementById('filtro-livro-anot').addEventListener('change', listarAnotacoes);
  }

  /* ========== LISTAR ANOTAÇÕES COM BOTÃO DE COMPARTILHAR ========== */
  async function listarAnotacoes() {
    const filtro = document.getElementById('filtro-livro-anot')?.value || '';
    try {
      const resp = await API.enviar({ acao: 'listNotes', livroID: filtro });
      const container = document.getElementById('lista-anotacoes');
      container.innerHTML = '';

      if (Array.isArray(resp) && resp.length > 0) {
        resp.forEach(a => {
          // Busca informações do livro no cache
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
            ${a.Comentario ? `<p><em>${a.Comentario}</em></p>` : ''}
            <div class="text-end mt-2">
              ${a.Trecho ? `
              <button class="btn btn-sm btn-outline-primary btn-compartilhar-anotacao"
                      data-trecho="${a.Trecho.replace(/"/g, '&quot;')}"
                      data-livro="${nomeLivro}"
                      data-autor="${nomeAutor}">
                <i class="fas fa-camera"></i> Compartilhar
              </button>` : ''}
            </div>
          `;
          container.appendChild(div);
        });

        // Adiciona eventos aos botões de compartilhar
        document.querySelectorAll('.btn-compartilhar-anotacao').forEach(btn => {
          btn.addEventListener('click', () => {
            const trecho = btn.dataset.trecho;
            const livro = btn.dataset.livro;
            const autor = btn.dataset.autor;
            abrirModalCompartilhamento(trecho, livro, autor);
          });
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

  /* ========== MODAL DE COMPARTILHAMENTO ========== */
  function abrirModalCompartilhamento(trecho, livro, autor) {
    document.getElementById('citacao-texto').textContent = `"${trecho}"`;
    document.getElementById('citacao-livro').textContent = livro;
    document.getElementById('citacao-autor').textContent = autor;

    const modal = new bootstrap.Modal(document.getElementById('modal-compartilhar-citacao'));
    modal.show();

    // Configura o botão de download
    document.getElementById('btn-baixar-citacao').onclick = async () => {
      const cartao = document.getElementById('cartao-citacao');
      try {
        const canvas = await html2canvas(cartao, {
          backgroundColor: null,
          scale: 2 // maior qualidade
        });

        // Download direto
        const link = document.createElement('a');
        link.download = `citacao-${livro.replace(/\s+/g, '-').toLowerCase()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        // Compartilhamento nativo (se disponível)
        if (navigator.share) {
          canvas.toBlob(async (blob) => {
            if (blob) {
              const file = new File([blob], 'citacao.png', { type: 'image/png' });
              try {
                await navigator.share({
                  files: [file],
                  title: 'Citação do Eder Livros',
                  text: `"${trecho}" - ${livro}`
                });
              } catch (shareError) {
                // usuário cancelou ou não suportado – download já foi feito
              }
            }
          });
        }

        Util.toast('Imagem baixada!', 'success');
      } catch (err) {
        console.error('Erro ao gerar imagem:', err);
        Util.toast('Falha ao gerar imagem.', 'danger');
      }
    };
  }

  return { init };
})();

// Inicialização segura
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Anotacoes.init());
} else {
  Anotacoes.init();
}
