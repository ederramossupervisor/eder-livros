const Anotacoes = (() => {
  // Variáveis para o reconhecimento de voz
  let recognition = null;
  let isRecognizing = false;
  let currentTrechoField = null;

  async function init() {
    const page = document.getElementById('page-anotacoes');
    if (!page || !page.classList.contains('active')) return;

    console.log('📝 Carregando Anotações e Citações...');
    await carregarLivrosDropdown();
    configurarForms();
    configurarReconhecimentoDeVoz();
    await listarAnotacoes();
    await listarCitacoes();
    console.log('✅ Módulo Anotações pronto.');
  }

  async function carregarLivrosDropdown() {
    try {
      const resp = await API.enviar({ acao: 'listBooks' });
      if (Array.isArray(resp)) {
        ['anot-livro', 'cit-livro', 'filtro-livro-anot'].forEach(id => {
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

  // Inicializa a API de reconhecimento de voz
  function configurarReconhecimentoDeVoz() {
    const btnDitar = document.getElementById('btn-ditar-citacao');
    const trechoField = document.getElementById('cit-trecho');
    if (!btnDitar || !trechoField) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      btnDitar.disabled = true;
      btnDitar.title = 'Reconhecimento de voz não suportado neste navegador';
      return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => {
      isRecognizing = true;
      btnDitar.innerHTML = '<i class="fas fa-microphone-alt text-danger"></i>';
      btnDitar.classList.add('btn-danger');
      btnDitar.classList.remove('btn-outline-secondary');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const currentText = trechoField.value;
      trechoField.value = currentText + (currentText ? ' ' : '') + transcript;
    };

    recognition.onerror = (event) => {
      console.error('Erro no reconhecimento:', event.error);
      Util.toast('Erro no ditado: ' + event.error, 'warning');
      resetDitarButton();
    };

    recognition.onend = () => {
      resetDitarButton();
    };

    btnDitar.addEventListener('click', () => {
      if (isRecognizing) {
        recognition.stop();
        resetDitarButton();
      } else {
        recognition.start();
      }
    });
  }

  function resetDitarButton() {
    const btn = document.getElementById('btn-ditar-citacao');
    if (btn) {
      btn.innerHTML = '<i class="fas fa-microphone"></i>';
      btn.classList.remove('btn-danger');
      btn.classList.add('btn-outline-secondary');
    }
    isRecognizing = false;
  }

  // Função robusta para copiar texto para a área de transferência
  function copiarTexto(texto) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(texto);
    } else {
      // Fallback usando textarea
      return new Promise((resolve, reject) => {
        const textarea = document.createElement('textarea');
        textarea.value = texto;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand('copy');
          document.body.removeChild(textarea);
          resolve();
        } catch (e) {
          document.body.removeChild(textarea);
          reject(e);
        }
      });
    }
  }

  function configurarForms() {
    // Anotação
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
          // Recarrega citações também, pois uma nova anotação com categoria "Citação" pode ter sido criada
          listarCitacoes();
        }
      } catch (err) {
        Util.toast('Erro ao salvar anotação', 'danger');
      }
    });

    // Citação
    document.getElementById('form-citacao').addEventListener('submit', async (e) => {
      e.preventDefault();
      const citacao = {
        livroID: document.getElementById('cit-livro').value,
        trecho: document.getElementById('cit-trecho').value,
        pagina: document.getElementById('cit-pagina').value,
        comentario: document.getElementById('cit-comentario').value
      };
      if (!citacao.livroID || !citacao.trecho) return Util.toast('Livro e trecho são obrigatórios', 'warning');
      try {
        const resp = await API.enviar({ acao: 'addQuote', citacao });
        if (resp && resp.status === 'ok') {
          Util.toast('Citação salva!', 'success');
          document.getElementById('form-citacao').reset();
          listarCitacoes();
        }
      } catch (err) {
        Util.toast('Erro ao salvar citação', 'danger');
      }
    });

    document.getElementById('filtro-livro-anot').addEventListener('change', listarAnotacoes);
  }

  async function listarAnotacoes() {
    const filtro = document.getElementById('filtro-livro-anot')?.value || '';
    try {
      const resp = await API.enviar({ acao: 'listNotes', livroID: filtro });
      const container = document.getElementById('lista-anotacoes');
      container.innerHTML = '';
      if (Array.isArray(resp) && resp.length > 0) {
        resp.forEach(a => {
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
          `;
          container.appendChild(div);
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

  async function listarCitacoes() {
    try {
      // Busca as duas fontes de dados
      const [quotes, notes] = await Promise.all([
        API.enviar({ acao: 'listQuotes' }),
        API.enviar({ acao: 'listNotes', livroID: '' }) // todas as anotações
      ]);

      // Processa citações puras
      const citacoes = (Array.isArray(quotes) ? quotes : []).map(c => ({
        Trecho: c.Trecho || '',
        Página: c.Página || '',
        Comentario: c.Comentario || '',
        Data: c.Data || '',
        LivroID: c.LivroID || '',
        tipo: 'citacao'
      }));

      // Processa anotações com categoria "Citação"
      const notasCitacao = (Array.isArray(notes) ? notes : [])
        .filter(n => n.Categoria === 'Citação')
        .map(n => ({
          Trecho: n.Trecho || '',
          Página: n.Página || '',
          Comentario: n.Comentario || '',
          Data: n.Data || '',
          LivroID: n.LivroID || '',
          tipo: 'anotacao'
        }));

      // Junta e ordena por data (mais recentes primeiro)
      const todas = [...citacoes, ...notasCitacao].sort((a, b) => {
        const dateA = a.Data ? new Date(a.Data) : new Date(0);
        const dateB = b.Data ? new Date(b.Data) : new Date(0);
        return dateB - dateA;
      });

      const container = document.getElementById('lista-citacoes');
      container.innerHTML = '';

      if (todas.length > 0) {
        todas.forEach(c => {
          const div = document.createElement('div');
          div.className = 'citacao-card';
          div.innerHTML = `
            <blockquote>${c.Trecho}</blockquote>
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <small>Pág. ${c.Página || '-'}</small>
                <small class="text-muted ms-2">${c.Comentario || ''}</small>
                ${c.tipo === 'anotacao' ? '<span class="badge bg-light text-muted ms-1 small">Anotação</span>' : ''}
              </div>
              <div>
                <button class="btn btn-sm btn-link p-1 btn-copiar-citacao" title="Copiar citação" data-trecho="${c.Trecho.replace(/"/g, '&quot;')}">
                  <i class="fas fa-copy"></i>
                </button>
                <button class="btn btn-sm btn-outline-info btn-ouvir-citacao" data-trecho="${c.Trecho.replace(/"/g, '&quot;')}">
                  <i class="fas fa-volume-up"></i> Ouvir
                </button>
              </div>
            </div>
          `;
          container.appendChild(div);
        });

        // Eventos de cópia
        container.querySelectorAll('.btn-copiar-citacao').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const trecho = btn.dataset.trecho;
            try {
              await copiarTexto(trecho);
              // Feedback visual temporário no ícone
              const icon = btn.querySelector('i');
              icon.className = 'fas fa-check text-success';
              setTimeout(() => {
                icon.className = 'fas fa-copy';
              }, 1500);
              Util.toast('Citação copiada!', 'success');
            } catch (err) {
              Util.toast('Erro ao copiar', 'danger');
            }
          });
        });

        // Eventos de leitura em voz alta
        container.querySelectorAll('.btn-ouvir-citacao').forEach(btn => {
          btn.addEventListener('click', () => {
            const texto = btn.dataset.trecho;
            falarTexto(texto);
          });
        });
      } else {
        container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-quote-right fa-3x text-muted mb-3"></i>
          <p class="text-muted">Nenhuma citação salva.</p>
        </div>`;
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Função para ler texto em voz alta (Text-to-Speech)
  function falarTexto(texto) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(texto);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    } else {
      Util.toast('Seu navegador não suporta leitura em voz alta.', 'warning');
    }
  }

  return { init };
})();

// Inicialização segura
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Anotacoes.init());
} else {
  Anotacoes.init();
}
