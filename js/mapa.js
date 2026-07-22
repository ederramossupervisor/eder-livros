const MapaLeitura = (() => {
  let mapa = null;
  let marcadores = [];

  async function init() {
    const container = document.getElementById('mapa-locais');
    if (!container) return;

    // Inicializa o mapa se ainda não existir
    if (!mapa) {
      mapa = L.map('mapa-locais').setView([-15.7934, -47.8822], 4); // Brasil central
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapa);
    }

    await carregarLocaisNoMapa();

    // Botão de atualizar
    document.getElementById('btn-atualizar-mapa')?.addEventListener('click', carregarLocaisNoMapa);
  }

  async function carregarLocaisNoMapa() {
    try {
      // Busca os locais compilados
      const locais = await API.enviar({ acao: 'listarLocais' });
      if (!Array.isArray(locais)) throw new Error('Resposta inválida');

      // Busca as configurações de coordenadas
      const configs = await API.enviar({ acao: 'getConfigs' });

      // Remove marcadores antigos
      marcadores.forEach(m => mapa.removeLayer(m));
      marcadores = [];

      // Adiciona marcadores para locais que tenham coordenada
      locais.forEach(local => {
        const chave = `local_coord_${local.local.replace(/\s+/g, '_')}`;
        const coordenadaStr = configs[chave];
        if (!coordenadaStr) return; // sem coordenada, pula

        const [lat, lng] = coordenadaStr.split(',').map(Number);
        if (isNaN(lat) || isNaN(lng)) return;

        const popupHtml = `
          <strong>${local.local}</strong><br>
          <hr class="my-1">
          📖 Sessões: ${local.sessoes}<br>
          📄 Páginas: ${local.paginas}<br>
          ⏱️ Horas: ${local.horas}<br>
          📚 Livros diferentes: ${local.livrosUnicos}
        `;

        const marker = L.marker([lat, lng])
          .addTo(mapa)
          .bindPopup(popupHtml);

        marcadores.push(marker);
      });

      // Ajusta a visualização para caber todos os marcadores, se houver
      if (marcadores.length > 0) {
        const grupo = L.featureGroup(marcadores);
        mapa.fitBounds(grupo.getBounds().pad(0.1));
      } else {
        mapa.setView([-15.7934, -47.8822], 4); // volta para Brasil
      }
    } catch (erro) {
      console.error('Erro ao carregar mapa:', erro);
      Util.toast('Falha ao carregar dados do mapa.', 'danger');
    }
  }

  return { init };
})();
