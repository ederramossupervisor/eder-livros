// Utilitários gerais
const Util = {
  // Seletores curtos
  qs: (sel) => document.querySelector(sel),
  qsa: (sel) => document.querySelectorAll(sel),

  // Toast notification simples
  toast: (mensagem, tipo = 'info') => {
    // Será implementado futuramente com Bootstrap toasts
    console.log(`[${tipo.toUpperCase()}] ${mensagem}`);
  },

  // Formata data ISO para local
  formatDate: (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('pt-BR');
  },

  // Salva/Lê preferências no localStorage
  setPreference: (key, value) => localStorage.setItem(`leitura_${key}`, JSON.stringify(value)),
  getPreference: (key, def = null) => {
    const val = localStorage.getItem(`leitura_${key}`);
    return val ? JSON.parse(val) : def;
  }
};