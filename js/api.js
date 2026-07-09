const API = (() => {
  const BASE_URL = 'https://script.google.com/macros/s/AKfycbzTqBGdFu372Z_7fXeUuXuqEgaIV-DDTU1n1SDkh6cLrnY3UAaZuXqmXzNMiAvhtCk5pg/exec';

  async function enviar(dados, timeoutMs = 30000) { // timeout maior para upload
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
      const resp = await fetch(BASE_URL);
      return await resp.json();
    } catch (e) {
      return { status: 'erro', message: 'Sem comunicação.' };
    }
  }

  return { enviar, testarConexao };
})();
