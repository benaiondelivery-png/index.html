// js/auth.js - Versão Firebase
const Auth = {
  storageKey: 'benaion_user',

  isAuthenticated() {
    return localStorage.getItem(this.storageKey) !== null;
  },

  getCurrentUser() {
    const userData = localStorage.getItem(this.storageKey);
    return userData ? JSON.parse(userData) : null;
  },

  setCurrentUser(user) {
    localStorage.setItem(this.storageKey, JSON.stringify(user));
  },

  logout() {
    localStorage.removeItem(this.storageKey);
    window.location.href = 'index.html';
  },

  async loginWithEmail(email, password) {
    try {
      // Procura o utilizador no banco de dados do Firebase
      const user = await API.getUserByEmail(email);
      
      if (!user) {
        throw new Error('Utilizador não encontrado');
      }

      if (user.password !== password) {
        throw new Error('Senha incorreta');
      }

      this.setCurrentUser(user);
      return user;
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  },

  async register(data) {
    try {
      const existingUser = await API.getUserByEmail(data.email);
      if (existingUser) {
        throw new Error('Este email já está registado');
      }

      // Guarda o novo utilizador no Firebase
      const newUser = await API.createUser(data);
      this.setCurrentUser(newUser);
      return newUser;
    } catch (error) {
      console.error('Erro no registo:', error);
      throw error;
    }
  },

  redirectToDashboard() {
    const user = this.getCurrentUser();
    if (!user) return;

    // Encaminha conforme o tipo de conta (ficheiros que aparecem no seu GitHub)
    const routes = {
      admin: 'admin.html',
      entregador: 'entregador.html',
      parceiro: 'parceiro.html',
      cliente: 'cliente.html'
    };

    window.location.href = routes[user.userType] || 'index.html';
  }
};

window.Auth = Auth;
