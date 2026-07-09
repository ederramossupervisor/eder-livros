/**
 * Módulo de registro de sessões de leitura
 */
const Leitura = (() => {
  const form = document.getElementById('session-form');
  const livroSelect = document.getElementById('livro-select');
  const livroInfo = document.getElementById('livro-info');
  const refreshBtn = document.getElementById('refresh-books-btn');
  const dataInput = document.getElementById('data-sessao');
  const horaInicio = document.getElementById('hora-inicio');
  const horaFim = document.getElementById('hora-fim');
  const pagInicial = document.getElementById('pagina-inicial');
  const pagFinal = document.getElementById('pagina-final');
  const tempoCalculadoDiv = document.getElementById('tempo-calculado');
  const tempoMinSpan = document.getElementById('tempo-minutos');
  const pagLidasDiv = document.getElementById('paginas-calculadas');
  const pagLidasSpan = document.getElementById('paginas-lidas');
  const historicoContainer = document.getElementById('historico-sessoes');

  let livrosCache = [];
  let editandoSessaoID = null;

  function init() {
    if (!form) return;

    dataInput.valueAsDate = new Date();
    [horaInicio, horaFim].forEach(el => el.addEventListener('change', calcularTempo));
    [pagInicial, pagFinal].forEach(el => el.addEventListener('input', calcularPaginas));
    refreshBtn.addEventListener('click', carregarLivros);
    form.addEventListener('submit', salvarSessao);
    document.getElementById('clear-session-btn')?.addEventListener('click', limparFormulario);

    carregarLivros();
    carregarHistorico(); // carrega histórico ao entrar
    console.log('✅ Módulo Leitura pronto.');
  }

  async function carregarLivros() {
    try {
      livroSelect.innerHTML = '<option value="">Carregando...</option>';
      const resp = await API.enviar({ acao: 'listBooks' });
      if (resp && Array.isArray(resp)) {
        livrosCache = resp;
        renderizarListaLivros();
      } else {
        throw new Error(resp?.erro || 'Formato inesperado');
      }
    } catch (e) {
      Util.toast('Erro ao carregar livros: ' + e.message, 'danger');
      livroSelect.innerHTML = '<option value="">Erro ao carregar</option>';
    }
  }

  function renderizarListaLivros() {
    livroSelect.innerHTML = '<option value="">Selecione um livro...</option>';
    if (livrosCache.length === 0) {
      livroSelect.innerHTML += '<option disabled>Nenhum livro cadastrado</option>';
      return;
    }
    livrosCache.forEach(livro => {
      const opt = document.createElement('option');
      opt.value = livro.ID;
      opt.textContent = `${livro.Título} - ${livro.Autor} (${livro.Status})`;
      livroSelect.appendChild(opt);
    });
    livroSelect.addEventListener('change', () => {
      const id = livroSelect.value;
      const livro = livrosCache.find(l => l.ID === id);
      if (livro) {
        livroInfo.innerHTML = `
          <strong>${livro.Título}</strong> | ${livro.Autor}<br>
          Páginas totais: ${livro.NúmeroPáginas || '?'} | Status: ${livro.Status} | Lidas: ${livro.PáginasLidasAcumuladas || 0}
        `;
      } else {
        livroInfo.innerHTML = '';
      }
    });
  }

  function calcularTempo() {
    if (horaInicio.value && horaFim.value) {
      const [hi, mi] = horaInicio.value.split(':').map(Number);
      const [hf, mf] = horaFim.value.split(':').map(Number);
      let minutos = (hf * 60 + mf) - (hi * 60 + mi);
      if (minutos < 0) minutos += 1440;
      tempoMinSpan.textContent = minutos;
      tempoCalculadoDiv.classList.remove('d-none');
    } else {
      tempoCalculadoDiv.classList.add('d-none');
    }
  }

  function calcularPaginas() {
    const pi = parseInt(pagInicial.value) || 0;
    const pf = parseInt(pagFinal.value) || 0;
    const lidas = Math.max(0, pf - pi);
    if (pf > pi) {
      pagLidasSpan.textContent = lidas;
      pagLidasDiv.classList.remove('d-none');
    } else {
      pagLidasDiv.classList.add('d-none');
    }
  }

  async function salvarSessao(e) {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      Util.toast('Preencha os campos obrigatórios.', 'warning');
      return;
    }
    const livroID = livroSelect.value;
    if (!livroID) {
      Util.toast('Selecione um livro.', 'warning');
      return;
    }

    const sessao = {
      livroID,
      data: dataInput.value,
      horaInicio: horaInicio.value,
      horaFim: horaFim.value,
      paginaInicial: pagInicial.value,
      paginaFinal: pagFinal.value,
      local: document.getElementById('local-sessao').value,
      humor: document.getElementById('humor').value,
      clima: document.getElementById('clima').value,
      distracoes: '',
      observacoes: document.getElementById('observacoes-sessao').value
    };

    const btnSubmit = form.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Salvando...';

    try {
      let resposta;
      if (editandoSessaoID) {
        resposta = await API.enviar({ acao: 'updateSession', id: editandoSessaoID, sessao });
      } else {
        resposta = await API.enviar({ acao: 'addSession', sessao });
      }
      if (resposta && resposta.status === 'ok') {
        Util.toast(editandoSessaoID ? 'Sessão atualizada!' : 'Sessão registrada!', 'success');
        limparFormulario();
        editandoSessaoID = null;
        btnSubmit.innerHTML = '<i class="fas fa-save me-1"></i> Registrar Sessão';
        carregarHistorico(); // atualiza lista
        carregarLivros(); // atualiza páginas lidas no dropdown
      } else {
        throw new Error(resposta?.erro || 'Falha no servidor');
      }
    } catch (erro) {
      Util.toast('Erro ao salvar: ' + erro.message, 'danger');
    }
    btnSubmit.disabled = false;
  }

  function limparFormulario() {
    form.reset();
    form.classList.remove('was-validated');
    dataInput.valueAsDate = new Date();
    tempoCalculadoDiv.classList.add('d-none');
    pagLidasDiv.classList.add('d-none');
    livroInfo.innerHTML = '';
    editandoSessaoID = null;
    const btnSubmit = form.querySelector('button[type="submit"]');
    btnSubmit.innerHTML = '<i class="fas fa-save me-1"></i> Registrar Sessão';
  }

  // Histórico de sessões
  async function carregarHistorico() {
  if (!historicoContainer) return;
  try {
    const resp = await API.enviar({ acao: 'listRecentSessions' });
    if (Array.isArray(resp) && resp.length > 0) {
      historicoContainer.innerHTML = '';

      // Criar mapa de ID -> título do livro (já temos livrosCache)
      const mapaTitulos = {};
      livrosCache.forEach(livro => {
        mapaTitulos[livro.ID] = livro.Título || 'Livro sem título';
      });

      resp.forEach(sess => {
        const div = document.createElement('div');
        div.className = 'd-flex justify-content-between align-items-center p-2 border-bottom';

        // Formatar data
        const dataFormatada = sess.Data
          ? new Date(sess.Data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
          : 'Data inválida';

        // Páginas: exibir faixa se ambos os valores existirem
        const pagInicial = sess.PáginaInicial !== undefined && sess.PáginaInicial !== '' ? sess.PáginaInicial : '?';
        const pagFinal = sess.PáginaFinal !== undefined && sess.PáginaFinal !== '' ? sess.PáginaFinal : '?';
        const faixaPaginas = (pagInicial !== '?' || pagFinal !== '?')
          ? `Pág. ${pagInicial}-${pagFinal}`
          : 'Páginas não informadas';

        const pagLidas = sess.PáginasLidas !== undefined ? sess.PáginasLidas : 0;
        const tempo = sess.Tempo ? `${sess.Tempo} min` : '';

        // Nome do livro
        const nomeLivro = mapaTitulos[sess.LivroID] || 'Livro desconhecido';

        div.innerHTML = `
          <div>
            <strong>${nomeLivro}</strong><br>
            <small>${dataFormatada} - ${faixaPaginas} (${pagLidas} pág) ${tempo ? '- ' + tempo : ''}</small>
            ${sess.Local ? `<br><small class="text-muted">Local: ${sess.Local}</small>` : ''}
          </div>
          <div>
            <button class="btn btn-sm btn-outline-secondary btn-editar-sessao" data-id="${sess.ID}"><i class="fas fa-edit"></i></button>
            <button class="btn btn-sm btn-outline-danger btn-excluir-sessao" data-id="${sess.ID}"><i class="fas fa-trash"></i></button>
          </div>`;
        historicoContainer.appendChild(div);
      });

      // Reatribuir eventos
      document.querySelectorAll('.btn-editar-sessao').forEach(btn => {
        btn.addEventListener('click', () => editarSessao(btn.dataset.id, resp));
      });
      document.querySelectorAll('.btn-excluir-sessao').forEach(btn => {
        btn.addEventListener('click', () => excluirSessao(btn.dataset.id));
      });

    } else {
      historicoContainer.innerHTML = '<p class="text-muted">Nenhuma sessão registrada ainda.</p>';
    }
  } catch (e) {
    console.error('Erro ao carregar histórico:', e);
  }
}

  function editarSessao(id, lista) {
    const sess = lista.find(s => s.ID === id);
    if (!sess) return;
    editandoSessaoID = id;
    document.getElementById('livro-select').value = sess.LivroID;
    dataInput.value = sess.Data;
    horaInicio.value = sess.HoraInício || '';
    horaFim.value = sess.HoraFim || '';
    pagInicial.value = sess.PáginaInicial;
    pagFinal.value = sess.PáginaFinal;
    document.getElementById('local-sessao').value = sess.Local || '';
    document.getElementById('humor').value = sess.Humor || '';
    document.getElementById('clima').value = sess.Clima || '';
    document.getElementById('observacoes-sessao').value = sess.Observações || '';
    calcularTempo();
    calcularPaginas();
    const btnSubmit = form.querySelector('button[type="submit"]');
    btnSubmit.innerHTML = '<i class="fas fa-save me-1"></i> Atualizar Sessão';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function excluirSessao(id) {
    if (confirm('Excluir esta sessão permanentemente?')) {
      try {
        await API.enviar({ acao: 'deleteSession', id });
        carregarHistorico();
        carregarLivros(); // atualiza progresso do livro
        Util.toast('Sessão excluída', 'info');
      } catch (e) {
        Util.toast('Erro ao excluir: ' + e.message, 'danger');
      }
    }
  }

  return { init };
})();

// Inicialização segura
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', Leitura.init);
} else {
  Leitura.init();
}