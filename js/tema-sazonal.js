/**
 * Módulo de Tema Sazonal Automático
 * Ajusta a cor primária com base na hora do dia.
 */
const TemaSazonal = (() => {
  function aplicarCorPorHora() {
    const hora = new Date().getHours();
    let corPrimaria;
    if (hora >= 5 && hora < 12) {
      // Manhã: tom laranja suave
      corPrimaria = '#f59e0b';
    } else if (hora >= 12 && hora < 18) {
      // Tarde: azul vibrante
      corPrimaria = '#3b82f6';
    } else {
      // Noite: roxo/índigo
      corPrimaria = '#8b5cf6';
    }
    document.documentElement.style.setProperty('--primary', corPrimaria);
  }

  // Atualiza a cada minuto (caso a hora mude)
  setInterval(aplicarCorPorHora, 60000);
  aplicarCorPorHora(); // aplica imediatamente

  return { aplicarCorPorHora };
})();
