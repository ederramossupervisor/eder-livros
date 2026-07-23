/* ========== LEITOR DE EBOOK ========== */

#page-leitor.active {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  height: 100vh;   /* fallback */
  height: 100dvh;  /* viewport dinâmica no mobile — sobrescreve se suportado */
  z-index: 1040;
  display: flex;
  flex-direction: column;
  background: var(--bg-body);
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

#leitor-container.tema-claro { background: #ffffff; color: #1e293b; }
#leitor-container.tema-sepia { background: #f5e6d3; color: #3e2723; }
#leitor-container.tema-escuro { background: #1e293b; color: #e2e8f0; }

.leitor-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(255,255,255,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

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

#offcanvasIndice {
  width: min(85vw, 320px);
}
#lista-indice li {
  padding: 0.6rem 0.25rem;
  border-bottom: 1px solid rgba(0,0,0,0.08);
  line-height: 1.4;
}

#modal-config-leitor {
  z-index: 1055;
}

/* Zonas de clique para virar página no modo paginado */
.zona-clique {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 20%;
  z-index: 5;
  cursor: pointer;
  touch-action: manipulation; /* evita delay/ambiguidade de toque no mobile */
  /* deixe visível durante o teste, depois apague esta linha: */
  /* background: rgba(255,0,0,0.1); */
}

.zona-esquerda {
  left: 0;
}

.zona-direita {
  right: 0;
}

/* Só ativa as zonas no modo paginado — no modo rolagem, não faz sentido */
#leitor-container:not(.modo-paginado) .zona-clique {
  display: none;
}
