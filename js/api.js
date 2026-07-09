const API = (() => {
  // URL original do seu Apps Script
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzTqBGdFu372Z_7fXeUuXuqEgaIV-DDTU1n1SDkh6cLrnY3UAaZuXqmXzNMiAvhtCk5pg/exec';

  // Proxy CORS público
  const BASE_URL = 'https://corsproxy.io/?' + encodeURIComponent(SCRIPT_URL);

  async function enviar(dados, timeoutMs = 30000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const resp = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(dados),
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

  async function testarConexao() {
    try {
      const resp = await fetch(BASE_URL + '&' + new URLSearchParams({ data: JSON.stringify({ acao: 'listBooks' }) }), {
        method: 'GET'
      });
      return await resp.json();
    } catch (e) {
      return { status: 'erro', message: 'Sem comunicação.' };
    }
  }

  return { enviar, testarConexao };
})();
