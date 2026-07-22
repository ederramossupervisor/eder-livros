const MapaLeitura = (() => {
  let mapa = null;
  let marcadores = [];

  async function init() {
    const container = document.getElementById('mapa-locais');
    if (!container) return;

    if (!mapa) {
      mapa = L.map('mapa-locais').setView([-15.7934, -47.8822], 4);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapa);
    }

    await carregarLocaisNoMapa();

    document.getElementById('btn-atualizar-mapa')?.addEventListener('click', carregarLocaisNoMapa);
  }

  async function carregarLocaisNoMapa() {
    try {
      const locais = await API.enviar({ acao: 'listarLocais' });
      if (!Array.isArray(locais)) throw new Error('Resposta inválida');

      const configs = await API.enviar({ acao: 'getConfigs' });

      // Remove marcadores antigos
      marcadores.forEach(m => mapa.removeLayer(m));
      marcadores = [];

      for (const local of locais) {
        const chave = `local_coord_${local.local.replace(/\s+/g, '_')}`;
        const coordenadaStr = configs[chave];
        if (!coordenadaStr) continue;

        const [lat, lng] = coordenadaStr.split(',').map(Number);
        if (isNaN(lat) || isNaN(lng)) continue;

        // Constrói o popup
        const popupHtml = `
          <div style="text-align:center;">
            ${local.ultimaCapa ? `<img src="${local.ultimaCapa}" alt="Capa" style="width:50px; height:70px; object-fit:cover; border-radius:4px; margin-bottom:5px;">` : ''}
            <strong>${local.local}</strong><br>
            <hr class="my-1">
            📖 Sessões: ${local.sessoes}<br>
            📄 Páginas: ${local.paginas}<br>
            ⏱️ Horas: ${local.horas}<br>
            📚 Livros diferentes: ${local.livrosUnicos}
            ${local.ultimoLivro ? `<br><small>📘 Último: ${local.ultimoLivro}</small>` : ''}
          </div>
        `;

        // Se tiver capa, cria ícone personalizado; senão, usa o padrão
        let marker;
        if (local.ultimaCapa) {
          const icone = L.icon({
            iconUrl: local.ultimaCapa,
            iconSize: [40, 56],       // tamanho do marcador
            iconAnchor: [20, 56],     // ponto de ancoragem (base do pin)
            popupAnchor: [0, -56],    // onde o popup abre
            className: 'icone-capa-marcador' // para CSS extra, se quiser
          });
          marker = L.marker([lat, lng], { icon: icone }).addTo(mapa);
        } else {
          marker = L.marker([lat, lng]).addTo(mapa);
        }

        marker.bindPopup(popupHtml);
        marcadores.push(marker);
      }

      if (marcadores.length > 0) {
        const grupo = L.featureGroup(marcadores);
        mapa.fitBounds(grupo.getBounds().pad(0.1));
      } else {
        mapa.setView([-15.7934, -47.8822], 4);
      }
    } catch (erro) {
      console.error('Erro ao carregar mapa:', erro);
      Util.toast('Falha ao carregar dados do mapa.', 'danger');
    }
  }

  return { init };
})();
