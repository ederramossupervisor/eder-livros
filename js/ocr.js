const OCR = (() => {
  let worker = null;

  async function initWorker() {
    if (worker) return worker;
    worker = await Tesseract.createWorker('por', 1, {
      logger: m => console.log(m)
    });
    return worker;
  }

  // targetElement: elemento onde o texto será inserido após confirmação (textarea ou div)
  async function capturarECapturarTexto(targetElement) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.click();

    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) {
        document.body.removeChild(input);
        return;
      }

      Util.toast('Reconhecendo texto... Pode levar alguns segundos.', 'info');
      const btn = document.querySelector('#btn-ocr-sessao');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Processando...';
      }

      try {
        const w = await initWorker();
        const { data: { text } } = await w.recognize(file);
        const textoLimpo = text.trim().replace(/\n/g, ' ').replace(/\s+/g, ' ');

        // Exibe o modal de edição com o texto capturado
        abrirModalEdicao(textoLimpo, targetElement);
      } catch (erro) {
        console.error('Erro no OCR:', erro);
        Util.toast('Falha ao processar a imagem. Tente novamente.', 'danger');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-camera"></i>';
        }
        document.body.removeChild(input);
      }
    });
  }

  // Função para abrir o modal de edição e gerenciar a confirmação
  function abrirModalEdicao(texto, targetElement) {
    const modalElement = document.getElementById('modal-ocr-edicao');
    const textarea = document.getElementById('ocr-texto-editavel');
    const btnConfirmar = document.getElementById('btn-confirmar-ocr');

    if (!modalElement || !textarea || !btnConfirmar) {
      // Fallback: se o modal não existir, insere diretamente
      if (targetElement) {
        if (targetElement.tagName === 'TEXTAREA' || targetElement.tagName === 'INPUT') {
          targetElement.value = texto;
        } else {
          targetElement.textContent = `"${texto}"`;
        }
      }
      Util.toast('Texto capturado!', 'success');
      return;
    }

    // Preenche o textarea do modal
    textarea.value = texto;

    const modal = new bootstrap.Modal(modalElement);
    modal.show();

    // Remove listeners antigos para não duplicar
    const novoBtnConfirmar = btnConfirmar.cloneNode(true);
    btnConfirmar.parentNode.replaceChild(novoBtnConfirmar, btnConfirmar);

    novoBtnConfirmar.addEventListener('click', () => {
      const textoEditado = textarea.value.trim();
      if (targetElement) {
        if (targetElement.tagName === 'TEXTAREA' || targetElement.tagName === 'INPUT') {
          targetElement.value = textoEditado;
        } else {
          targetElement.textContent = textoEditado;
        }
      }
      modal.hide();
      Util.toast('Texto inserido!', 'success');
    });

    // Limpa o textarea ao fechar sem confirmar
    modalElement.addEventListener('hidden.bs.modal', () => {
      textarea.value = '';
    }, { once: true });
  }

  return { capturarECapturarTexto };
})();
