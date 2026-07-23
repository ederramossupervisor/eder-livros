/* ========== LEITOR DE EBOOK ========== */

#page-leitor.active {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  height: 100vh;   /* fallback */
  height: 100dvh;  /* viewport dinâmica no mobile */
  z-index: 1040;
  display: flex;
  flex-direction: column;
  background: var(--bg-body, #f8f9fa);
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}

@media (min-width: 768px) {
  #page-leitor.active {
    left: 250px;
  }
}

.leitor-topbar, .leitor-bottombar {
  flex-shrink: 0;
}

#leitor-container {
  padding: 0;
  transition: background 0.3s, color 0.3s;
  flex: 1;
  min-height: 0;
  position: relative;
  /* Suavização de fontes para leitura perfeita */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Regras de imagens e textos para conteúdos renderizados (DOCX / HTML) */
#leitor-container img {
  max-width: 100% !important;
  height: auto !important;
}

#leitor-container:not(.modo-paginado) {
  overflow-y: auto;
  overflow-x: hidden;
}

#leitor-container.modo-paginado {
  overflow: hidden !important;
}

#leitor-container.modo-paginado iframe {
  width: 100%;
  height: 100%;
  border: none;
}

/* Temas do Leitor */
#leitor-container.tema-claro { background: #ffffff; color: #1e293b; }
#leitor-container.tema-sepia { background: #f5e6d3; color: #3e2723; }
#leitor-container.tema-escuro { background: #1e293b; color: #e2e8f0; }

/* Overlay de carregamento adaptável ao tema */
.leitor-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(255, 255, 255, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: background 0.3s;
}

#leitor-container.tema-sepia .leitor-overlay {
  background: rgba(245, 230, 211, 0.85);
  color: #3e2723;
}

#leitor-container.tema-escuro .leitor-overlay {
  background: rgba(30, 41, 59, 0.85);
  color: #e2e8f0;
}

/* Barra Superior Responsiva */
.leitor-topbar {
  flex-wrap: nowrap;
  overflow-x: auto;
  gap: 0.25rem;
}
.leitor-topbar .btn {
  flex-shrink: 0;
  padding: 0.25rem 0.5rem;
}

@media (max-width: 480px) {
  .leitor-topbar {
    flex-direction: column;
    align-items: stretch !important;
    overflow-x: visible;
    row-gap: 0.4rem;
  }
  .leitor-topbar > div {
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
  }
  .leitor-topbar .btn {
    padding: 0.2rem 0.45rem;
    font-size: 0.8rem;
  }
  #leitor-titulo-livro {
    max-width: 100% !important;
    text-align: center;
  }
}

/* Offcanvas do Índice (TOC) */
#offcanvasIndice {
  width: min(85vw, 320px);
}

#lista-indice li {
  padding: 0.6rem 0.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  line-height: 1.4;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s;
  border-radius: 4px;
}

#lista-indice li:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: #0d6efd;
}

#lista-indice li.active {
  font-weight: bold;
  color: #0d6efd;
  background-color: rgba(13, 110, 253, 0.08);
}

/* Modais do Leitor */
#modal-config-leitor {
  z-index: 1055;
}

/* Zonas de clique para troca de página */
.zona-clique {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 20%;
  z-index: 5;
  cursor: pointer;
  touch-action: manipulation;
}

.zona-esquerda {
  left: 0;
}

.zona-direita {
  right: 0;
}

#leitor-container:not(.modo-paginado) .zona-clique {
  display: none;
}
