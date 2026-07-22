const OCR = (() => {
  let worker = null;

  async function initWorker() {
    if (worker) return worker;
    worker = await Tesseract.createWorker('por', 1, {
      logger: m => console.log(m)
    });
    // Define parâmetros para melhorar a precisão
    await worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.AUTO,         // Modo automático de segmentação
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç0123456789.,;:!?\'\"-–—()[]{}«»“”‘’/&@#$%*+= \n', // caracteres permitidos (português)
    });
    return worker;
  }

  // Pré-processamento da imagem para melhorar OCR
  function preprocessarImagem(imageFile) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Aumenta o tamanho se a imagem for muito pequena
        let scale = 1;
        if (img.width < 1000) {
          scale = Math.max(2, Math.ceil(1500 / img.width));
        }
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        // Desenha a imagem redimensionada
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Aplica filtros: escala de cinza + contraste
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          // Aumenta o contraste: valores abaixo de 128 ficam mais escuros, acima ficam mais claros
          const contrast = ((gray - 128) * 1.5) + 128; // fator 1.5 de contraste
          const val = Math.min(255, Math.max(0, contrast));
          data[i] = val;       // R
          data[i + 1] = val;   // G
          data[i + 2] = val;   // B
          // data[i+3] é alpha – mantido
        }
        ctx.putImageData(imageData, 0, 0);
        
        // Converte o canvas para Blob (tipo de arquivo que o Tesseract aceita)
        canvas.toBlob(blob => {
          resolve(blob);
        }, 'image/jpeg', 0.95);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(imageFile);
    });
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

      Util.toast('Reconhecendo texto... Isso pode levar alguns segundos.', 'info');
      const btn = document.querySelector('#btn-ocr-sessao, #btn-ocr');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Processando...';
      }

      try {
        // Pré-processa a imagem para melhorar o OCR
        const processedBlob = await preprocessarImagem(file);
        
        const w = await initWorker();
        const { data: { text } } = await w.recognize(processedBlob);
        
        // Pós-processamento do texto reconhecido
        let textoLimpo = text.trim()
          .replace(/\n{3,}/g, '\n\n')           // Reduz múltiplas quebras de linha
          .replace(/[ \t]+/g, ' ')              // Remove espaços múltiplos
          .replace(/([a-z])- ([a-z])/g, '$1$2') // Junta palavras hifenizadas no final da linha
          // Correções comuns de OCR
          .replace(/[\u2018\u2019]/g, "'")      // Aspas simples curvas → retas
          .replace(/[\u201C\u201D]/g, '"')      // Aspas duplas curvas → retas
          .replace(/\u2013|\u2014/g, '-')       // Travessão → hífen
          .replace(/\u00B4/g, "'")              // Acento agudo isolado → apóstrofo
          .replace(/\u0060/g, "'")              // Acento grave → apóstrofo
          .replace(/^\s*["']\s*/, '"')          // Limpa aspas no início
          .replace(/\s*["']\s*$/, '"');         // Limpa aspas no final

        // Se houver um targetElement (textarea), abre o modal de edição
        if (targetElement && targetElement.tagName === 'TEXTAREA') {
          abrirModalEdicaoOCR(textoLimpo, targetElement);
        } else {
          // Caso contrário, insere direto no elemento (ex.: div do modal de citação)
          const destino = targetElement || document.getElementById('citacao-texto');
          if (destino) {
            if (destino.tagName === 'TEXTAREA' || destino.tagName === 'INPUT') {
              destino.value = textoLimpo;
            } else {
              destino.textContent = `"${textoLimpo}"`;
            }
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

  // Abre o modal de edição do texto OCR
  function abrirModalEdicaoOCR(texto, targetTextarea) {
    const modalElement = document.getElementById('modal-ocr-edicao');
    const textarea = document.getElementById('ocr-texto-editavel');
    if (!modalElement || !textarea) {
      // Se o modal não existir, insere diretamente
      targetTextarea.value = texto;
      return;
    }

    textarea.value = texto;
    const modal = new bootstrap.Modal(modalElement);
    modal.show();

    // Botão confirmar
    const btnConfirmar = document.getElementById('btn-confirmar-ocr');
    const handler = () => {
      targetTextarea.value = textarea.value;
      modal.hide();
      btnConfirmar.removeEventListener('click', handler);
    };
    btnConfirmar.addEventListener('click', handler);

    // Quando o modal fechar, foca no textarea destino
    modalElement.addEventListener('hidden.bs.modal', () => {
      targetTextarea.focus();
    }, { once: true });
  }

  return { capturarECapturarTexto };
})();
