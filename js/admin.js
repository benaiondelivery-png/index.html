// ========================================
// BENAION DELIVERY - PAINEL ADMINISTRATIVO (V2.1.0)
// ========================================

let todosPedidos = [];
let filtroAtual = 'todos';

/**
 * Inicialização com proteção contra "auth is not defined"
 */
async function initAdmin() {
    // Garante que o motor do sistema (API e Auth) esteja carregado globalmente
    if (!window.Auth || !window.API || !window.auth) {
        setTimeout(initAdmin, 300);
        return;
    }

    try {
        // Proteção de Rota: Só entra se for admin
        const autenticado = window.Auth.requireAuth(['admin']);
        if (!autenticado) return;

        console.log('🚀 Benaion Admin: Sistema iniciado em tempo real.');
        
        // 1. Escuta Pedidos em Tempo Real (Sem intervalos de 20s)
        window.API.escutarTodosPedidos((pedidos) => {
            todosPedidos = pedidos;
            actualizarInterfaceAdmin();
            renderizarPedidosAdmin();
        });

        // 2. Carrega a Gestão de Taxas Dinâmicas
        carregarConfiguracoesTaxas();

    } catch (error) {
        console.error('Falha crítica na inicialização:', error);
        if (window.Utils) window.Utils.showToast('Erro ao carregar sistema', 'error');
    }
}

// ========================================
// DASHBOARD & ESTATÍSTICAS (REAL-TIME)
// ========================================

function actualizarInterfaceAdmin() {
    const hoje = new Date().toLocaleDateString();
    
    // Filtros rápidos para o Dashboard
    const pedidosHoje = todosPedidos.filter(p => {
        const data = p.created_at?.seconds ? new Date(p.created_at.seconds * 1000) : new Date(p.created_at);
        return data.toLocaleDateString() === hoje;
    });

    const ativos = todosPedidos.filter(p => ['pendente', 'preparando', 'aceito', 'em_entrega'].includes(p.status)).length;
    
    // Atualiza os contadores na tela
    updateStat('statPedidosHoje', pedidosHoje.length);
    updateStat('statPedidosAtivos', ativos);
    
    // Cálculo de faturamento de taxas (TOT)
    const faturamentoTaxas = pedidosHoje.reduce((acc, curr) => acc + (curr.taxaEntrega || 0), 0);
    updateStat('statFaturamento', window.Utils.formatCurrency(faturamentoTaxas));
}

function updateStat(id, valor) {
    const el = document.getElementById(id);
    if (el) el.textContent = valor;
}

// ========================================
// GESTÃO DINÂMICA DE TAXAS (Laranjal/Monte Dourado)
// ========================================

function carregarConfiguracoesTaxas() {
    const container = document.getElementById('listaConfigTaxas');
    if (!container) return;

    // Puxa a tabela TOT_BENAION que está sincronizada no window.TAXAS_LOCAIS
    const taxas = window.TAXAS_LOCAIS || {}; 

    container.innerHTML = Object.keys(taxas).map(bairro => `
        <div class="taxa-row" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee;">
            <span style="font-weight: 500;">${bairro}</span>
            <div style="display: flex; align-items: center; gap: 5px;">
                <small>R$</small>
                <input type="number" class="input-taxa-dinamica" data-bairro="${bairro}" value="${taxas[bairro]}" 
                       style="width: 70px; border: 1px solid #ddd; border-radius: 4px; text-align: center;">
            </div>
        </div>
    `).join('');
}

window.salvarNovasTaxas = async () => {
    const inputs = document.querySelectorAll('.input-taxa-dinamica');
    const novaTabela = {};

    inputs.forEach(input => {
        novaTabela[input.dataset.bairro] = parseFloat(input.value);
    });

    try {
        await window.API.atualizarTabelaTaxas(novaTabela);
        window.Utils.showToast("Tabela Oficial de Taxas atualizada!", "success");
    } catch (err) {
        window.Utils.showToast("Erro ao salvar taxas no banco", "error");
    }
};

// ========================================
// FILTROS E BUSCA
// ========================================

window.filtrarPedidos = (status) => {
    filtroAtual = status;
    renderizarPedidosAdmin();
    
    // UI: Muda cor dos botões de filtro
    document.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
};

function renderizarPedidosAdmin() {
    const container = document.getElementById('containerPedidosAdmin');
    if (!container) return;

    const pedidosFiltrados = filtroAtual === 'todos' 
        ? todosPedidos 
        : todosPedidos.filter(p => p.status === filtroAtual);

    if (pedidosFiltrados.length === 0) {
        container.innerHTML = '<div class="text-center p-4">Nenhum pedido encontrado neste filtro.</div>';
        return;
    }

    container.innerHTML = pedidosFiltrados.map(p => `
        <div class="card-pedido-admin" style="border-left: 5px solid ${getStatusColor(p.status)}; margin-bottom: 10px; padding: 15px; background: #fff; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
            <div style="display: flex; justify-content: space-between;">
                <strong>#${p.id.substring(0, 6).toUpperCase()} - ${p.lojaNome || 'Benaion Delivery'}</strong>
                <span class="badge" style="background: ${getStatusColor(p.status)}; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 11px;">
                    ${window.Utils.getStatusText(p.status).toUpperCase()}
                </span>
            </div>
            <div style="font-size: 13px; margin: 8px 0;">
                <p>📍 ${p.bairroRetirada} ➔ ${p.bairro}</p>
                <p>👤 Cliente: ${p.clienteNome}</p>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f5f5f5; padding-top: 10px;">
                <span style="font-weight: bold; color: var(--primary-red);">TX: ${window.Utils.formatCurrency(p.taxaEntrega)}</span>
                <button class="btn btn-small" onclick="abrirDetalhesPedido('${p.id}')">VER DETALHES</button>
            </div>
        </div>
    `).join('');
}

function getStatusColor(status) {
    const cores = {
        'pendente': '#f1c40f',
        'aceito': '#3498db',
        'em_entrega': '#e67e22',
        'finalizado': '#2ecc71',
        'cancelado': '#e74c3c'
    };
    return cores[status] || '#95a5a6';
}

document.addEventListener('DOMContentLoaded', initAdmin);
