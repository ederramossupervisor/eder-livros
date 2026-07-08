const API = (() => {
  const BASE_URL = 'https://script.google.com/macros/s/AKfycbzTqBGdFu372Z_7fXeUuXuqEgaIV-DDTU1n1SDkh6cLrnY3UAaZuXqmXzNMiAvhtCk5pg/exec';

  function enviar(dados) {
    return new Promise((resolve, reject) => {
      const callbackName = 'callback_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      window[callbackName] = function(response) {
        delete window[callbackName];
        document.body.removeChild(script);
        resolve(response);
      };

      const params = new URLSearchParams({
        callback: callbackName,
        data: JSON.stringify(dados)
      });
      const url = `${BASE_URL}?${params.toString()}`;
      const script = document.createElement('script');
      script.src = url;
      script.onerror = function() {
        delete window[callbackName];
        document.body.removeChild(script);
        reject(new Error('Erro de rede'));
      };
      document.body.appendChild(script);
    });
  }

  async function testarConexao() {
    // Como JSONP não permite verificar facilmente, fazemos um GET simples sem callback
    try {
      const resp = await fetch(BASE_URL);
      const data = await resp.json();
      return data;
    } catch (e) {
      return { status: 'erro', message: 'Sem comunicação.' };
    }
  }

  return { enviar, testarConexao };
})();