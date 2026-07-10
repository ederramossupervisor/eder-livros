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
// Adicione ao util.js ou crie um novo arquivo ripple.js
document.addEventListener('click', function(e) {
  const btn = e.target.closest('.btn');
  if (!btn) return;
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = (e.clientX - rect.left - size/2) + 'px';
  ripple.style.top = (e.clientY - rect.top - size/2) + 'px';
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
});
