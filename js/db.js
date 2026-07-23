/**
 * Módulo de banco de dados local (IndexedDB via Dexie)
 */
const DB = (() => {
  const db = new Dexie('EderLivrosDB');
  db.version(1).stores({
    livros: 'ID',
    sessoes: 'ID',
    anotacoes: 'ID',
    metas: 'Ano',
    conquistas: 'ID',
    dashboard: 'chave',
    estatisticas: 'chave'
  });

  // Nova versão — adiciona tabela para persistir o EPUB aberto e a posição de leitura
  db.version(2).stores({
    livros: 'ID',
    sessoes: 'ID',
    anotacoes: 'ID',
    metas: 'Ano',
    conquistas: 'ID',
    dashboard: 'chave',
    estatisticas: 'chave',
    leitorEstado: 'chave' // armazena um único objeto com chave='ultimo-livro'
  });

  async function salvarLivros(livros) {
    await db.livros.clear();
    await db.livros.bulkPut(livros);
  }

  async function obterLivros() {
    return await db.livros.toArray();
  }

  async function salvarDashboard(dados) {
    await db.dashboard.put({ chave: 'principal', ...dados });
  }

  async function obterDashboard() {
    return await db.dashboard.get('principal');
  }

  async function salvarEstatisticas(dados) {
    await db.estatisticas.put({ chave: 'principal', ...dados });
  }

  async function obterEstatisticas() {
    return await db.estatisticas.get('principal');
  }

  async function salvarSessoes(sessoes) {
    await db.sessoes.clear();
    await db.sessoes.bulkPut(sessoes);
  }

  async function obterSessoes() {
    return await db.sessoes.toArray();
  }

  async function salvarAnotacoes(anotacoes) {
    await db.anotacoes.clear();
    await db.anotacoes.bulkPut(anotacoes);
  }

  async function obterAnotacoes(livroID) {
    let todas = await db.anotacoes.toArray();
    if (livroID) {
      todas = todas.filter(a => a.LivroID === livroID);
    }
    return todas.sort((a, b) => new Date(b.Data) - new Date(a.Data));
  }

  async function salvarMetas(meta) {
    await db.metas.put(meta);
  }

  async function obterMetas(ano) {
    return await db.metas.get(ano);
  }

  async function salvarConquistas(conquistas) {
    await db.conquistas.clear();
    await db.conquistas.bulkPut(conquistas);
  }

  async function obterConquistas() {
    return await db.conquistas.toArray();
  }

  // ===== Estado do leitor de EPUB (arquivo + posição) =====
  async function salvarEstadoLeitor(arquivo, nomeArquivo, livroID = null) {
      // Presumindo que sua store seja 'leitorEstado' e use um ID fixo (ex: 1) para o leitor atual
      const estadoAtual = await db.leitorEstado.get(1) || {};
      
      await db.leitorEstado.put({
          id: 1, // Chave primária fixa para manter apenas um livro em memória de leitura
          arquivo: arquivo,
          nomeArquivo: nomeArquivo,
          cfi: estadoAtual.cfi || null,
          livroID: livroID !== null ? livroID : estadoAtual.livroID // Mantém o ID se já existir
      });
  }

  async function vincularLivroAoEstado(livroID) {
      const estadoAtual = await db.leitorEstado.get(1);
      if (estadoAtual) {
          await db.leitorEstado.update(1, { livroID: livroID });
      }
  }

  async function salvarPosicaoLeitor(cfi) {
    await db.leitorEstado.update('ultimo-livro', { cfi });
  }

  async function obterEstadoLeitor() {
    return await db.leitorEstado.get('ultimo-livro');
  }

  async function limparEstadoLeitor() {
    await db.leitorEstado.delete('ultimo-livro');
  }

  return {
    salvarLivros,
    obterLivros,
    salvarDashboard,
    obterDashboard,
    salvarEstatisticas,
    obterEstatisticas,
    salvarSessoes,
    obterSessoes,
    salvarAnotacoes,
    obterAnotacoes,
    salvarMetas,
    obterMetas,
    salvarConquistas,
    obterConquistas,
    salvarEstadoLeitor,
    salvarPosicaoLeitor,
    obterEstadoLeitor,
    limparEstadoLeitor
  };
})();
