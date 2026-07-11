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
/**
 * Converte links de compartilhamento do Google Drive em links diretos de imagem.
 * Aceita formatos como:
 *   https://drive.google.com/file/d/ID/view?usp=sharing
 *   https://drive.google.com/file/d/ID/view?usp=drive_link
 * Retorna a URL original caso não seja um link do Drive.
 */
Util.converterLinkDrive = function(url) {
  const regex = /\/file\/d\/([^/]+)\//;
  const match = url.match(regex);
  if (match && match[1]) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
  }
  return url; // não é um link do Drive, retorna o original
};
