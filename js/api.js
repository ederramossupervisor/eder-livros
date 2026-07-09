const API = (() => {
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzTqBGdFu372Z_7fXeUuXuqEgaIV-DDTU1n1SDkh6cLrnY3UAaZuXqmXzNMiAvhtCk5pg/exec';

  /**
   * Envia dados via fetch GET (preferencial) – evita CORS, não depende de proxy.
   */
  async function enviarFetch(dados, timeoutMs = 20000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const params = new URLSearchParams({ data: JSON.stringify(dados) });
    const url = `${SCRIPT_URL}?${params.toString()}`;

    try {
      const resp = await fetch(url, {
        method: 'GET',
        signal: controller.signal
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return await resp.json();
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('Tempo esgotado ao contatar o servidor.');
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Fallback JSONP (usado apenas se fetch falhar)
   */
  function enviarJSONP(dados) {
    return new Promise((resolve, reject) => {
      const callbackName = 'cb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      let timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('Tempo limite excedido.'));
      }, 15000);

      window[callbackName] = function(response) {
        clearTimeout(timeoutId);
        cleanup();
        if (response && response.erro) {
          reject(new Error(response.erro));
        } else {
          resolve(response);
        }
      };

      function cleanup() {
        if (window[callbackName]) delete window[callbackName];
        if (script.parentNode) document.body.removeChild(script);
        clearTimeout(timeoutId);
      }

      const params = new URLSearchParams({
        callback: callbackName,
        data: JSON.stringify(dados)
      });
      const url = `${SCRIPT_URL}?${params.toString()}`;
      const script = document.createElement('script');
      script.src = url;
      script.onerror = function() {
        clearTimeout(timeoutId);
        cleanup();
        reject(new Error('Falha na rede.'));
      };
      document.body.appendChild(script);
    });
  }

  /**
   * Envia dados com imagem (POST direto, sem ler resposta) – usado apenas para upload de capa.
   */
  function enviarComImagem(dados) {
    return fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(dados),
    })
    .then(response => true)
    .catch(error => {
      console.error('Erro no POST da imagem:', error);
      throw error;
    });
  }

  /**
   * Função principal: tenta fetch GET e, em caso de erro, recorre ao JSONP.
   */
  async function enviar(dados) {
    try {
      return await enviarFetch(dados);
    } catch (err) {
      console.warn('Fetch falhou, tentando JSONP...', err);
      return await enviarJSONP(dados);
    }
  }

  async function testarConexao() {
    try {
      const resp = await fetch(SCRIPT_URL);
      return await resp.json();
    } catch (e) {
      return { status: 'erro', message: 'Sem comunicação.' };
    }
  }

  return { enviar, enviarComImagem, testarConexao };
})();
