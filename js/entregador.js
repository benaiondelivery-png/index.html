// ========================================
// BENAION DELIVERY - PAINEL DO ENTREGADOR (V2.1.0)
// ========================================
import { db } from './api.js';
import { collection, query, where, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let currentUser = null;
let pedidosEscutados = [];

/**
 * Inicialização Blindada contra "auth is not defined"
 */
async function initEntregador() {
    // 1. Aguarda as ferramentas globais estarem prontas
    if (!window.Auth || !window.API || !window.auth) {
        setTimeout(initEntregador, 300);
        return;
    }

    try {
        // 2. Proteção de Rota
        if (!window.Auth.requireAuth(['entregador'])) return;
        currentUser = window.Auth.getCurrentUser();

        // 3. UI Inicial (Mantendo seu visual limpo)
        const displayNome = document.getElementById('entregadorNome');
        if (displayNome) displayNome.textContent = currentUser.name.split(' ')[0];
        
        // 4. Sincroniza Online/Offline e Inicia Monitoramento
        await sincronizarStatusInicial();
        escutarPedidosSistema();

    } catch (error) {
        console.error('Erro na inicialização do entregador:', error);
    }
}

// ========================================
// MONITORAMENTO REAL-TIME (RADAR)
// ========================================

function escutarPedidosSistema() {
    const q = query(collection(db, "pedidos"));

    onSnapshot(q, (snapshot) => {
        pedidosEscutados = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Filtra o que aparece no Radar vs Minhas Entregas
        const disponiveis = pedidosEscutados.filter(p => p.status === 'aguardando_entregador' || p.status === 'pronto');
        const meus = pedidosEscutados.filter(p => p.entregadorId === currentUser.id && !['finalizado', 'cancelado'].includes(p.status));

        renderizarDisponiveis(disponiveis);
        renderizarMinhasEntregas(meus);
        atualizarEstatisticas();
    });
}

// ========================================
// GESTÃO DE ENTREGAS
// ========================================

function renderizarDisponiveis(pedidos) {
    const container = document.getElementById('listaPedidosDisponiveis');
    if (!container) return;

    if (pedidos.length === 0 || !currentUser.online) {
        container.innerHTML = `
            <div class="text-center py-4" style="color: #999;">
                ${!currentUser.online ? '<i class="fas fa-toggle-off fa-2x mb-2"></i><br>Fique ONLINE para ver pedidos' : 'Buscando pedidos no radar...'}
            </div>`;
        return;
    }

    container.innerHTML = pedidos.map(p => `
        <div class="card pedido-card animate__animated animate__pulse" style="border-left: 5px solid #2ecc71; margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span class="badge-loja" style="background:#f8f9fa; padding:4px 8px; border-radius:5px; font-weight:bold; font-size:12px;">${p.lojaNome || 'Avulso'}</span>
                <span class="valor-taxa" style="color:#2ecc71; font-weight:bold; font-size:18px;">${window.Utils.formatCurrency(p.taxaEntrega)}</span>
            </div>
            <div style="margin:12px 0; font-size:14px; color:#555;">
                <p style="margin:4px 0;"><i class="fas fa-store" style="color:var(--primary-red); width:20px;"></i> <b>Retirada:</b> ${p.bairroRetirada}</p>
                <p style="margin:4px 0;"><i class="fas fa-map-marker-alt" style="color:#3498db; width:20px;"></i> <b>Entrega:</b> ${p.bairro}</p>
            </div>
            <button class="btn btn-primary w-100" onclick="aceitarCorrida('${p.id}')" style="background:var(--primary-red); border:none; font-weight:bold;">
                ACEITAR CORRIDA
            </button>
        </div>
    `).join('');
}

window.aceitarCorrida = async (id) => {
    try {
