/**
 * Módulo de registro de sessões de leitura – com cronômetro e máscara de hora
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

  // Elementos do cronômetro
  const display = document.getElementById('cronometro-display');
  const btnIniciar = document.getElementById('btn-iniciar');
  const btnPausar = document.getElementById('btn-pausar');
  const btnRetomar = document.getElementById('btn-retomar');
  const btnFinalizar = document.getElementById('btn-finalizar');

  let livrosCache = [];
  let editandoSessaoID = null;

  // Variáveis do cronômetro
  let cronometroAtivo = false;
  let tempoAcumulado = 0;      // em segundos
  let inicioCronometro = null;
  let timerInterval = null;

  /* ========== FORMATAÇÃO DE HORA ========== */
  function formatarHora(input) {
    let valor = input.value.replace(/\D/g, ''); // remove tudo que não for dígito
    if (valor.length > 4) valor = valor.slice(0, 4);
    if (valor.length > 2) {
      valor = valor.slice(0, 2) + ':' + valor.slice(2);
    }
    input.value = valor;
  }

  /* ========== INICIALIZAÇÃO ========== */
  function init() {
  if (!form) return;

  // NOVO: data local correta, independentemente do fuso
  const hojeLocal = new Date();
  const offset = hojeLocal.getTimezoneOffset() * 60000;
  const hojeLocalISO = new Date(hojeLocal.getTime() - offset).toISOString().split('T')[0];
  dataInput.value = hojeLocalISO;

  // Máscara e validação dos campos de hora
  horaInicio.addEventListener('input', () => formatarHora(horaInicio));
  horaFim.addEventListener('input', () => formatarHora(horaFim));

  horaInicio.addEventListener('blur', () => {
    if (horaInicio.value && !horaInicio.value.includes(':')) {
      horaInicio.value = horaInicio.value.padEnd(2, '0') + ':00';
      if (horaInicio.value.length > 5) horaInicio.value = horaInicio.value.slice(0, 5);
    }
    calcularTempo();
  });

  horaFim.addEventListener('blur', () => {
    if (horaFim.value && !horaFim.value.includes(':')) {
      horaFim.value = horaFim.value.padEnd(2, '0') + ':00';
      if (horaFim.value.length > 5) horaFim.value = horaFim.value.slice(0, 5);
    }
    calcularTempo();
  });

  [pagInicial, pagFinal].forEach(el => el.addEventListener('input', calcularPaginas));
  refreshBtn.addEventListener('click', carregarLivros);
  form.addEventListener('submit', salvarSessao);
  document.getElementById('clear-session-btn')?.addEventListener('click', limparFormulario);

  // Eventos do cronômetro
  btnIniciar.addEventListener('click', iniciarCronometro);
  btnPausar.addEventListener('click', pausarCronometro);
  btnRetomar.addEventListener('click', retomarCronometro);
  btnFinalizar.addEventListener('click', finalizarCronometro);

  carregarLivros();
  carregarHistorico();
  console.log('✅ Módulo Leitura pronto (com cronômetro e máscara de hora).');
}
  /* ========== CRONÔMETRO ========== */
  function atualizarDisplay(segundos) {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    display.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function iniciarCronometro() {
    if (tempoAcumulado === 0) {
      horaInicio.value = new Date().toTimeString().slice(0, 5);
    }
    inicioCronometro = Date.now();
    cronometroAtivo = true;

    btnIniciar.classList.add('d-none');
    btnPausar.classList.remove('d-none');
    btnRetomar.classList.add('d-none');
    btnFinalizar.classList.remove('d-none');

    horaInicio.disabled = true;
    horaFim.disabled = true;

    timerInterval = setInterval(() => {
      const agora = Date.now();
      const decorrido = Math.floor((agora - inicioCronometro) / 1000);
      const total = tempoAcumulado + decorrido;
      atualizarDisplay(total);
    }, 1000);
  }

  function pausarCronometro() {
    if (!cronometroAtivo) return;
    clearInterval(timerInterval);
    const agora = Date.now();
    tempoAcumulado += Math.floor((agora - inicioCronometro) / 1000);
    cronometroAtivo = false;

    btnPausar.classList.add('d-none');
    btnRetomar.classList.remove('d-none');
  }

  function retomarCronometro() {
    inicioCronometro = Date.now();
    cronometroAtivo = true;

    btnRetomar.classList.add('d-none');
    btnPausar.classList.remove('d-none');

    timerInterval = setInterval(() => {
      const agora = Date.now();
      const decorrido = Math.floor((agora - inicioCronometro) / 1000);
      const total = tempoAcumulado + decorrido;
      atualizarDisplay(total);
    }, 1000);
  }

  function finalizarCronometro() {
    if (cronometroAtivo) {
      clearInterval(timerInterval);
      const agora = Date.now();
      tempoAcumulado += Math.floor((agora - inicioCronometro) / 1000);
      cronometroAtivo = false;
    }
    horaFim.value = new Date().toTimeString().slice(0, 5);
    atualizarDisplay(tempoAcumulado);
    calcularTempo();

    btnIniciar.classList.remove('d-none');
    btnPausar.classList.add('d-none');
    btnRetomar.classList.add('d-none');
    btnFinalizar.classList.add('d-none');

    horaInicio.disabled = false;
    horaFim.disabled = false;
  }

  function resetarCronometro() {
    clearInterval(timerInterval);
    cronometroAtivo = false;
    tempoAcumulado = 0;
    inicioCronometro = null;
    atualizarDisplay(0);

    btnIniciar.classList.remove('d-none');
    btnPausar.classList.add('d-none');
    btnRetomar.classList.add('d-none');
    btnFinalizar.classList.add('d-none');

    horaInicio.disabled = false;
    horaFim.disabled = false;
    horaInicio.value = '';
    horaFim.value = '';
  }

  /* ========== CARREGAMENTO DE LIVROS ========== */
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

  /* ========== CÁLCULOS AUTOMÁTICOS ========== */
  function calcularTempo() {
    if (horaInicio.value && horaFim.value) {
      const [hi, mi] = horaInicio.value.split(':').map(Number);
      const [hf, mf] = horaFim.value.split(':').map(Number);
      if (!isNaN(hi) && !isNaN(mi) && !isNaN(hf) && !isNaN(mf)) {
        let minutos = (hf * 60 + mf) - (hi * 60 + mi);
        if (minutos < 0) minutos += 1440;
        tempoMinSpan.textContent = minutos;
        tempoCalculadoDiv.classList.remove('d-none');
      } else {
        tempoCalculadoDiv.classList.add('d-none');
      }
    } else {
      tempoCalculadoDiv.classList.add('d-none');
    }
  }

  function calcularPaginas() {
    const pi = parseInt(pagInicial.value) || 0;
    const pf = parseInt(pagFinal.value) || 0;
    if (pf > pi) {
      let lidas = pf - pi;
      if (pi > 0) lidas += 1;
      lidas = Math.max(0, lidas);
      pagLidasSpan.textContent = lidas;
      pagLidasDiv.classList.remove('d-none');
    } else {
      pagLidasDiv.classList.add('d-none');
    }
  }

  /* ========== SALVAR SESSÃO ========== */
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

  // NOVO: alerta se data for futura (opcional, apenas avisa)
  const dataSessao = new Date(dataInput.value + 'T00:00:00');
  if (dataSessao.getTime() > new Date().setHours(23,59,59,999)) {
    Util.toast('Atenção: a data da sessão está no futuro!', 'warning');
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
      carregarHistorico();
      carregarLivros();
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
    resetarCronometro();
  }

  /* ========== HISTÓRICO ========== */
  async function carregarHistorico() {
    if (!historicoContainer) return;
    try {
      const resp = await API.enviar({ acao: 'listRecentSessions' });
      if (Array.isArray(resp) && resp.length > 0) {
        historicoContainer.innerHTML = '';
        const mapaTitulos = {};
        livrosCache.forEach(livro => {
          mapaTitulos[livro.ID] = livro.Título || 'Livro sem título';
        });

        resp.forEach(sess => {
          const div = document.createElement('div');
          div.className = 'd-flex justify-content-between align-items-center p-2 border-bottom';
          const dataFormatada = sess.Data
            ? new Date(sess.Data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
            : 'Data inválida';
          const pagInicial = sess.PáginaInicial !== undefined && sess.PáginaInicial !== '' ? sess.PáginaInicial : '?';
          const pagFinal = sess.PáginaFinal !== undefined && sess.PáginaFinal !== '' ? sess.PáginaFinal : '?';
          const faixaPaginas = (pagInicial !== '?' || pagFinal !== '?')
            ? `Pág. ${pagInicial}-${pagFinal}`
            : 'Páginas não informadas';
          const pagLidas = sess.PáginasLidas !== undefined ? sess.PáginasLidas : 0;
          const tempo = sess.Tempo ? `${sess.Tempo} min` : '';
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

        document.querySelectorAll('.btn-editar-sessao').forEach(btn => {
          btn.addEventListener('click', () => editarSessao(btn.dataset.id, resp));
        });
        document.querySelectorAll('.btn-excluir-sessao').forEach(btn => {
          btn.addEventListener('click', () => excluirSessao(btn.dataset.id));
        });
      } else {
        historicoContainer.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-clock fa-3x text-muted mb-3"></i>
            <p class="text-muted">Nenhuma sessão registrada ainda.</p>
          </div>`;
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
        carregarLivros();
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
