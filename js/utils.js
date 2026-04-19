// ========================================
// BENAION DELIVERY - UTILITÁRIOS
// ========================================

const Utils = {
  // ========================================
  // TOAST NOTIFICATIONS
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
  // LOADING & STATES
  // ========================================

  showLoading(element, text = 'Carregando...') {
    element.innerHTML = `
      <div class="loading" style="text-align:center; padding: 20px;">
        <div class="spinner"></div>
        <p>${text}</p>
      </div>
    `;
  },

  showEmptyState(element, icon, title, text, buttonText = null, buttonAction = null) {
    element.innerHTML = `
      <div class="empty-state" style="text-align:center; padding: 40px 20px;">
        <div class="empty-icon" style="font-size: 48px; margin-bottom: 10px;">${icon}</div>
        <h3 class="empty-title" style="margin-bottom: 5px;">${title}</h3>
        <p class="empty-text" style="color: var(--gray); margin-bottom: 20px;">${text}</p>
        ${buttonText ? `<button class="btn btn-primary" onclick="${buttonAction}">${buttonText}</button>` : ''}
      </div>
    `;
  },

  // ========================================
  // FORMATAÇÃO
  // ========================================

  formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  },

  formatDateTime(timestamp) {
    if (!timestamp) return '--/--';
    const date = new Date(timestamp);
    return date.toLocaleString('pt-BR');
  },

  timeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes}m atrás`;
    if (hours < 24) return `${hours}h atrás`;
    return `${days}d atrás`;
  },

  // ========================================
  // STATUS MAPS
  // ========================================

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

  getStatusIcon(status) {
    const iconMap = {
      'recebido': '📋',
      'aguardando_entregador': '⏳',
      'aceito': '✅',
      'em_coleta': '🏪',
      'em_entrega': '🛵',
      'finalizado': '✓',
      'cancelado': '✕'
    };
    return iconMap[status] || '•';
  },

  // ========================================
  // MODAIS (Corrigido para usar Display Flex/None)
  // ========================================

  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'flex'; // Garante que o modal apareça
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
  // GOOGLE MAPS (Corrigido URLs)
  // ========================================

  openGoogleMaps(origin, destination) {
    // URL correta para navegação entre dois pontos
    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
    window.open(url, '_blank');
  },

  getAddressLink(address) {
    // URL correta para apenas localizar um endereço
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  },

  // ========================================
  // OUTROS
  // ========================================

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  },

  vibrate(pattern = [200]) {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  },

  playNotificationSound() {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(() => {});
  },

  async requestNotificationPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }
};

// Tornar global
window.Utils = Utils;
