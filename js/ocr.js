const OCR = (() => {
  let worker = null;

  async function initWorker() {
    if (worker) return worker;
    worker = await Tesseract.createWorker('por', 1, {
      logger: m => console.log(m)
    });
    return worker;
  }

  async function capturarECapturarTexto() {
    // Cria input file temporário
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // câmera traseira no mobile
    input.style.display = 'none';
    document.body.appendChild(input);
    input.click();

    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) {
        document.body.removeChild(input);
        return;
      }

      // Mostra feedback
      Util.toast('Reconhecendo texto... Pode levar alguns segundos.', 'info');
      const btn = document.getElementById('btn-ocr');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Processando...';
      }

      try {
        const w = await initWorker();
        const { data: { text } } = await w.recognize(file);
        const textoLimpo = text.trim().replace(/\n/g, ' ').replace(/\s+/g, ' ');

        // Insere o texto no campo de citação do modal
        const citacaoEl = document.getElementById('citacao-texto');
        if (citacaoEl) {
          citacaoEl.textContent = `"${textoLimpo}"`;
        }

        Util.toast('Texto capturado com sucesso!', 'success');
      } catch (erro) {
        console.error('Erro no OCR:', erro);
        Util.toast('Falha ao processar a imagem. Tente novamente.', 'danger');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-camera"></i> Escanear página do livro';
        }
        document.body.removeChild(input);
      }
    });
  }

  return { capturarECapturarTexto };
})();
