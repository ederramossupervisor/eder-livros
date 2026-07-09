const API = (() => {
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzTqBGdFu372Z_7fXeUuXuqEgaIV-DDTU1n1SDkh6cLrnY3UAaZuXqmXzNMiAvhtCk5pg/exec';

  /**
   * Envia dados via JSONP (GET com callback) – para ações normais.
   */
  function enviar(dados) {
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
   * Retorna verdadeiro se a requisição foi enviada (não garante sucesso, mas evita CORS).
   */
  function enviarComImagem(dados) {
    return fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(dados),
    })
    .then(response => {
      // Não tentamos ler o corpo (evita CORS). Consideramos sucesso se não houver erro de rede.
      return true;
    })
    .catch(error => {
      console.error('Erro no POST da imagem:', error);
      throw error;
    });
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
