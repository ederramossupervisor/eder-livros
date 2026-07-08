const Configuracoes = (() => {
  async function init() {
    const page = document.getElementById('page-configuracoes');
    if (!page || !page.classList.contains('active')) return;

    console.log('⚙️ Carregando configurações...');
    await carregarConfiguracoes();
    configurarEventos();
    await carregarInfoSistema();
    console.log('✅ Módulo Configurações pronto.');
  }

  async function carregarConfiguracoes() {
    try {
      const config = await API.enviar({ acao: 'getConfigs' });
      if (config && !config.erro) {
        document.getElementById('config-meta-livros').value = config.metaLivrosPadrao || '';
        document.getElementById('config-meta-paginas').value = config.metaPaginasPadrao || '';
        document.getElementById('config-cor').value = config.corPrimaria || '#1a73e8';
        document.getElementById('config-tema').value = config.tema || 'light';
      }
    } catch (e) {
      console.error('Erro ao carregar configurações:', e);
    }
  }

  function configurarEventos() {
    // Salvar preferências
    document.getElementById('form-config').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await API.enviar({ acao: 'saveConfig', chave: 'metaLivrosPadrao', valor: document.getElementById('config-meta-livros').value });
        await API.enviar({ acao: 'saveConfig', chave: 'metaPaginasPadrao', valor: document.getElementById('config-meta-paginas').value });
        await API.enviar({ acao: 'saveConfig', chave: 'corPrimaria', valor: document.getElementById('config-cor').value });
        await API.enviar({ acao: 'saveConfig', chave: 'tema', valor: document.getElementById('config-tema').value });

        // Aplicar cor e tema imediatamente
        aplicarTemaCor();
        Util.toast('Configurações salvas!', 'success');
      } catch (erro) {
        Util.toast('Erro ao salvar configurações', 'danger');
      }
    });

    // Backup
    document.getElementById('btn-backup').addEventListener('click', async () => {
      try {
        const backup = await API.enviar({ acao: 'exportBackup' });
        const jsonStr = JSON.stringify(backup, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `leitura_plus_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        Util.toast('Backup baixado com sucesso!', 'success');
      } catch (e) {
        Util.toast('Erro ao gerar backup', 'danger');
      }
    });

    // Restauração
    const inputRestore = document.getElementById('input-restore');
    const btnRestore = document.getElementById('btn-restore');

    inputRestore.addEventListener('change', () => {
      btnRestore.disabled = !inputRestore.files.length;
    });

    btnRestore.addEventListener('click', async () => {
      const file = inputRestore.files[0];
      if (!file) return;
      if (!confirm('Tem certeza que deseja restaurar este backup? Todos os dados atuais serão substituídos.')) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const backupData = JSON.parse(e.target.result);
          btnRestore.disabled = true;
          btnRestore.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Restaurando...';
          await API.enviar({ acao: 'importBackup', backup: backupData });
          Util.toast('Dados restaurados com sucesso! Recarregue a página.', 'success');
          setTimeout(() => location.reload(), 2000);
        } catch (erro) {
          Util.toast('Erro ao restaurar: ' + erro.message, 'danger');
          btnRestore.disabled = false;
          btnRestore.innerHTML = '<i class="fas fa-upload"></i> Restaurar';
        }
      };
      reader.readAsText(file);
    });
  }

  async function carregarInfoSistema() {
    try {
      const livros = await API.enviar({ acao: 'listAllBooks' });
      const total = Array.isArray(livros) ? livros.length : 0;
      document.getElementById('info-total-livros').textContent = total;
      // Estimativa grosseira de espaço (1KB por livro)
      document.getElementById('info-espaco').textContent = (total * 1).toFixed(0) + ' KB (estimado)';
    } catch (e) {
      console.error(e);
    }
  }

  function aplicarTemaCor() {
    const cor = document.getElementById('config-cor').value;
    const tema = document.getElementById('config-tema').value;
    // Aplica cor principal
    document.documentElement.style.setProperty('--primary', cor);
    // Aplica tema
    if (tema === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    // Salva localmente também
    Util.setPreference('darkMode', tema === 'dark');
    Util.setPreference('corPrimaria', cor);
  }

  return { init };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Configuracoes.init());
} else {
  Configuracoes.init();
}