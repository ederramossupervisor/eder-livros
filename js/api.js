const API = (() => {
  const BASE_URL = 'https://script.google.com/macros/s/AKfycbzTqBGdFu372Z_7fXeUuXuqEgaIV-DDTU1n1SDkh6cLrnY3UAaZuXqmXzNMiAvhtCk5pg/exec';

  async function enviar(dados, timeoutMs = 15000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const params = new URLSearchParams({ data: JSON.stringify(dados) });
    const url = `${BASE_URL}?${params.toString()}`;
    try {
      const resp = await fetch(url, { method: 'GET', signal: controller.signal });
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
