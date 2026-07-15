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
                    data-autor="${nomeAutor}">
              <i class="fas fa-camera"></i> Compartilhar
            </button>` : ''}
          </div>
        `;
        container.appendChild(div);
      });

      document.querySelectorAll('.btn-compartilhar-anotacao').forEach(btn => {
        btn.addEventListener('click', () => {
          abrirModalCompartilhamento(btn.dataset.trecho, btn.dataset.livro, btn.dataset.autor);
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

  function abrirModalCompartilhamento(trecho, livro, autor) {
    document.getElementById('citacao-texto').textContent = `"${trecho}"`;
    document.getElementById('citacao-livro').textContent = livro;
    document.getElementById('citacao-autor').textContent = autor;

    const modal = new bootstrap.Modal(document.getElementById('modal-compartilhar-citacao'));
    modal.show();

    document.getElementById('btn-baixar-citacao').onclick = async () => {
      const cartao = document.getElementById('cartao-citacao');
      try {
        const canvas = await html2canvas(cartao, { backgroundColor: null, scale: 2 });
        const link = document.createElement('a');
        link.download = `citacao-${livro.replace(/\s+/g, '-').toLowerCase()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        if (navigator.share) {
          canvas.toBlob(async (blob) => {
            if (blob) {
              const file = new File([blob], 'citacao.png', { type: 'image/png' });
              try {
                await navigator.share({ files: [file], title: 'Citação do Eder Livros', text: `"${trecho}" - ${livro}` });
              } catch (shareError) {}
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Anotacoes.init());
} else {
  Anotacoes.init();
}
