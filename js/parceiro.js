// ========================================
// BENAION DELIVERY - JS DO PARCEIRO (V2.1)
// ========================================
import { db } from './api.js';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let userLoja = null;
let todosPedidos = [];

async function init() {
    if (!window.Auth || !window.API || !window.Utils) {
        setTimeout(init, 300);
        return;
    }

    userLoja = window.Auth.getCurrentUser();
    
    if (!userLoja || userLoja.userType !== 'parceiro') {
        window.location.href = 'index.html';
        return;
    }

    const displayNome = document.getElementById('lojaNome');
    if (displayNome) displayNome.textContent = userLoja.storeName || userLoja.name;

    escutarPedidos();
    carregarProdutos();
}

// 1. MONITORAMENTO DE PEDIDOS E ADICIONAIS
function escutarPedidos() {
    const q = query(collection(db, "pedidos"), where("lojaId", "==", userLoja.id));

    onSnapshot(q, (snapshot) => {
        todosPedidos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        renderizarPainel();
    });
}

function renderizarPainel() {
    const container = document.getElementById('listaPedidos');
    const ativos = todosPedidos.filter(p => ['pendente', 'preparando', 'pronto', 'aceito', 'em_entrega'].includes(p.status));
    
    // Stats do Topo
    if(document.getElementById('pedidosAtivos')) document.getElementById('pedidosAtivos').textContent = ativos.length;

    if (ativos.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:40px; color:#999;">Nenhum pedido ativo.</div>`;
        return;
    }

    container.innerHTML = ativos.map(p => {
        // Lógica do Adicional de Tempo (30 centavos)
        const adicionalTempo = window.Utils.calcularAdicionalTempo(p.hora_chegada_mercado);
        
        return `
        <div class="card pedido-card ${p.status}" style="margin-bottom:15px; border-left: 5px solid var(--primary-red);">
            <div style="display:flex; justify-content:space-between;">
                <b>#${p.id.substring(0,6).toUpperCase()}</b>
                <span class="badge-status">${window.Utils.getStatusText(p.status)}</span>
            </div>
            
            <div style="margin:10px 0;">
                <strong>${p.clienteNome}</strong><br>
                <small>${p.bairro || 'Endereço não informado'}</small>
            </div>

            <div style="background: #fdfdfd; padding: 8px; border-radius: 5px; margin-bottom: 10px;">
                ${p.itens ? p.itens.map(i => `<div style="font-size:13px;">${i.qtd}x ${i.nome}</div>`).join('') : '<i>Pedido via Telefone/Manual</i>'}
            </div>

            ${p.hora_chegada_mercado ? `
                <div style="color: ${adicionalTempo > 0 ? 'var(--primary-red)' : '#2ecc71'}; font-weight: bold; font-size: 12px; margin-bottom: 10px;">
                    <i class="fas fa-stopwatch"></i> Adicional de Espera: ${window.Utils.formatCurrency(adicionalTempo)}
                </div>
            ` : ''}

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                ${p.status === 'pendente' ? 
                    `<button class="btn btn-primary" onclick="alterarStatus('${p.id}', 'preparando')">ACEITAR</button>` :
                    p.status === 'preparando' ?
                    `<button class="btn btn-primary" onclick="alterarStatus('${p.id}', 'pronto')" style="background:#3498db;">PRONTO</button>` :
                    `<button class="btn btn-small" disabled style="background:#eee; color:#999;">${window.Utils.getStatusText(p.status)}</button>`
                }
                <button class="btn btn-outline btn-small" onclick="window.Utils.openWhatsApp('${p.clienteTel || ''}', 'Olá, sou da ${userLoja.storeName}. Sobre seu pedido...')">
                    CONTATO
                </button>
            </div>
        </div>
    `}).join('');
}

// 2. CHAMAR ENTREGADOR (MANUAL) - INTEGRADO COM TAXAS DO ADMIN
window.lancarPedidoManualLoja = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;

    const bairroEntrega = document.getElementById('manualBairroEnt').value;
    // Puxa o bairro da própria loja para calcular a taxa correta
    const bairroLoja = userLoja.bairro || "Centro"; 
    
    // Usa a lógica de taxas que você mudou no Admin
    const taxaEntrega = window.API.calcularTaxa(bairroLoja, bairroEntrega);

    const novoPedido = {
        lojaId: userLoja.id,
        lojaNome: userLoja.storeName || userLoja.name,
        bairroRetirada: bairroLoja,
        clienteNome: document.getElementById('manualCliente').value,
        bairro: bairroEntrega,
        taxaEntrega: taxaEntrega,
        valorProdutos: parseFloat(document.getElementById('manualValor').value || 0),
        status: 'aguardando_entregador',
        created_at: Date.now(),
        origem: 'LOJA_PARCEIRA'
    };

    try {
        await addDoc(collection(db, "pedidos"), novoPedido);
        window.Utils.showToast("Entregador solicitado!", "success");
        window.Utils.hideModal('modalPedidoManual');
        e.target.reset();
    } catch (err) {
        window.Utils.showToast("Erro ao chamar entregador", "error");
    } finally {
        btn.disabled = false;
    }
};

// 3. GESTÃO DE PRODUTOS E STATUS
window.alterarStatus = async (id, status) => {
    const ref = doc(db, "pedidos", id);
    await updateDoc(ref, { status: status });
    window.Utils.showToast(`Status: ${window.Utils.getStatusText(status)}`);
};

async function carregarProdutos() {
    const grid = document.getElementById('gridProdutos');
    if(!grid) return;
    const q = query(collection(db, "produtos"), where("lojaId", "==", userLoja.id));
    const snap = await getDocs(q);
    grid.innerHTML = snap.docs.map(d => `
        <div class="product-card">
            <strong>${d.data().nome}</strong><br>
            <small>${window.Utils.formatCurrency(d.data().preco)}</small>
        </div>
    `).join('');
}

document.addEventListener('DOMContentLoaded', init);

