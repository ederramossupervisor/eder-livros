const OCR = (() => {
  let worker = null;

  async function initWorker() {
    if (worker) return worker;
    worker = await Tesseract.createWorker('por', 1, {
      logger: m => console.log(m)
    });
    return worker;
  }

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
    // Procura um botão de OCR para desabilitar (genérico)
    const btn = document.querySelector('#btn-ocr-sessao, #btn-ocr');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Processando...';
    }

    try {
      const w = await initWorker();
      const { data: { text } } = await w.recognize(file);
      const textoLimpo = text.trim().replace(/\n/g, ' ').replace(/\s+/g, ' ');

      // Destino padrão: se não informado, tenta o campo de citação do modal
      const destino = targetElement || document.getElementById('citacao-texto');
      if (destino) {
        if (destino.tagName === 'TEXTAREA' || destino.tagName === 'INPUT') {
          destino.value = textoLimpo;
        } else {
          destino.textContent = `"${textoLimpo}"`;
        }
      }
      Util.toast('Texto capturado com sucesso!', 'success');
    } catch (erro) {
      console.error('Erro no OCR:', erro);
      Util.toast('Falha ao processar a imagem. Tente novamente.', 'danger');
    } finally {
      if (btn) {
        btn.disabled = false;
        const icon = btn.querySelector('i');
        if (icon) {
          btn.innerHTML = '';
          btn.appendChild(icon);
          btn.appendChild(document.createTextNode(' Escanear página'));
        } else {
          btn.innerHTML = '<i class="fas fa-camera"></i> Escanear página';
        }
      }
      document.body.removeChild(input);
    }
  });
}
  return { capturarECapturarTexto };
})();
