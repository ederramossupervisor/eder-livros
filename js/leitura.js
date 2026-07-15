/**
 * Módulo de registro de sessões de leitura – com cronômetro, máscara de hora e anotação integrada
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
  let tempoAcumulado = 0;
  let inicioCronometro = null;
  let timerInterval = null;

  // Reconhecimento de voz para observação da sessão
  let recognition = null;
  let targetInput = null;

  function initSpeech() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech Recognition não suportado neste navegador.');
      return;
    }
    recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;

    recognition.addEventListener('result', (e) => {
      const transcript = e.results[0][0].transcript;
      if (targetInput) {
        targetInput.value += (targetInput.value ? ' ' : '') + transcript;
      }
    });

    recognition.addEventListener('end', () => {
      const btn = document.getElementById('btn-voz-obs-sessao');
      if (btn) {
        btn.innerHTML = '<i class="fas fa-microphone"></i>';
      }
      targetInput = null;
    });

    recognition.addEventListener('error', () => {
      const btn = document.getElementById('btn-voz-obs-sessao');
      if (btn) {
        btn.innerHTML = '<i class="fas fa-microphone"></i>';
      }
      targetInput = null;
    });
  }

  function formatarHora(input) {
    let valor = input.value.replace(/\D/g, '');
    if (valor.length > 4) valor = valor.slice(0, 4);
    if (valor.length > 2) {
      valor = valor.slice(0, 2) + ':' + valor.slice(2);
    }
    input.value = valor;
  }

  function init() {
    if (!form) return;

    initSpeech();
    dataInput.valueAsDate = new Date();

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

    btnIniciar.addEventListener('click', iniciarCronometro);
    btnPausar.addEventListener('click', pausarCronometro);
    btnRetomar.addEventListener('click', retomarCronometro);
    btnFinalizar.addEventListener('click', finalizarCronometro);

    // Microfone da observação da sessão
    const btnVoz = document.getElementById('btn-voz-obs-sessao');
    const obsInput = document.getElementById('observacoes-sessao');
    if (btnVoz && obsInput) {
      btnVoz.addEventListener('click', () => {
        if (!recognition) {
          Util.toast('Reconhecimento de voz não suportado.', 'warning');
          return;
        }
        if (targetInput === obsInput) {
          recognition.stop();
          return;
        }
        if (targetInput) recognition.stop();
        targetInput = obsInput;
        btnVoz.innerHTML = '<i class="fas fa-stop"></i>';
        recognition.start();
      });
    }

    carregarLivros();
    carregarHistorico();
    console.log('✅ Módulo Leitura pronto (com anotação integrada e microfone).');
  }

  // ========== CRONÔMETRO ==========
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
    tempoAcumulado += Math.floor((Date.now() - inicioCronometro) / 1000);
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
      tempoAcumulado += Math.floor((Date.now() - inicioCronometro) / 1000);
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

  // ========== LIVROS ==========
  async function carregarLivros() {
    try {
      livroSelect.innerHTML = '<option value="">Carregando...</option>';
      const resp = await API.enviar({ acao: 'listBooks' });
      if (resp && Array.isArray(resp)) {
        livrosCache = resp;
        renderizarListaLivros();
      }
    } catch (e) {
      Util.toast('Erro ao carregar livros', 'danger');
    }
  }

  function renderizarListaLivros() {
    livroSelect.innerHTML = '<option value="">Selecione um livro...</option>';
    livrosCache.forEach(livro => {
      const opt = document.createElement('option');
      opt.value = livro.ID;
      opt.textContent = `${livro.Título} - ${livro.Autor} (${livro.Status})`;
      livroSelect.appendChild(opt);
    });
  }

  // ========== CÁLCULOS ==========
  function calcularTempo() {
    if (horaInicio.value && horaFim.value) {
      const [hi, mi] = horaInicio.value.split(':').map(Number);
      const [hf, mf] = horaFim.value.split(':').map(Number);
      if (!isNaN(hi) && !isNaN(mi) && !isNaN(hf) && !isNaN(mf)) {
        let minutos = (hf * 60 + mf) - (hi * 60 + mi);
        if (minutos < 0) minutos += 1440;
        tempoMinSpan.textContent = minutos;
        tempoCalculadoDiv.classList.remove('d-none');
      }
    }
  }

  function calcularPaginas() {
    const pi = parseInt(pagInicial.value) || 0;
    const pf = parseInt(pagFinal.value) || 0;
    if (pf > pi) {
      let lidas = pf - pi;
      if (pi > 0) lidas += 1;
      pagLidasSpan.textContent = Math.max(0, lidas);
      pagLidasDiv.classList.remove('d-none');
    }
  }

  // ========== SALVAR SESSÃO + ANOTAÇÃO ==========
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
  // Pequena pausa para garantir que o DOM esteja estável
  await new Promise(r => setTimeout(r, 150));

  // Lê diretamente do DOM
  const tipoObs = document.getElementById('tipo-obs-sessao')?.value || '';
  const textoObs = document.getElementById('observacoes-sessao')?.value?.trim() || '';

  console.log('📝 Criando anotação automática:');
  console.log('   Tipo:', tipoObs);
  console.log('   Texto:', textoObs);

  if (tipoObs && textoObs) {
    const paginaAnot = document.getElementById('pagina-obs-sessao')?.value || '';
    try {
      await API.enviar({
        acao: 'addNote',
        anotacao: {
          livroID,
          capitulo: '',
          pagina: paginaAnot,
          categoria: tipoObs,
          resumo: '',
          trecho: '',
          comentario: textoObs,
          imagem: ''
        }
      });
      console.log('✅ Anotação criada!');
    } catch (err) {
      console.error('❌ Erro ao criar anotação:', err);
    }
  } else {
    console.warn('⚠️ Anotação não criada: tipo ou texto vazio.');
  }

  Util.toast(editandoSessaoID ? 'Sessão atualizada!' : 'Sessão registrada!', 'success');
  limparFormulario();
 
}
        editandoSessaoID = null;
        btnSubmit.innerHTML = '<i class="fas fa-save me-1"></i> Registrar Sessão';
        carregarHistorico();
        carregarLivros();
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
    document.getElementById('tipo-obs-sessao').value = '';
    document.getElementById('pagina-obs-sessao').value = '';
    resetarCronometro();
  }

  // ========== HISTÓRICO ==========
  async function carregarHistorico() {
    if (!historicoContainer) return;
    try {
      const resp = await API.enviar({ acao: 'listRecentSessions' });
      if (Array.isArray(resp) && resp.length > 0) {
        historicoContainer.innerHTML = '';
        const mapaTitulos = {};
        livrosCache.forEach(l => mapaTitulos[l.ID] = l.Título || 'Sem título');

        resp.forEach(sess => {
          const dataFormatada = sess.Data ? new Date(sess.Data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '?';
          const pi = sess.PáginaInicial || '?';
          const pf = sess.PáginaFinal || '?';
          const pagLidas = sess.PáginasLidas || 0;
          const tempo = sess.Tempo ? `${sess.Tempo} min` : '';
          const nomeLivro = mapaTitulos[sess.LivroID] || 'Desconhecido';

          const div = document.createElement('div');
          div.className = 'd-flex justify-content-between align-items-center p-2 border-bottom';
          div.innerHTML = `
            <div>
              <strong>${nomeLivro}</strong><br>
              <small>${dataFormatada} - Pág. ${pi}-${pf} (${pagLidas} pág) ${tempo}</small>
              ${sess.Local ? `<br><small class="text-muted">Local: ${sess.Local}</small>` : ''}
            </div>
            <div>
              <button class="btn btn-sm btn-outline-secondary btn-editar-sessao" data-id="${sess.ID}"><i class="fas fa-edit"></i></button>
              <button class="btn btn-sm btn-outline-danger btn-excluir-sessao" data-id="${sess.ID}"><i class="fas fa-trash"></i></button>
            </div>`;
          historicoContainer.appendChild(div);
        });

        document.querySelectorAll('.btn-editar-sessao').forEach(btn => btn.addEventListener('click', () => editarSessao(btn.dataset.id, resp)));
        document.querySelectorAll('.btn-excluir-sessao').forEach(btn => btn.addEventListener('click', () => excluirSessao(btn.dataset.id)));
      }
    } catch (e) {
      console.error(e);
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
    form.querySelector('button[type="submit"]').innerHTML = '<i class="fas fa-save me-1"></i> Atualizar Sessão';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function excluirSessao(id) {
    if (confirm('Excluir esta sessão?')) {
      await API.enviar({ acao: 'deleteSession', id });
      carregarHistorico();
      carregarLivros();
      Util.toast('Sessão excluída', 'info');
    }
  }

  return { init };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', Leitura.init);
} else {
  Leitura.init();
}
