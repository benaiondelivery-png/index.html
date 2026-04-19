// ========================================
// BENAION DELIVERY - PAINEL ADMINISTRATIVO
// ========================================

let todosPedidos = [];
let todosEntregadores = [];
let todosParceiros = [];
let filtroAtual = 'todos';
let currentUser = null;

// ========================================
// INICIALIZAÇÃO SEGURA (Aguarda API/Auth)
// ========================================

async function initAdmin() {
  if (window.Auth && window.API) {
    try {
      // Verificar autenticação Admin
      window.Auth.requireAuth(['admin']);
      currentUser = window.Auth.getCurrentUser();

      // Carga inicial de dados
      await carregarEstatisticas();
      await carregarPedidos();
      await carregarParceirosSelect();
      
      // Ciclo de atualização (30s)
      setInterval(async () => {
        await carregarEstatisticas();
        await carregarPedidos();
      }, 30000);
    } catch (error) {
      console.error('Erro ao validar administrador:', error);
    }
  } else {
    setTimeout(initAdmin, 500);
  }
}

document.addEventListener('DOMContentLoaded', initAdmin);

// ========================================
// ESTATÍSTICAS
// ========================================

async function carregarEstatisticas() {
  try {
    const stats = await window.API.getEstatisticas();
    
    document.getElementById('statPedidosHoje').textContent = stats.pedidosHoje || 0;
    document.getElementById('statPedidosAtivos').textContent = stats.pedidosAtivos || 0;
    document.getElementById('statEntregadoresOnline').textContent = stats.entregadoresOnline || 0;
    document.getElementById('statPedidosMes').textContent = stats.pedidosMes || 0;
  } catch (error) {
    console.error('Erro ao carregar estatísticas:', error);
  }
}

// ========================================
// PEDIDOS
// ========================================

async function carregarPedidos() {
  try {
    const result = await window.API.getPedidos(1, 1000);
    todosPedidos = result.data;
    filtrarPedidos(filtroAtual);
  } catch (error) {
    console.error('Erro ao carregar pedidos:', error);
    Utils.showToast('Erro ao carregar pedidos', 'error');
  }
}

function filtrarPedidos(status) {
  filtroAtual = status;
  
  // Atualizar estilo dos botões de filtro
  document.querySelectorAll('#abaPedidos .btn').forEach(btn => {
    btn.classList.remove('btn-secondary');
    btn.classList.add('btn-outline');
  });

  // Filtrar e renderizar
  const pedidosFiltrados = status === 'todos' 
    ? todosPedidos 
    : todosPedidos.filter(p => p.status === status);
  
  renderizarPedidos(pedidosFiltrados);
}

function renderizarPedidos(pedidos) {
  const container = document.getElementById('listaPedidos');
  if (pedidos.length === 0) {
    Utils.showEmptyState(container, '📦', 'Nenhum pedido encontrado', 'Sem movimentação nesta categoria.');
    return;
  }
  
  pedidos.sort((a, b) => b.created_at - a.created_at);
  
  container.innerHTML = pedidos.map(pedido => `
    <div class="pedido-card" onclick="abrirDetalhesPedido('${pedido.id}')">
      <div class="pedido-header">
        <div class="pedido-numero">#${pedido.id.substring(0, 8)}</div>
        <span class="status-badge status-${pedido.status}">
          ${Utils.getStatusText(pedido.status)}
        </span>
      </div>
      <div class="pedido-info">
        <div class="info-row"><strong>Cliente:</strong> ${pedido.clienteNome || 'Avulso'}</div>
        <div class="info-row"><strong>Entrega:</strong> ${pedido.enderecoEntrega}</div>
      </div>
      <div class="pedido-valor">${Utils.formatCurrency(pedido.valor)}</div>
    </div>
  `).join('');
}

// ========================================
// AÇÕES DE GESTÃO (ADMIN)
// ========================================

async function atribuirEntregador(pedidoId) {
  try {
    const entregadores = await window.API.getEntregadoresOnline();
    if (entregadores.length === 0) {
      Utils.showToast('Nenhum entregador online!', 'warning');
      return;
    }
    
    // Simples prompt para seleção (Pode ser substituído por um modal de seleção)
    const lista = entregadores.map((e, i) => `${i} - ${e.name}`).join('\n');
    const escolha = prompt(`Selecione o entregador:\n${lista}`);
    
    if (escolha !== null && entregadores[escolha]) {
      const e = entregadores[escolha];
      await window.API.updatePedido(pedidoId, {
        entregadorId: e.id,
        entregadorNome: e.name,
        status: 'aceito'
      });
      Utils.showToast('Entregador atribuído!', 'success');
      await carregarPedidos();
      Utils.hideModal('detalhesPedidoModal');
    }
  } catch (error) {
    Utils.showToast('Erro na atribuição', 'error');
  }
}

async function atualizarStatusPedidoAdmin(pedidoId, novoStatus) {
  if (!novoStatus) return;
  try {
    await window.API.atualizarStatusPedido(pedidoId, novoStatus);
    Utils.showToast('Status alterado pelo Admin', 'success');
    await carregarPedidos();
    Utils.hideModal('detalhesPedidoModal');
  } catch (error) {
    Utils.showToast('Erro ao atualizar status', 'error');
  }
}

// ========================================
// PARCEIROS
// ========================================

async function carregarParceirosSelect() {
  try {
    const result = await window.API.getParceiros(1, 1000);
    const select = document.getElementById('pedidoParceiro');
    if(select) {
      select.innerHTML = '<option value="">Sem parceiro (Venda Direta)</option>' +
        result.data.map(p => `<option value="${p.id}">${p.nomeComercio}</option>`).join('');
    }
  } catch (e) { console.error(e); }
}

// ========================================
// NAVEGAÇÃO DE ABAS
// ========================================

function mostrarAba(aba) {
  const abas = ['abaPedidos', 'abaEntregadores', 'abaParceiros'];
  abas.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.classList.add('hidden');
  });
  
  const idAtivo = 'aba' + aba.charAt(0).toUpperCase() + aba.slice(1);
  const elAtivo = document.getElementById(idAtivo);
  if(elAtivo) elAtivo.classList.remove('hidden');

  if (aba === 'entregadores') carregarEntregadores();
  if (aba === 'parceiros') carregarParceiros();
}

async function carregarEntregadores() {
  const container = document.getElementById('listaEntregadores');
  const result = await window.API.getUsers(1, 1000);
  const entregadores = result.data.filter(u => u.userType === 'entregador');
  
  container.innerHTML = entregadores.map(e => `
    <div class="card" style="margin-bottom:10px; padding:10px;">
      <strong>${e.name}</strong> - ${e.online ? '🟢 ON' : '⚫ OFF'}<br>
      <small>Entregas: ${e.totalDeliveries || 0}</small>
    </div>
  `).join('');
}
