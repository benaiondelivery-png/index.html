// ========================================
// BENAION DELIVERY - CLIENTE (V1.6.0)
// ========================================

let meusPedidos = [];
let user = null;

async function initCliente() {
    if (window.Auth && window.API && window.Utils) {
        // 1. Proteção de Rota
        if (!window.Auth.requireAuth(['cliente'])) return;
        
        user = window.Auth.getCurrentUser();
        
        // 2. UI Inicial
        document.getElementById('nomeUsuario').textContent = user.name.split(' ')[0];
        
        // 3. Carga de Dados
        await carregarMeusPedidos();
        
        // 4. Loop de Atualização (Sincroniza status do pedido em tempo real)
        setInterval(carregarMeusPedidos, 30000); 

    } else {
        setTimeout(initCliente, 300);
    }
}

// --- CORE: BUSCA DE DADOS ---
async function carregarMeusPedidos() {
    try {
        const result = await window.API.getPedidos(1, 50); // Pega os últimos 50
        // Filtra apenas os pedidos deste cliente (usando o UID do Firebase)
        meusPedidos = result.data.filter(p => p.clienteId === user.id);
        
        renderizarListaPedidos();
        atualizarResumo();
    } catch (error) {
        console.error("Erro ao carregar histórico:", error);
    }
}

// --- UI: RENDERIZAÇÃO ---
function renderizarListaPedidos() {
    const container = document.getElementById('listaPedidos');
    if (!container) return;

    if (meusPedidos.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:40px; color:#999;">
                <i class="fas fa-shopping-bag fa-3x" style="margin-bottom:15px; opacity:0.3;"></i>
                <p>Você ainda não fez pedidos.<br>Que tal pedir algo agora?</p>
            </div>`;
        return;
    }

    // Ordena: Mais recentes primeiro
    meusPedidos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    container.innerHTML = meusPedidos.map(p => `
        <div class="card pedido-item animate__animated animate__fadeIn" style="margin-bottom:15px; border-left: 5px solid ${getStatusColor(p.status)}">
            <div style="display:flex; justify-content:space-between; align-items:start;">
                <div>
                    <span style="font-size:12px; color:#666;">#${p.id.substring(0,6).toUpperCase()}</span>
                    <h4 style="margin:5px 0;">${p.lojaNome || 'Benaion Delivery'}</h4>
                </div>
                <span class="badge" style="background:${getStatusColor(p.status)}; color:white; font-size:10px; padding:4px 8px; border-radius:10px;">
                    ${window.Utils.getStatusText(p.status)}
                </span>
            </div>
            
            <div style="margin:10px 0; font-size:13px; color:#444;">
                <i class="fas fa-map-marker-alt" style="color:var(--primary-red)"></i> ${p.bairroEntrega}<br>
                <i class="fas fa-utensils" style="color:var(--primary-red)"></i> ${p.descricao || 'Itens diversos'}
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #eee; pt-10; margin-top:10px; padding-top:10px;">
                <span style="font-weight:bold; color:var(--dark);">${window.Utils.formatCurrency(p.valorTotal)}</span>
                <button class="btn btn-small btn-outline" onclick="repetirPedido('${p.id}')" style="font-size:11px;">
                    <i class="fas fa-redo"></i> Repetir
                </button>
            </div>
        </div>
    `).join('');
}

// --- LÓGICA DE PEDIDO ---
async function criarPedido(dados) {
    try {
        // Validação da Tabela de Taxas antes de enviar
        const taxaEntrega = window.API.calcularTaxa(dados.bairroRetirada, dados.bairroEntrega);
        
        const novoPedido = {
            clienteId: user.id,
            clienteNome: user.name,
            status: 'pendente',
            taxaEntrega: taxaEntrega,
            valorTotal: parseFloat(dados.valorProdutos) + taxaEntrega,
            created_at: new Date().toISOString(),
            ...dados
        };

        await window.API.createPedido(novoPedido);
        window.Utils.showToast("Pedido enviado com sucesso!", "success");
        await carregarMeusPedidos();
    } catch (error) {
        window.Utils.showToast("Erro ao processar pedido", "error");
    }
}

// --- AUXILIARES ---
function getStatusColor(status) {
    const cores = {
        'pendente': '#f1c40f',    // Amarelo
        'aceito': '#3498db',      // Azul
        'em_transito': '#e67e22', // Laranja
        'concluido': '#2ecc71',   // Verde
        'cancelado': '#e74c3c'    // Vermelho
    };
    return cores[status] || '#95a5a6';
}

function atualizarResumo() {
    const totalGasto = meusPedidos
        .filter(p => p.status === 'concluido')
        .reduce((acc, p) => acc + (p.valorTotal || 0), 0);
    
    const countEl = document.getElementById('countPedidos');
    const gastoEl = document.getElementById('totalGasto');
    
    if (countEl) countEl.textContent = meusPedidos.length;
    if (gastoEl) gastoEl.textContent = window.Utils.formatCurrency(totalGasto);
}

function repetirPedido(id) {
    const anterior = meusPedidos.find(p => p.id === id);
    if (anterior) {
        // Preenche o modal de pedido com os dados antigos
        // Exemplo: document.getElementById('prodDesc').value = anterior.descricao;
        window.Utils.showModal('modalNovoPedido');
        window.Utils.showToast("Dados do último pedido carregados!");
    }
}

document.addEventListener('DOMContentLoaded', initCliente);
