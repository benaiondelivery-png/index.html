// ========================================
// BENAION DELIVERY - UTILITÁRIOS
// ========================================

const Utils = {
  // ========================================
  // TOAST NOTIFICATIONS (Alertas rápidos)
  // ========================================
  showToast(message, type = 'info', duration = 3000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ';
    
    toast.innerHTML = `
      <span style="font-size: 20px;">${icon}</span>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'toastSlideIn 0.3s ease-out reverse';
      setTimeout(() => {
        toast.remove();
        if (container.children.length === 0) container.remove();
      }, 300);
    }, duration);
  },

  // ========================================
  // MODAIS (Abertura e Fechamento)
  // ========================================
  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'flex'; 
      setTimeout(() => modal.classList.add('active'), 10);
      document.body.style.overflow = 'hidden';
    }
  },

  hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      setTimeout(() => {
        modal.style.display = 'none';
        document.body.style.overflow = '';
      }, 300);
    }
  },

  // ========================================
  // GOOGLE MAPS (CORRIGIDO)
  // ========================================
  openGoogleMaps(origin, destination) {
    // Corrigido para a URL oficial de navegação do Google Maps
    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=motorcycle`;
    window.open(url, '_blank');
  },

  getAddressLink(address) {
    // Corrigido para a URL oficial de busca de endereço
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  },

  // ========================================
  // FORMATAÇÃO E STATUS
  // ========================================
  formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  },

  getStatusText(status) {
    const statusMap = {
      'recebido': 'Recebido',
      'aguardando_entregador': 'Aguardando Entregador',
      'aceito': 'Aceito',
      'em_coleta': 'Buscando Pedido',
      'em_entrega': 'Em Rota de Entrega',
      'finalizado': 'Entregue ✅',
      'cancelado': 'Cancelado ✕'
    };
    return statusMap[status] || status;
  },

  vibrate(pattern = [200]) {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  }
};

// Tornar global para que o index.html consiga ler
window.Utils = Utils;
