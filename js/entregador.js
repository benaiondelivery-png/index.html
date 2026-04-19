// ========================================
// BENAION DELIVERY - PAINEL DO ENTREGADOR (V1.6.0)
// ========================================

let currentUser = null;
let monitorPedidos = null;

async function initEntregador() {
  if (window.Auth && window.API && window.Utils) {
    try {
      // 1. Proteção de Rota
      if (!window.Auth.requireAuth(['entregador'])) return;
      
      currentUser = window.Auth.getCurrentUser();

      // 2. Interface Inicial
      document.getElementById('entregadorNome').textContent = currentUser.name.split(' ')[0];
      
      // 3. Sincronização de Status com o Banco
      await sincronizarStatusInicial();
      
      // 4. Carga de Dados e Real-time
      await carregarEstatisticas();
      await carregarPedidos();
      
      // Monitoramento constante (reduzido para 10s para maior agilidade)
      if (monitorPedidos) clearInterval(monitorPedidos);
      monitorPedidos = setInterval(carregarPedidos, 10000);
      
      // 5. Permissões de Notificação (Essencial para novos pedidos)
      window.Utils.requestNotificationPermission();

    } catch (error) {
      console.error('Erro ao iniciar painel:', error);
      window.Utils.showToast('Erro de conexão', 'error');
    }
  } else {
    setTimeout(initEntregador, 300);
  }
}

// ========================================
// GESTÃO DE DISPONIBILIDADE
// ========================================

async function sincronizarStatusInicial() {
  // Busca o status atualizado no Firestore para garantir
  const perfil = await window.API.getUserProfile(currentUser.id);
  if (perfil) {
    currentUser.online = perfil.online || false;
    atualizarUIStatus(currentUser.online);
  }
}

function atualizarUIStatus(online) {
  const dot = document.querySelector('.status-dot');
  const txtStatus = document.getElementById('txtStatus');
  const navStatus = document.getElementById('navStatus');
  const btnStatusHeader = document.getElementById('btnStatusHeader');

  if (online) {
    if (dot) dot.className = "fas fa-circle status-dot online";
    if (txtStatus) txtStatus.innerHTML = '<i class="fas fa-circle status-dot online"></i> Disponível';
    if (btnStatusHeader) btnStatusHeader.style.color = "#2ecc71";
    window.Utils.showToast("Você está visível para novas entregas!", "success");
  } else {
    if (dot) dot.className = "fas fa-circle status-dot offline";
    if (txtStatus) txtStatus.innerHTML = '<i class="fas fa-circle status-dot offline"></i> Offline';
    if (btnStatusHeader) btnStatusHeader.style.color = "#ccc";
  }
}

async function toggleStatus() {
  try {
    const novoStatus = !currentUser.online;
    await window.API.updateUser(currentUser.id, { online: novoStatus });
    currentUser.online = novoStatus;
    atualizarUIStatus(novoStatus);
  } catch (error) {
    window.Utils.showToast('Erro ao atualizar status', 'error');
  }
}

// ========================================
// LOGÍSTICA DE ENTREGAS
// ========================================

async function carregarPedidos() {
  try {
    // Busca pedidos disponíveis e as que ele já aceitou
    const todos = await window.API.getPedidos(1, 100);
    
    const disponiveis = todos.data.filter(p => p.status === 'pendente');
    const minhas = todos.data.filter(p => 
        p.entregadorId === currentUser.id && 
        ['aceito', 'em_transito'].includes(p.status)
    );

    renderizarListaDisponiveis(disponiveis);
    renderizarMinhasEntregas(minhas);
    
  } catch (error) {
    console.log('Erro na atualização de pedidos');
  }
}

function renderizarListaDisponiveis(pedidos) {
  const container = document.getElementById('listaPedidosDisponiveis');
  if (!container) return;

  if (pedidos.length === 0) {
    container.innerHTML = '<p class="text-center py-4">Nenhum pedido na região...</p>';
    return;
  }

  container.innerHTML = pedidos.map(p => `
    <div class="pedido-card animate__animated animate__pulse">
      <div class="d-flex justify-between">
        <span class="badge-loja">${p.parceiroNome || 'Venda Direta'}</span>
        <span class="valor-taxa">R$ ${parseFloat(p.taxaEntrega).toFixed(2)}</span>
      </div>
      <div class="rota-info">
        <p><i class="fas fa-store"></i> <b>Origem:</b> ${p.bairroRetirada}</p>
        <p><i class="fas fa-map-marker-alt"></i> <b>Destino:</b> ${p.bairroEntrega}</p>
      </div>
      <button class="btn btn-primary w-100 mt-2" onclick="aceitarPedido('${p.id}')">
        ACEITAR CORRIDA
      </button>
    </div>
  `).join('');
}

async function aceitarPedido(id) {
  if (!currentUser.online) {
    window.Utils.showToast("Fique Online para aceitar pedidos!", "warning");
    return;
  }

  try {
    await window.API.updatePedido(id, {
      entregadorId: currentUser.id,
      entregadorNome: currentUser.name,
      status: 'aceito',
      aceito_em: new Date().toISOString()
    });
    
    window.Utils.showToast("Corrida confirmada!", "success");
    mostrarAba('minhas');
    carregarPedidos();
  } catch (error) {
    window.Utils.showToast("Este pedido já foi aceito", "error");
  }
}

// ========================================
// FERRAMENTAS DE CAMINHO (GOOGLE MAPS/WHATSAPP)
// ========================================

function abrirNavegacao(endereco) {
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;
  window.open(url, '_blank');
}

function abrirChatCliente(tel) {
  if(!tel) return window.Utils.showToast("Telefone não cadastrado", "info");
  window.open(`https://wa.me/55${tel.replace(/\D/g,'')}`, '_blank');
}

// ========================================
// FINANCEIRO E STATS
// ========================================

async function carregarEstatisticas() {
  const estatisticas = {
    hoje: 0,
    saldo: 0
  };
  
  try {
    const result = await window.API.getPedidos(1, 500);
    const concluidosHoje = result.data.filter(p => 
      p.entregadorId === currentUser.id && 
      p.status === 'concluido'
    );

    estatisticas.hoje = concluidosHoje.length;
    estatisticas.saldo = concluidosHoje.reduce((acc, p) => acc + (p.taxaEntrega || 0), 0);

    document.getElementById('statHoje').textContent = estatisticas.hoje;
    document.getElementById('statSaldo').textContent = window.Utils.formatCurrency(estatisticas.saldo);
  } catch (e) {
    console.warn("Erro ao processar saldo");
  }
}

document.addEventListener('DOMContentLoaded', initEntregador);
