// ========================================
// BENAION DELIVERY - UTILITÁRIOS (V2.0)
// ========================================

const Utils = {
  // 1. NOTIFICAÇÕES (Toasts elegantes que combinam com seu design)
  showToast(message, type = 'info', duration = 3000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type} animate__animated animate__fadeInRight`;
    
    const icons = {
      success: 'fa-check-circle',
      error: 'fa-times-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
      <i class="fas ${icons[type] || icons.info}"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.replace('animate__fadeInRight', 'animate__fadeOutRight');
      setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
            if (container.children.length === 0) container.remove();
        }
      }, 500);
    }, duration);
  },

  // 2. MODAIS (Abertura suave)
  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.remove('hidden');
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
        modal.classList.add('hidden');
        document.body.style.overflow = '';
      }, 300);
    }
  },

  // 3. GOOGLE MAPS (Links corrigidos para GPS de Moto)
  openGoogleMaps(origin, destination) {
    const cleanOrigin = encodeURIComponent(origin + ", Laranjal do Jari, AP");
    const cleanDest = encodeURIComponent(destination + ", Laranjal do Jari, AP");
    const url = `https://www.google.com/maps/dir/?api=1&origin=${cleanOrigin}&destination=${cleanDest}&travelmode=motorcycle`;
    window.open(url, '_blank');
  },

  // 4. LÓGICA DE NEGÓCIO (Taxas e Bônus)
  formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  },

  calcularAdicionalTempo(dataInicio) {
    if (!dataInicio) return 0;
    // Converte segundos do Firebase para milissegundos se necessário
    const inicio = dataInicio.seconds ? new Date(dataInicio.seconds * 1000) : new Date(dataInicio);
    const agora = new Date();
    const diffMinutos = Math.floor((agora - inicio) / 60000);

    // Regra Benaion: Após 3 minutos, R$ 0,30 por minuto extra
    if (diffMinutos > 3) {
      return (diffMinutos - 3) * 0.30;
    }
    return 0;
  },

  // 5. STATUS E COMUNICAÇÃO
  getStatusText(status) {
    const statusMap = {
      'pendente': 'Aguardando Loja',
      'preparando': 'Loja Separando Itens',
      'pronto': 'Pronto para Coleta',
      'aguardando_entregador': 'Buscando Entregador',
      'aceito': 'Entregador a caminho',
      'em_entrega': 'Em Rota de Entrega',
      'finalizado': 'Entregue ✅',
      'cancelado': 'Cancelado ✕'
    };
    return statusMap[status] || status;
  },

  openWhatsApp(tel, mensagem) {
    if (!tel) return;
    const cleanTel = tel.replace(/\D/g, '');
    const url = `https://wa.me/55${cleanTel}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
  },

  vibrate(pattern = [200]) {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  }
};

// Exportação Global
window.Utils = Utils;

