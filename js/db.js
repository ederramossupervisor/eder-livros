/**
 * Módulo de banco de dados local (IndexedDB via Dexie)
 */
const DB = (() => {
  const db = new Dexie('EderLivrosDB');
  db.version(1).stores({
    livros: 'ID',        // chave primária = ID do livro
    sessoes: 'ID',       // chave primária = ID da sessão
    anotacoes: 'ID',     // chave primária = ID da anotação
    metas: 'Ano',        // chave primária = Ano
    conquistas: 'ID',    // chave primária = ID da conquista
    dashboard: 'chave',  // armazena um único objeto com chave='principal'
    estatisticas: 'chave'// armazena um único objeto com chave='principal'
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
    obterConquistas
  };
})();
